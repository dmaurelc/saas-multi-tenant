import { Context, Next } from 'hono';
import { verifyToken, JwtPayload } from '../lib/jwt';
import db from '../lib/db';

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload & { id: string };
    userId: string;
    tenantId: string;
    role: string;
    permissions: string[] | null;
  }
}

/**
 * Authentication middleware
 * Validates JWT token and injects user context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
      401
    );
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  // Verify user still exists and is active
  const user = await db.user.findFirst({
    where: {
      id: payload.userId,
      tenantId: payload.tenantId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      permissions: true,
      tenantId: true,
    },
  });

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found or inactive' }, 401);
  }

  // Check if session is valid (not blacklisted)
  const session = await db.session.findFirst({
    where: {
      token,
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) {
    return c.json({ error: 'Unauthorized', message: 'Session expired or invalidated' }, 401);
  }

  // Set user context
  c.set('user', { ...payload, id: user.id });
  c.set('userId', user.id);
  c.set('tenantId', user.tenantId);
  c.set('role', user.role);
  c.set('permissions', user.permissions as string[] | null);

  await next();
}

/**
 * Optional authentication middleware
 * Sets user context if token is present, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      const user = await db.user.findFirst({
        where: {
          id: payload.userId,
          tenantId: payload.tenantId,
          isActive: true,
        },
      });

      if (user) {
        c.set('user', { ...payload, id: user.id });
        c.set('userId', user.id);
        c.set('tenantId', user.tenantId);
        c.set('role', user.role);
        c.set('permissions', user.permissions as string[] | null);
      }
    }
  }

  await next();
}

/**
 * Role-based authorization middleware
 * @deprecated Use requireRole from middleware/authorization.ts instead
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const role = c.get('role');

    if (!role || !allowedRoles.includes(role)) {
      return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403);
    }

    await next();
  };
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): (JwtPayload & { id: string }) | null {
  return c.get('user') ?? null;
}

/**
 * Get tenant ID from context
 */
export function getTenantId(c: Context): string | null {
  return c.get('tenantId') ?? null;
}
