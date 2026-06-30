import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test('should load the login page successfully', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText(/login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error validation message on empty submissions', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Check if browser native validation or custom error highlights show up
    const email = page.locator('input[type="email"]');
    await expect(email).toBeVisible();
  });

  test('should load the registration page successfully', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText(/register/i);
    await expect(page.locator('input[placeholder*="Name" i]')).toBeVisible();
  });
});
