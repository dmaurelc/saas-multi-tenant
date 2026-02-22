import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../src/index';

// Mock the database module
vi.mock('../src/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
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
  },
}));

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with tenant', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        tenantId: 'tenant-1',
      };

      const mockTenant = {
        id: 'tenant-1',
        name: 'Test Org',
        slug: 'test-org',
      };

      // Mock transaction response
      const { default: db } = await import('../src/lib/db');
      vi.mocked(db.$transaction).mockResolvedValue({
        user: mockUser,
        tenant: mockTenant,
      });
      vi.mocked(db.session.create).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      vi.mocked(db.user.findUnique).mockResolvedValue(null); // No existing user

      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPass123',
          name: 'Test User',
          tenantName: 'Test Org',
          tenantSlug: 'test-org',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe('Registration successful');
      expect(data.user).toBeDefined();
      expect(data.accessToken).toBeDefined();
    });

    it('should reject weak passwords', async () => {
      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak',
          tenantName: 'Test Org',
          tenantSlug: 'test-org',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const response = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'TestPass123',
          tenantName: 'Test Org',
          tenantSlug: 'test-org',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return error for invalid credentials', async () => {
      const { default: db } = await import('../src/lib/db');
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const response = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const response = await app.request('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 without token', async () => {
      const response = await app.request('/api/v1/auth/logout', {
        method: 'POST',
      });
      expect(response.status).toBe(401);
    });
  });
});
