/**
 * Authentication Tests with Synthetic Users
 *
 * Complete authentication flow tests using synthetic users.
 * Covers: registration, login, logout, token refresh, password change
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import app from '../src/index';
import { USERS, TENANTS, TEST_CREDENTIALS } from './helpers/synthetic-users';

// Type for Prisma Role enum
type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';

// Store for rate limit tracking (reset between tests)
let rateLimitStore: Record<string, number[]> = {};

// Mock the database module
vi.mock('../src/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

// Mock rate limiting to always allow
vi.mock('../src/middleware/rateLimit', () => ({
  authRateLimit: async (c: any, next: any) => await next(),
  apiRateLimit: async (c: any, next: any) => await next(),
  rateLimit: () => async (c: any, next: any) => await next(),
}));

// Mock JWT functions with proper implementation
vi.mock('../src/lib/jwt', () => {
  const validTokens = new Map<
    string,
    { userId: string; tenantId: string; role: string; email: string }
  >();

  return {
    generateTokenPair: vi.fn((payload) => {
      const token = `access_${payload.userId}_${payload.tenantId}_${payload.role}`;
      validTokens.set(token, payload);
      return {
        accessToken: token,
        refreshToken: `refresh_${payload.userId}_${payload.tenantId}`,
        expiresIn: 86400,
      };
    }),
    verifyToken: vi.fn((token) => {
      if (validTokens.has(token)) {
        return validTokens.get(token)!;
      }
      // Also accept tokens that start with 'valid_'
      if (token && token.startsWith('valid_')) {
        const parts = token.split('_');
        return {
          userId: parts[1] || 'user-1',
          tenantId: parts[2] || 'tenant-1',
          role: parts[3] || 'OWNER',
          email: 'test@example.com',
        };
      }
      return null;
    }),
    signToken: vi.fn((payload) => `access_${payload.userId}_${payload.tenantId}_${payload.role}`),
    signRefreshToken: vi.fn((payload) => `refresh_${payload.userId}_${payload.tenantId}`),
    // Helper to add valid tokens for testing
    _addValidToken: (token: string, payload: any) => validTokens.set(token, payload),
  };
});

// Mock password functions
vi.mock('../src/lib/password', () => ({
  hashPassword: vi.fn((password) => Promise.resolve(`hashed_${password}`)),
  verifyPassword: vi.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`)),
  validatePasswordStrength: vi.fn((password) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain number');
    return { valid: errors.length === 0, errors };
  }),
}));

describe('Auth API with Synthetic Users', () => {
  let db: typeof import('../src/lib/db').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    rateLimitStore = {};
    db = (await import('../src/lib/db')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new tenant owner successfully', async () => {
      const newUser = {
        email: 'newuser@test.com',
        password: 'TestPass123!',
        name: 'New Test User',
        tenantName: 'Test Company',
        tenantSlug: 'test-company',
      };

      const mockTenant = {
        id: 'tenant-new',
        name: newUser.tenantName,
        slug: newUser.tenantSlug,
        isActive: true,
        plan: 'FREE',
        logo: null,
        primaryColor: '#1a1a2e',
        secondaryColor: '#16213e',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-new',
        email: newUser.email,
        name: newUser.name,
        role: 'OWNER' as Role,
        tenantId: mockTenant.id,
        passwordHash: `hashed_${newUser.password}`,
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      vi.mocked(db.$transaction).mockResolvedValue({
        user: mockUser,
        tenant: mockTenant,
      });
      vi.mocked(db.session.create).mockResolvedValue({
        id: 'session-new',
        userId: mockUser.id,
        token: 'test-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe('Registration successful');
      expect(data.user.email).toBe(newUser.email);
      expect(data.user.role).toBe('OWNER');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const existingUser = USERS.ecommerce.owner()!;

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: 'OWNER' as Role,
        tenantId: existingUser.tenant_id,
        passwordHash: 'hashed',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
      });

      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: existingUser.email,
          password: 'TestPass123!',
          tenantName: 'Duplicate',
          tenantSlug: 'duplicate',
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Conflict');
    });

    it('should reject weak passwords', async () => {
      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'weak@test.com',
          password: 'weak',
          tenantName: 'Test',
          tenantSlug: 'test',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'TestPass123!',
          tenantName: 'Test',
          tenantSlug: 'test',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid tenant slug format', async () => {
      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'TestPass123!',
          tenantName: 'Test',
          tenantSlug: 'INVALID SLUG!',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login ecommerce owner successfully', async () => {
      const credentials = TEST_CREDENTIALS.ecommerce.owner;
      const user = USERS.ecommerce.owner()!;
      const tenant = TENANTS.ecommerce()!;

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'OWNER' as Role,
        tenantId: tenant.id,
        passwordHash: `hashed_${credentials.password}`,
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.branding.logo_url,
          primaryColor: tenant.branding.primary_color,
          secondaryColor: tenant.branding.secondary_color,
          isActive: true,
          plan: tenant.plan,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      vi.mocked(db.session.create).mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: 'test-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Login successful');
      expect(data.user.email).toBe(credentials.email);
      expect(data.user.tenantId).toBe(tenant.id);
      expect(data.accessToken).toBeDefined();
    });

    it('should login services owner successfully', async () => {
      const credentials = TEST_CREDENTIALS.services.owner;
      const user = USERS.services.owner()!;
      const tenant = TENANTS.services()!;

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'OWNER' as Role,
        tenantId: tenant.id,
        passwordHash: `hashed_${credentials.password}`,
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.branding.logo_url,
          primaryColor: tenant.branding.primary_color,
          secondaryColor: tenant.branding.secondary_color,
          isActive: true,
          plan: tenant.plan,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      vi.mocked(db.session.create).mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: 'test-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.tenantId).toBe(tenant.id);
    });

    it('should reject login with invalid credentials', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject login for disabled user', async () => {
      const user = USERS.ecommerce.staff()!;
      const tenant = TENANTS.ecommerce()!;

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'STAFF' as Role,
        tenantId: tenant.id,
        passwordHash: 'hashed_TestPass123!',
        isActive: false, // User is disabled
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: null,
          primaryColor: '#000',
          secondaryColor: '#fff',
          isActive: true,
          plan: 'BUSINESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: 'TestPass123!',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('disabled');
    });

    it('should reject login for disabled tenant', async () => {
      const user = USERS.ecommerce.customer()!;
      const tenant = TENANTS.ecommerce()!;

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'CUSTOMER' as Role,
        tenantId: tenant.id,
        passwordHash: 'hashed_TestPass123!',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: null,
          primaryColor: '#000',
          secondaryColor: '#fff',
          isActive: false, // Tenant is disabled
          plan: 'BUSINESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: 'TestPass123!',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('disabled');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const user = USERS.ecommerce.admin()!;
      const tenant = TENANTS.ecommerce()!;
      const validToken = `valid_${user.id}_${tenant.id}_ADMIN`;

      // Mock for auth middleware - user lookup
      vi.mocked(db.user.findFirst).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        isActive: true,
      });

      // Mock for auth middleware - session lookup
      vi.mocked(db.session.findFirst).mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: validToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      // Mock for /me endpoint
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        passwordHash: 'hashed',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.branding.logo_url,
          primaryColor: tenant.branding.primary_color,
          secondaryColor: tenant.branding.secondary_color,
          plan: tenant.plan,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const response = await app.request('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.email).toBe(user.email);
    });

    it('should return 401 without token', async () => {
      const response = await app.request('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const user = USERS.ecommerce.owner()!;
      const tenant = TENANTS.ecommerce()!;
      const validToken = `valid_${user.id}_${tenant.id}_OWNER`;

      // Mock for auth middleware - user lookup
      vi.mocked(db.user.findFirst).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'OWNER' as Role,
        tenantId: tenant.id,
        isActive: true,
      });

      // Mock for auth middleware - session lookup
      vi.mocked(db.session.findFirst).mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: validToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 1 });

      const response = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Logout successful');
    });

    it('should return 401 without token', async () => {
      const response = await app.request('/api/v1/auth/logout', {
        method: 'POST',
      });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = USERS.ecommerce.owner()!;
      const tenant = TENANTS.ecommerce()!;
      const refreshToken = `valid_${user.id}_${tenant.id}_OWNER`;

      vi.mocked(db.user.findFirst).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'OWNER' as Role,
        tenantId: tenant.id,
        passwordHash: 'hashed',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: null,
          primaryColor: '#000',
          secondaryColor: '#fff',
          isActive: true,
          plan: 'BUSINESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      vi.mocked(db.session.create).mockResolvedValue({
        id: 'session-new',
        userId: user.id,
        token: 'new-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'invalid_token',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const user = USERS.ecommerce.admin()!;
      const tenant = TENANTS.ecommerce()!;
      const validToken = `valid_${user.id}_${tenant.id}_ADMIN`;
      const currentPassword = 'TestPass123!';
      const newPassword = 'NewTestPass456!';

      // Mock for auth middleware - user lookup
      vi.mocked(db.user.findFirst).mockResolvedValueOnce({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        isActive: true,
      });

      // Mock for auth middleware - session lookup
      vi.mocked(db.session.findFirst).mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: validToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      // Mock for change-password endpoint - get current user
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        passwordHash: `hashed_${currentPassword}`,
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
      });

      vi.mocked(db.user.update).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        passwordHash: `hashed_${newPassword}`,
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
      });

      vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 0 });

      const response = await app.request('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Password changed successfully');
    });

    it('should reject if current password is wrong', async () => {
      const user = USERS.ecommerce.admin()!;
      const tenant = TENANTS.ecommerce()!;
      const validToken = `valid_${user.id}_${tenant.id}_ADMIN`;

      // Mock for auth middleware - user lookup
      vi.mocked(db.user.findFirst).mockResolvedValueOnce({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        isActive: true,
      });

      // Mock for auth middleware - session lookup
      vi.mocked(db.session.findFirst).mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: validToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      // Mock for change-password endpoint - get current user
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN' as Role,
        tenantId: tenant.id,
        passwordHash: 'hashed_correct_password',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
      });

      const response = await app.request('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          currentPassword: 'wrong_password',
          newPassword: 'NewTestPass456!',
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
