import {
  ApiError,
  createCompanionResult,
  validateDiaryText,
} from '../../backend/companion-service.js'

const rateBuckets = new Map()
const RATE_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 12

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
})

const getClientIp = (event) =>
  event.headers['x-nf-client-connection-ip'] ||
  event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  'unknown'

const isRateLimited = (event) => {
  const now = Date.now()
  const key = getClientIp(event)
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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      error: {
        message: '只支持 POST 请求。',
      },
    })
  }

  if (isRateLimited(event)) {
    return jsonResponse(429, {
      error: {
        message: '请求过于频繁，请一分钟后再试。',
      },
    })
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const diaryText = validateDiaryText(body.diary)
    const result = await createCompanionResult(diaryText)
    return jsonResponse(200, result)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message =
      error instanceof ApiError
        ? error.message
        : '服务器内部错误，请稍后重试。'

    if (status >= 500 && !(error instanceof ApiError)) {
      console.error('Unhandled Netlify function error:', error)
    }

    return jsonResponse(status, {
      error: {
        message,
      },
    })
  }
}
