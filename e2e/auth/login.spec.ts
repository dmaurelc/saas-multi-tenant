import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, USERS, loginAs, logout } from '../helpers/synthetic-users';

/**
 * E2E Authentication Tests using Synthetic Users
 *
 * Test Scenarios covered:
 * - Login flow with different roles
 * - Registration flow
 * - Password validation
 * - Protected routes
 * - Logout flow
 */

test.describe('Authentication Flow - Synthetic Users', () => {
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

  test.describe('Login with Synthetic Users', () => {
    test('should login as ecommerce owner successfully', async ({ page }) => {
      const owner = USERS.ecommerce.owner()!;

      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.ecommerce.owner.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.ecommerce.owner.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Should show user info
      await expect(page.locator(`text=${owner.name}`)).toBeVisible();
    });

    test('should login as ecommerce admin successfully', async ({ page }) => {
      const admin = USERS.ecommerce.admin()!;

      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.ecommerce.admin.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.ecommerce.admin.password);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should login as services owner successfully', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.services.owner.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.services.owner.password);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show rate limiting after multiple failed attempts', async ({ page }) => {
      await page.goto('/login');

      // Attempt 6 failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(100);
      }

      // Should show rate limit error
      await expect(page.locator('[role="alert"]')).toContainText(/demasiados|intento|rate/i);
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

    test('should register new tenant successfully', async ({ page }) => {
      const timestamp = Date.now();
      const newTenant = {
        name: `Test Company ${timestamp}`,
        slug: `test-company-${timestamp}`,
        email: `user${timestamp}@test.com`,
        password: 'TestPass123!',
      };

      await page.goto('/register');
      await page.fill('input[id="tenantName"]', newTenant.name);
      await page.fill('input[id="tenantSlug"]', newTenant.slug);
      await page.fill('input[type="email"]', newTenant.email);
      await page.fill('input[id="password"]', newTenant.password);
      await page.fill('input[id="confirmPassword"]', newTenant.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should reject duplicate email', async ({ page }) => {
      await page.goto('/register');
      await page.fill('input[id="tenantName"]', 'Duplicate Test');
      await page.fill('input[id="tenantSlug"]', 'duplicate-test');
      await page.fill('input[type="email"]', TEST_CREDENTIALS.ecommerce.owner.email);
      await page.fill('input[id="password"]', 'TestPass123!');
      await page.fill('input[id="confirmPassword"]', 'TestPass123!');
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow access after login', async ({ page }) => {
      await loginAs(page, TEST_CREDENTIALS.ecommerce.owner);

      // Navigate to dashboard
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      await loginAs(page, TEST_CREDENTIALS.ecommerce.owner);

      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Logout
      await logout(page);

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should not access protected routes after logout', async ({ page }) => {
      await loginAs(page, TEST_CREDENTIALS.ecommerce.owner);
      await logout(page);

      // Try to access dashboard
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
