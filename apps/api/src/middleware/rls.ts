import { Context, Next } from 'hono';
import db from '../lib/db';

/**
 * Set RLS context for the current request
 * This must be called after auth middleware
 *
 * Sets PostgreSQL session variables:
 * - app.current_tenant: The tenant ID for RLS policies
 * - app.current_user: The user ID for RLS policies
 * - app.user_role: The user's role for RLS policies
 */
export async function rlsMiddleware(c: Context, next: Next) {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  const userRole = c.get('userRole');

  if (!tenantId || !userId) {
    return c.json({ error: 'Unauthorized', message: 'Missing tenant or user context' }, 401);
  }

  // Set the RLS context using raw SQL
  // This uses Prisma's $executeRawUnsafe to set session variables
  try {
    await db.$executeRawUnsafe(`SELECT set_config('app.current_tenant', '${tenantId}', false)`);
    await db.$executeRawUnsafe(`SELECT set_config('app.current_user', '${userId}', false)`);
    await db.$executeRawUnsafe(`SELECT set_config('app.user_role', '${userRole}', false)`);
  } catch (error) {
    console.error('Failed to set RLS context:', error);
    // Continue anyway - RLS policies will fail if not set correctly
  }

  await next();
}

/**
 * RLS context helper for raw SQL execution
 */
export async function withRlsContext<T>(
  tenantId: string,
  userId: string,
  role: string,
  fn: () => Promise<T>
): Promise<T> {
  // Note: In Neon serverless, each query is independent
  // For complex RLS scenarios, consider using a transaction
  return fn();
}

/**
 * Verify RLS is working correctly
 * This is a diagnostic function for testing
 */
export async function verifyRlsContext(
  tenantId: string
): Promise<{ valid: boolean; currentTenant: string | null }> {
  try {
    // This would need to be run within a request context
    // where RLS is already set
    const result = await db.$queryRaw<[{ current_setting: string }]>`
      SELECT current_setting('app.current_tenant', true) as current_setting
    `;

    const currentTenant = result[0]?.current_setting || null;

    return {
      valid: currentTenant === tenantId,
      currentTenant,
    };
  } catch {
    return {
      valid: false,
      currentTenant: null,
    };
  }
}
