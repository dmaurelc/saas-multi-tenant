/**
 * Synthetic Users Helper for Testing
 *
 * Provides utilities for loading and using synthetic users in tests.
 * Based on /docs/users/synthetic_users.json
 */

import syntheticUsersData from '../../../../docs/users/synthetic_users.json';

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

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  vertical: string | null;
  is_platform_tenant?: boolean;
  domain: string | null;
  custom_domain: string | null;
  branding: {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  };
  settings: {
    features: string[];
    max_users: number;
    max_records: number;
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
 * Get a synthetic user by email
 */
export function getSyntheticUserByEmail(email: string): SyntheticUser | undefined {
  return syntheticUsersData.synthetic_users.find((u) => u.email === email) as
    | SyntheticUser
    | undefined;
}

/**
 * Get all users for a specific tenant
 */
export function getTenantUsers(tenantId: string): SyntheticUser[] {
  return syntheticUsersData.synthetic_users.filter(
    (u) => u.tenant_id === tenantId
  ) as SyntheticUser[];
}

/**
 * Get tenant by ID
 */
export function getTenant(tenantId: string): Tenant | undefined {
  return (syntheticUsersData.tenants as Tenant[]).find((t) => t.id === tenantId);
}

/**
 * Predefined user getters for common use cases
 */
export const USERS = {
  platformAdmin: () => getSyntheticUser('platform_admin'),
  tenantOwner: (tenant: string) => getSyntheticUser('owner', tenant),
  tenantAdmin: (tenant: string) => getSyntheticUser('admin', tenant),
  tenantStaff: (tenant: string) => getSyntheticUser('staff', tenant),
  customer: (tenant: string) => getSyntheticUser('customer', tenant),

  // E-commerce tenant users
  ecommerce: {
    owner: () => getSyntheticUser('owner', 'tenant_ecommerce'),
    admin: () => getSyntheticUser('admin', 'tenant_ecommerce'),
    staff: () => getSyntheticUser('staff', 'tenant_ecommerce'),
    customer: () => getSyntheticUser('customer', 'tenant_ecommerce'),
  },

  // Services tenant users
  services: {
    owner: () => getSyntheticUser('owner', 'tenant_services'),
    customer: () => getSyntheticUser('customer', 'tenant_services'),
  },
} as const;

/**
 * Predefined tenant getters
 */
export const TENANTS = {
  platform: () => getTenant('tenant_platform'),
  ecommerce: () => getTenant('tenant_ecommerce'),
  services: () => getTenant('tenant_services'),
} as const;

/**
 * Test scenarios from synthetic_users.json
 */
export const TEST_SCENARIOS = syntheticUsersData.test_scenarios;

/**
 * Create a mock auth token payload for testing
 */
export function createMockAuthPayload(user: SyntheticUser) {
  return {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role.toUpperCase(),
    email: user.email,
  };
}

/**
 * Default test credentials for quick access
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
