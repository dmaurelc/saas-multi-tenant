// Tenant CRUD Endpoints
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const tenants = new Hono();

// Validation schemas
const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  customDomain: z.string().min(1).max(255).optional(),
  plan: z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// GET /api/v1/tenants - List tenants (paginated)
// ============================================
tenants.get('/', authMiddleware, requirePermission('tenants.read'), async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get tenants with user count
    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true },
          },
        },
      }),
      db.tenant.count({ where }),
    ]);

    return c.json({
      data: tenants.map((t) => ({
        ...t,
        userCount: t._count.users,
      })),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return c.json({ error: 'Failed to fetch tenants' }, 500);
  }
});

// ============================================
// GET /api/v1/tenants/:id - Get tenant by ID
// ============================================
tenants.get('/:id', authMiddleware, requirePermission('tenants.read'), async (c) => {
  try {
    const id = c.req.param('id');

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    return c.json({
      data: {
        ...tenant,
        userCount: tenant._count.users,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return c.json({ error: 'Failed to fetch tenant' }, 500);
  }
});

// ============================================
// GET /api/v1/tenants/slug/:slug - Get tenant by slug
// ============================================
tenants.get('/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');

    const tenant = await db.tenant.findUnique({
      where: { slug },
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

    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    if (!tenant.isActive) {
      return c.json({ error: 'Tenant is inactive' }, 403);
    }

    return c.json({ data: tenant });
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    return c.json({ error: 'Failed to fetch tenant' }, 500);
  }
});

// ============================================
// PATCH /api/v1/tenants/:id - Update tenant
// ============================================
tenants.patch('/:id', authMiddleware, requirePermission('tenants.update'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = updateTenantSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.errors }, 400);
    }

    // Check if tenant exists
    const existing = await db.tenant.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Check custom domain uniqueness if being updated
    if (result.data.customDomain && result.data.customDomain !== existing.customDomain) {
      const domainExists = await db.tenant.findUnique({
        where: { customDomain: result.data.customDomain },
      });

      if (domainExists) {
        return c.json({ error: 'Custom domain already in use' }, 400);
      }
    }

    // Update tenant
    const tenant = await db.tenant.update({
      where: { id },
      data: result.data,
    });

    return c.json({
      message: 'Tenant updated successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return c.json({ error: 'Failed to update tenant' }, 500);
  }
});

// ============================================
// DELETE /api/v1/tenants/:id - Soft delete tenant (set isActive = false)
// ============================================
tenants.delete('/:id', authMiddleware, requirePermission('tenants.update'), async (c) => {
  try {
    const id = c.req.param('id');

    // Check if tenant exists
    const existing = await db.tenant.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Soft delete (set isActive = false)
    await db.tenant.update({
      where: { id },
      data: { isActive: false },
    });

    return c.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return c.json({ error: 'Failed to delete tenant' }, 500);
  }
});

export default tenants;
