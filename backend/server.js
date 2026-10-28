import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import {
  ApiError,
  createCompanionResult,
  getApiKeyStatus,
  validateDiaryText,
} from './companion-service.js'

dotenv.config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
  quiet: true,
})

const app = express()
const PORT = Number(process.env.PORT) || 3000

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'emotion-companion-backend',
    hasApiKey: getApiKeyStatus(),
  })
})

app.post('/api/companion', async (req, res, next) => {
  try {
    const diaryText = validateDiaryText(req.body?.diary)
    const result = await createCompanionResult(diaryText)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

app.use((req, res) => {
  res.status(404).json({
    error: {
      message: '接口不存在。',
    },
  })
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  const status = error instanceof ApiError ? error.status : 500
  const message =
    error instanceof ApiError ? error.message : '服务器内部错误，请稍后重试。'

  if (status >= 500 && !(error instanceof ApiError)) {
    console.error('Unhandled server error:', error)
  }

  res.status(status).json({
    error: {
      message,
    },
  })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend is running at http://localhost:${PORT}`)

  if (!getApiKeyStatus()) {
    console.warn(
      'DEEPSEEK_API_KEY is missing. Copy backend/.env.example to backend/.env and fill it in.',
    )
  }
})
