import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import db from '../lib/db';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password';
import { generateTokenPair, verifyToken } from '../lib/jwt';
import { logAudit, AuditActions } from '../lib/audit';
import { authMiddleware } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const app = new Hono();

// ============================================
// Validation Schemas
// ============================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  tenantSlug: z
    .string()
    .min(3, 'Tenant slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Tenant slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  tenantName: z.string().min(1, 'Tenant name is required').max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ============================================
// Routes
// ============================================

/**
 * POST /api/v1/auth/register
 * Register a new user and optionally create a new tenant
 */
app.post('/register', authRateLimit, zValidator('json', registerSchema), async (c) => {
  const { email, password, name, tenantSlug, tenantName } = c.req.valid('json');

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return c.json({ error: 'Validation Error', details: passwordValidation.errors }, 400);
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return c.json({ error: 'Conflict', message: 'An account with this email already exists' }, 409);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create tenant and user in a transaction
  const result = await db.$transaction(async (tx) => {
    let tenant;

    if (tenantSlug && tenantName) {
      // Create new tenant
      tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
        },
      });
    } else {
      // For now, require tenant creation with registration
      // In the future, this could allow joining existing tenants
      throw new Error('Tenant creation required for registration');
    }

    // Create user as OWNER (first user of the tenant)
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        tenantId: tenant.id,
        role: 'OWNER',
        emailVerified: new Date(), // Auto-verify for MVP
      },
    });

    return { tenant, user };
  });

  // Generate tokens
  const tokens = generateTokenPair({
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
    email: result.user.email,
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.session.create({
    data: {
      userId: result.user.id,
      token: tokens.accessToken,
      expiresAt,
    },
  });

  // Audit log
  await logAudit({
    tenantId: result.tenant.id,
    userId: result.user.id,
    action: AuditActions.USER_REGISTERED,
    entity: 'user',
    entityId: result.user.id,
    metadata: { email: result.user.email },
  });

  return c.json(
    {
      message: 'Registration successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.tenant.id,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
      },
      ...tokens,
    },
    201
  );
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens
 */
app.post('/login', authRateLimit, zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Find user
  const user = await db.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user || !user.passwordHash) {
    return c.json({ error: 'Unauthorized', message: 'Invalid email or password' }, 401);
  }

  // Check if user is active
  if (!user.isActive) {
    return c.json({ error: 'Unauthorized', message: 'Account is disabled' }, 401);
  }

  // Check if tenant is active
  if (!user.tenant.isActive) {
    return c.json({ error: 'Unauthorized', message: 'Tenant account is disabled' }, 401);
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return c.json({ error: 'Unauthorized', message: 'Invalid email or password' }, 401);
  }

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.session.create({
    data: {
      userId: user.id,
      token: tokens.accessToken,
      expiresAt,
    },
  });

  // Audit log
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: AuditActions.USER_LOGIN,
    entity: 'user',
    entityId: user.id,
  });

  return c.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        logo: user.tenant.logo,
        primaryColor: user.tenant.primaryColor,
        secondaryColor: user.tenant.secondaryColor,
      },
    },
    ...tokens,
  });
});

/**
 * POST /api/v1/auth/logout
 * Invalidate current session
 */
app.post('/logout', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const tenantId = c.get('tenantId');
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.substring(7);

  // Delete session
  if (token) {
    await db.session.deleteMany({
      where: { token },
    });
  }

  // Audit log
  await logAudit({
    tenantId,
    userId,
    action: AuditActions.USER_LOGOUT,
    entity: 'user',
    entityId: userId,
  });

  return c.json({ message: 'Logout successful' });
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
app.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');

  // Verify refresh token
  const payload = verifyToken(refreshToken);

  if (!payload) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired refresh token' }, 401);
  }

  // Verify user still exists and is active
  const user = await db.user.findFirst({
    where: {
      id: payload.userId,
      tenantId: payload.tenantId,
      isActive: true,
    },
    include: { tenant: true },
  });

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found or inactive' }, 401);
  }

  // Generate new tokens
  const tokens = generateTokenPair({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  // Create new session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.session.create({
    data: {
      userId: user.id,
      token: tokens.accessToken,
      expiresAt,
    },
  });

  return c.json({
    message: 'Token refreshed',
    ...tokens,
  });
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
app.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
          secondaryColor: true,
          plan: true,
        },
      },
    },
  });

  if (!user) {
    return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      tenant: user.tenant,
    },
  });
});

/**
 * POST /api/v1/auth/change-password
 * Change user's password
 */
app.post(
  '/change-password',
  authMiddleware,
  zValidator('json', changePasswordSchema),
  async (c) => {
    const userId = c.get('userId');
    const tenantId = c.get('tenantId');
    const { currentPassword, newPassword } = c.req.valid('json');

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return c.json({ error: 'Validation Error', details: passwordValidation.errors }, 400);
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      return c.json({ error: 'Not Found', message: 'User not found' }, 404);
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return c.json({ error: 'Unauthorized', message: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions except current
    const authHeader = c.req.header('Authorization');
    const currentToken = authHeader?.substring(7);

    await db.session.deleteMany({
      where: {
        userId,
        NOT: { token: currentToken },
      },
    });

    // Audit log
    await logAudit({
      tenantId,
      userId,
      action: 'user.password_changed',
      entity: 'user',
      entityId: userId,
    });

    return c.json({ message: 'Password changed successfully' });
  }
);

/**
 * POST /api/v1/auth/logout-all
 * Logout from all devices
 */
app.post('/logout-all', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const tenantId = c.get('tenantId');

  // Delete all sessions for this user
  await db.session.deleteMany({
    where: { userId },
  });

  // Audit log
  await logAudit({
    tenantId,
    userId,
    action: 'user.logout_all',
    entity: 'user',
    entityId: userId,
  });

  return c.json({ message: 'Logged out from all devices' });
});

export default app;
