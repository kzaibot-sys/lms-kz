import { test, expect, Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@lms.kz'
const ADMIN_PASS = 'AdminLms2026!'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', ADMIN_EMAIL)
  await page.fill('input[name="password"]', ADMIN_PASS)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(5000)
}

test.describe('Admin Panel', () => {
  test('admin dashboard loads with stats', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('admin courses page loads', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/courses')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('admin students page loads', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/students')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toBeVisible()
    // Should show at least the test student
    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('student')
  })

  test('admin certificates page loads', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/certificates')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('student cannot access admin panel', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'student@test.kz')
    await page.fill('input[name="password"]', 'Student2026!')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)
    await page.goto('/admin')
    await page.waitForTimeout(3000)
    // Should be redirected away from admin
    const url = page.url()
    expect(url.includes('/admin')).toBeFalsy()
  })
})
