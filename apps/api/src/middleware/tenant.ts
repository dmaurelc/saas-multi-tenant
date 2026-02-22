// Tenant Resolution Middleware
// Detects tenant from: subdomain, custom domain, or X-Tenant-ID header
import { Context, Next } from 'hono';
import { db } from '../lib/db';

// Tenant cache with TTL of 5 minutes
const tenantCache = new Map<string, { tenant: ResolvedTenant; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ResolvedTenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  customDomain: string | null;
  plan: string;
  isActive: boolean;
}

declare module 'hono' {
  interface ContextVariableMap {
    tenant: ResolvedTenant;
  }
}

/**
 * Extract tenant from subdomain
 * Examples:
 * - tenant.saas.com -> slug: "tenant"
 * - custom-domain.com -> customDomain: "custom-domain.com"
 */
function extractTenantFromHost(host: string): { slug?: string; customDomain?: string } {
  if (!host) return {};

  // Remove port if present
  const hostname = host.split(':')[0];

  // Get base domain (assuming .saas.com format)
  const parts = hostname.split('.');

  // Check for custom domain (single domain or www.domain)
  if (parts.length === 1 || (parts.length === 2 && parts[0] === 'www')) {
    const domain = parts.length === 1 ? parts[0] : parts[1];
    return { customDomain: domain };
  }

  // Check for subdomain format (tenant.saas.com)
  if (parts.length >= 2) {
    const slug = parts[0];
    const baseDomain = parts.slice(1).join('.');

    // Only treat as subdomain if base domain matches our domain
    if (baseDomain === 'saas.com' || baseDomain.includes('localhost')) {
      return { slug };
    }
  }

  return {};
}

/**
 * Resolve tenant from cache or database
 */
async function resolveTenant(slug?: string, customDomain?: string): Promise<ResolvedTenant | null> {
  const cacheKey = slug ? `slug:${slug}` : customDomain ? `domain:${customDomain}` : '';

  // Check cache first
  if (cacheKey) {
    const cached = tenantCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tenant;
    }
  }

  // Query database
  const where = slug ? { slug } : customDomain ? { customDomain } : {};
  if (!slug && !customDomain) return null;

  const tenant = await db.tenant.findFirst({
    where: {
      ...where,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      primaryColor: true,
      secondaryColor: true,
      customDomain: true,
      plan: true,
      isActive: true,
    },
  });

  if (!tenant) return null;

  // Cache result
  if (cacheKey) {
    tenantCache.set(cacheKey, {
      tenant,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  return tenant;
}

/**
 * Clear tenant from cache (useful after updates)
 */
export function clearTenantCache(slug?: string, customDomain?: string): void {
  if (slug) {
    tenantCache.delete(`slug:${slug}`);
  }
  if (customDomain) {
    tenantCache.delete(`domain:${customDomain}`);
  }
}

/**
 * Tenant resolution middleware
 *
 * Priority order:
 * 1. X-Tenant-ID header (for testing/debugging)
 * 2. Custom domain from host
 * 3. Subdomain from host
 */
export async function tenantResolver(c: Context, next: Next) {
  let tenant: ResolvedTenant | null = null;

  // 1. Check X-Tenant-ID header (for testing/debugging)
  const tenantIdHeader = c.req.header('X-Tenant-ID');
  if (tenantIdHeader) {
    const dbTenant = await db.tenant.findUnique({
      where: { id: tenantIdHeader, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        customDomain: true,
        plan: true,
        isActive: true,
      },
    });
    if (dbTenant) {
      tenant = dbTenant;
    }
  }

  // 2. If not found by header, try host-based resolution
  if (!tenant) {
    const host = c.req.header('host') || '';
    const { slug, customDomain } = extractTenantFromHost(host);

    tenant = await resolveTenant(slug, customDomain);
  }

  if (!tenant) {
    // Tenant not found - continue without tenant context
    // Individual routes will handle authorization
    return next();
  }

  // Set tenant in context
  c.set('tenant', tenant);

  // Set Prisma tenant context for RLS
  // @ts-expect-error - Prisma extension
  await db.$setTenantId(tenant.id);

  await next();
}

/**
 * Require tenant middleware
 * Returns 404 if no tenant is resolved
 */
export async function requireTenant(c: Context, next: Next) {
  const tenant = c.get('tenant');

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  await next();
}
