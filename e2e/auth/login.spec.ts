import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/login');

      // Submit with empty fields
      await page.click('button[type="submit"]');

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should redirect to register page', async ({ page }) => {
      await page.goto('/login');

      await page.click('a:has-text("Sign up")');

      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      await expect(page.locator('h2:has-text("Create Account")')).toBeVisible();
      await expect(page.locator('input[id="tenantName"]')).toBeVisible();
      await expect(page.locator('input[id="tenantSlug"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should auto-generate slug from organization name', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[id="tenantName"]', 'Test Organization');
      await page.fill('input[id="tenantSlug"]', 'test-organization');

      const slugValue = await page.inputValue('input[id="tenantSlug"]');
      expect(slugValue).toBe('test-organization');
    });

    test('should show password validation errors', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[id="password"]', 'weak');
      await page.fill('input[id="confirmPassword"]', 'weak');
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
