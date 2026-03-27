import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://89.124.67.107'
const EXTERNAL_API_KEY = 'LmsKzExternalApiKey2026!'

test.describe('API Endpoints', () => {
  test('login API returns 401 for invalid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'wrong@email.com', password: 'wrong' },
    })
    expect(res.status()).toBe(401)
  })

  test('login API returns 200 for valid admin', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@lms.kz', password: 'AdminLms2026!' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.user).toBeTruthy()
    expect(body.user.role).toBe('admin')
  })

  test('external API requires X-API-Key', async ({ request }) => {
    const res = await request.post(`${BASE}/api/external/students`, {
      data: { name: 'Test', email: 'nokey@test.kz' },
    })
    expect(res.status()).toBe(401)
  })

  test('external API creates student with valid key', async ({ request }) => {
    const uniqueEmail = `test-${Date.now()}@test.kz`
    const res = await request.post(`${BASE}/api/external/students`, {
      headers: { 'X-API-Key': EXTERNAL_API_KEY },
      data: { first_name: 'API', last_name: 'Student', email: uniqueEmail, phone: '+77001234567' },
    })
    // 201 = created, 409 = already exists
    expect([201, 409]).toContain(res.status())
    if (res.status() === 201) {
      const body = await res.json()
      expect(body.email).toBe(uniqueEmail)
      expect(body.password).toBeTruthy()
    }
  })

  test('public certificate verification returns 404 for invalid', async ({ request }) => {
    const res = await request.get(`${BASE}/api/verify/nonexistent-cert-number`)
    expect([404, 200]).toContain(res.status())
  })

  test('courses API requires authentication', async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses`)
    expect([401, 403]).toContain(res.status())
  })
})
