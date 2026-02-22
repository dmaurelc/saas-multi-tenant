/**
 * E2E Synthetic Users Helper
 *
 * Provides utilities for using synthetic users in Playwright E2E tests.
 */

import syntheticUsersData from '../../docs/users/synthetic_users.json';

export type SyntheticUserRole = 'platform_admin' | 'owner' | 'admin' | 'staff' | 'customer';

export interface SyntheticUser {
  id: string;
  email: string;
  name: string;
  role: SyntheticUserRole;
  tenant_id: string;
  password: string;
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      in_app: boolean;
    };
  };
}

/**
 * Get a synthetic user by role and optionally by tenant
 */
export function getSyntheticUser(
  role: SyntheticUserRole,
  tenantId?: string
): SyntheticUser | undefined {
  return syntheticUsersData.synthetic_users.find(
    (u) => u.role === role && (!tenantId || u.tenant_id === tenantId)
  ) as SyntheticUser | undefined;
}

/**
 * Predefined user getters
 */
export const USERS = {
  ecommerce: {
    owner: () => getSyntheticUser('owner', 'tenant_ecommerce'),
    admin: () => getSyntheticUser('admin', 'tenant_ecommerce'),
    staff: () => getSyntheticUser('staff', 'tenant_ecommerce'),
    customer: () => getSyntheticUser('customer', 'tenant_ecommerce'),
  },
  services: {
    owner: () => getSyntheticUser('owner', 'tenant_services'),
    customer: () => getSyntheticUser('customer', 'tenant_services'),
  },
} as const;

/**
 * Test credentials for quick login
 */
export const TEST_CREDENTIALS = {
  ecommerce: {
    owner: {
      email: 'owner@techstore.cl',
      password: 'TestPass123!',
    },
    admin: {
      email: 'admin@techstore.cl',
      password: 'TestPass123!',
    },
    staff: {
      email: 'staff@techstore.cl',
      password: 'TestPass123!',
    },
    customer: {
      email: 'customer@example.com',
      password: 'TestPass123!',
    },
  },
  services: {
    owner: {
      email: 'owner@consultoria.cl',
      password: 'TestPass123!',
    },
    customer: {
      email: 'client2@example.com',
      password: 'TestPass123!',
    },
  },
} as const;

/**
 * Login helper for E2E tests
 */
export async function loginAs(
  page: import('@playwright/test').Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Logout helper for E2E tests
 */
export async function logout(page: import('@playwright/test').Page): Promise<void> {
  // Click user menu if it exists
  const userMenu = page.locator('[data-testid="user-menu"]');
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
  } else {
    // Direct navigation to logout
    await page.goto('/login');
  }
}

/**
 * Get auth token from API for API testing
 */
export async function getAuthToken(
  request: import('@playwright/test').APIRequestContext,
  credentials: { email: string; password: string }
): Promise<string | null> {
  const response = await request.post('/api/v1/auth/login', {
    data: credentials,
  });

  if (response.ok()) {
    const data = await response.json();
    return data.accessToken;
  }

  return null;
}
