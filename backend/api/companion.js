import {
  ApiError,
  createCompanionResult,
  validateDiaryText,
} from '../companion-service.js'

const rateBuckets = new Map()
const RATE_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 12

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin
  const allowedOrigins = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  return (
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : '') ||
    req.socket?.remoteAddress ||
    'unknown'
  ).trim()
}

const isRateLimited = (req) => {
  const now = Date.now()
  const key = getClientIp(req)
  const bucket = rateBuckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_WINDOW_MS,
    })
    return false
  }

  bucket.count += 1
  return bucket.count > MAX_REQUESTS_PER_WINDOW
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        message: '只支持 POST 请求。',
      },
    })
    return
  }

  if (isRateLimited(req)) {
    res.status(429).json({
      error: {
        message: '请求过于频繁，请一分钟后再试。',
      },
    })
    return
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const diaryText = validateDiaryText(body.diary)
    const result = await createCompanionResult(diaryText)
    res.status(200).json(result)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message =
      error instanceof ApiError
        ? error.message
        : '服务器内部错误，请稍后重试。'

    if (status >= 500 && !(error instanceof ApiError)) {
      console.error('Unhandled serverless error:', error)
    }

    res.status(status).json({
      error: {
        message,
      },
    })
  }
}
