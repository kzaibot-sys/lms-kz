import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@lms.kz'
const ADMIN_PASS = 'AdminLms2026!'
const STUDENT_EMAIL = 'student@test.kz'
const STUDENT_PASS = 'Student2026!'

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/LMS/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@email.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    // Should still be on login page or show error
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('admin can login and see admin dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', ADMIN_EMAIL)
    await page.fill('input[name="password"]', ADMIN_PASS)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)
    // Admin should be redirected to /admin
    await expect(page.url()).toContain('/admin')
  })

  test('student can login and see courses', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', STUDENT_EMAIL)
    await page.fill('input[name="password"]', STUDENT_PASS)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)
    // Student should be redirected to /courses
    await expect(page.url()).toContain('/courses')
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/courses')
    await page.waitForTimeout(3000)
    await expect(page.url()).toContain('/login')
  })

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })
})
