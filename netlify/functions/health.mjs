import { getApiKeyStatus } from '../../backend/companion-service.js'

export const handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify({
    ok: true,
    service: 'emotion-companion-backend',
    hasApiKey: getApiKeyStatus(),
  }),
})
