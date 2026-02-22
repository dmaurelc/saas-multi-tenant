// Authorization Middleware
import { Context, Next } from 'hono';
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission } from '../lib/permissions';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    tenantId: string;
    role: string;
    permissions: string[] | null;
  }
}

/**
 * Middleware to check if user has a specific permission
 */
export function requirePermission(permission: Permission) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('role');
    const userPermissions = c.get('permissions');

    if (!hasPermission(userRole, userPermissions, permission)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `You do not have permission to perform this action`,
          requiredPermission: permission,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to check if user has ANY of the specified permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('role');
    const userPermissions = c.get('permissions');

    if (!hasAnyPermission(userRole, userPermissions, permissions)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `You do not have permission to perform this action`,
          requiredPermissions: permissions,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to check if user has ALL of the specified permissions
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('role');
    const userPermissions = c.get('permissions');

    if (!hasAllPermissions(userRole, userPermissions, permissions)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `You do not have permission to perform this action`,
          requiredPermissions: permissions,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to check if user has a specific role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('role');

    if (!allowedRoles.includes(userRole)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware to ensure only OWNER can access subscription/billing
 */
export function requireOwner() {
  return requireRole('OWNER');
}

/**
 * Middleware to ensure user is OWNER or ADMIN
 */
export function requireAdmin() {
  return requireRole('OWNER', 'ADMIN');
}

/**
 * Middleware to filter query results based on ownership
 * This works with Prisma queries to add WHERE clauses
 */
export function filterByOwnership(c: Context) {
  const userId = c.get('userId');
  const tenantId = c.get('tenantId');
  const role = c.get('role');

  // OWNER and ADMIN can see all tenant resources
  if (role === 'OWNER' || role === 'ADMIN') {
    return { tenantId };
  }

  // STAFF can only see their own resources
  if (role === 'STAFF') {
    return { tenantId, userId };
  }

  // CUSTOMER can only see their own resources
  return { tenantId, userId };
}
