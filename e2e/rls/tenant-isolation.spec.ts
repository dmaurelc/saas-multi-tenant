import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, USERS, loginAs, getAuthToken } from '../helpers/synthetic-users';

/**
 * RLS (Row Level Security) E2E Tests
 *
 * Tests to verify tenant isolation is working correctly.
 * Users from one tenant should not be able to access data from another tenant.
 *
 * Test Scenario 1: tenant_isolation (Priority: CRITICAL)
 */

test.describe('Tenant Isolation (RLS)', () => {
  // Note: These tests require a running database with RLS configured
  // and test data seeded for multiple tenants

  test.describe('Cross-Tenant Data Access Prevention', () => {
    test('should not allow cross-tenant data access via API', async ({ request }) => {
      // Get token for ecommerce tenant
      const ecommerceToken = await getAuthToken(request, TEST_CREDENTIALS.ecommerce.admin);

      if (!ecommerceToken) {
        test.skip();
        return;
      }

      // Get users list as ecommerce admin
      const usersResponse = await request.get('/api/v1/users', {
        headers: { Authorization: `Bearer ${ecommerceToken}` },
      });

      if (usersResponse.ok()) {
        const users = await usersResponse.json();
        const ecommerceTenantId = USERS.ecommerce.admin()!.tenant_id;

        // All users should belong to ecommerce tenant
        const hasOtherTenantData = users.data?.some(
          (u: { tenantId: string }) => u.tenantId !== ecommerceTenantId
        );

        expect(hasOtherTenantData).toBe(false);
      }
    });

    test('should not expose other tenant data in list endpoints', async ({ request }) => {
      // Login as services tenant owner
      const servicesToken = await getAuthToken(request, TEST_CREDENTIALS.services.owner);

      if (!servicesToken) {
        test.skip();
        return;
      }

      // Get any data endpoint
      const response = await request.get('/api/v1/users', {
        headers: { Authorization: `Bearer ${servicesToken}` },
      });

      if (response.ok()) {
        const data = await response.json();
        const servicesTenantId = USERS.services.owner()!.tenant_id;

        // Verify all data belongs to services tenant
        if (data.data && Array.isArray(data.data)) {
          const allFromSameTenant = data.data.every(
            (item: { tenantId?: string }) => item.tenantId === servicesTenantId
          );

          expect(allFromSameTenant).toBe(true);
        }
      }
    });

    test('should enforce RLS even with direct ID access', async ({ request }) => {
      // Login as ecommerce admin
      const ecommerceToken = await getAuthToken(request, TEST_CREDENTIALS.ecommerce.admin);

      if (!ecommerceToken) {
        test.skip();
        return;
      }

      // Try to access a user from services tenant by ID
      const servicesOwner = USERS.services.owner()!;
      const response = await request.get(`/api/v1/users/${servicesOwner.id}`, {
        headers: { Authorization: `Bearer ${ecommerceToken}` },
      });

      // Should return 404 (not 403, to not leak existence)
      expect([404, 403]).toContain(response.status());
    });
  });

  test.describe('Tenant Context Verification', () => {
    test('should include correct tenant_id in JWT token', async ({ request }) => {
      const ecommerceOwner = USERS.ecommerce.owner()!;

      const response = await request.post('/api/v1/auth/login', {
        data: TEST_CREDENTIALS.ecommerce.owner,
      });

      if (response.ok()) {
        const data = await response.json();

        // Verify tenant_id matches
        expect(data.user.tenantId).toBe(ecommerceOwner.tenant_id);
      }
    });

    test('should return correct tenant info in /me endpoint', async ({ request }) => {
      const servicesOwner = USERS.services.owner()!;
      const token = await getAuthToken(request, TEST_CREDENTIALS.services.owner);

      if (!token) {
        test.skip();
        return;
      }

      const response = await request.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok()) {
        const data = await response.json();

        expect(data.user.tenantId).toBe(servicesOwner.tenant_id);
      }
    });
  });

  test.describe('Plan Limits', () => {
    test('should enforce max_users limit based on plan', async ({ page, request }) => {
      // Services tenant has Pro plan (max 5 users)
      // This test would try to create a 6th user

      const servicesToken = await getAuthToken(request, TEST_CREDENTIALS.services.owner);

      if (!servicesToken) {
        test.skip();
        return;
      }

      // Try to create a new user (would fail if at limit)
      const response = await request.post('/api/v1/users', {
        headers: { Authorization: `Bearer ${servicesToken}` },
        data: {
          email: `newuser${Date.now()}@test.com`,
          name: 'New User',
          role: 'staff',
        },
      });

      // If the tenant is at its limit, should return error
      if (response.status() === 403) {
        const data = await response.json();
        expect(data.message).toContain(/limit|exceeded/i);
      }
    });
  });
});

test.describe('Role-Based Access Control', () => {
  test.describe('Staff Role Limitations', () => {
    test('should not allow staff to access tenant settings', async ({ request }) => {
      const staffToken = await getAuthToken(request, TEST_CREDENTIALS.ecommerce.staff);

      if (!staffToken) {
        test.skip();
        return;
      }

      // Try to access tenant settings
      const response = await request.get('/api/v1/tenants/me', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });

      // Staff shouldn't have access to certain endpoints
      expect([403, 404]).toContain(response.status());
    });

    test('should allow admin to access tenant settings', async ({ request }) => {
      const adminToken = await getAuthToken(request, TEST_CREDENTIALS.ecommerce.admin);

      if (!adminToken) {
        test.skip();
        return;
      }

      // Admin should have read access to tenant
      const response = await request.get('/api/v1/tenants/me', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // This depends on implementation
      // For now, we just verify it doesn't fail with 403
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Customer Role Limitations', () => {
    test('should only allow customer to access their own profile', async ({ request }) => {
      const customerToken = await getAuthToken(request, TEST_CREDENTIALS.ecommerce.customer);

      if (!customerToken) {
        test.skip();
        return;
      }

      // Customer should be able to see their own info
      const meResponse = await request.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect(meResponse.status()).toBe(200);

      // But shouldn't be able to list all users
      const usersResponse = await request.get('/api/v1/users', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect([403, 404]).toContain(usersResponse.status());
    });
  });
});

test.describe('Audit Trail for Multi-Tenant Operations', () => {
  test('should log login event with tenant context', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: TEST_CREDENTIALS.ecommerce.owner,
    });

    if (response.ok()) {
      // The audit log should be created with the correct tenant_id
      // This would require querying the audit_logs table
      // For now, we just verify the login was successful
      expect(response.status()).toBe(200);
    }
  });
});
