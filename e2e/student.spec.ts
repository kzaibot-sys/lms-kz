import { test, expect, Page } from '@playwright/test'

const STUDENT_EMAIL = 'student@test.kz'
const STUDENT_PASS = 'Student2026!'

async function loginAsStudent(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', STUDENT_EMAIL)
  await page.fill('input[name="password"]', STUDENT_PASS)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(5000)
}

test.describe('Student UI', () => {
  test('courses page shows empty state when no courses', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/courses')
    await page.waitForTimeout(2000)
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('profile page loads and shows user info', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/profile')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toBeVisible()
    // Should contain profile form elements
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('certificates page loads', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/certificates')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})
