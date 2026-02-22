// User CRUD Endpoints
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { hashPassword, validatePasswordStrength } from '../lib/password';
import { logAudit, AuditActions } from '../lib/audit';
import { Role } from '@shared';

const users = new Hono();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER']).default('STAFF'),
  permissions: z.record(z.boolean()).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER']).optional(),
  permissions: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER']),
});

// ============================================
// GET /api/v1/users - List users (paginated, tenant-scoped)
// ============================================
users.get('/', authMiddleware, requirePermission('users.read'), async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';
    const roleFilter = c.req.query('role');

    const skip = (page - 1) * limit;

    // Build where clause - only users from the same tenant
    const where: any = {
      tenantId: user.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (roleFilter) {
      where.role = roleFilter as Role;
    }

    const [usersList, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          permissions: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return c.json({
      data: usersList,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// ============================================
// GET /api/v1/users/:id - Get user by ID
// ============================================
users.get('/:id', authMiddleware, requirePermission('users.read'), async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const foundUser = await db.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId, // Ensure user is from the same tenant
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        permissions: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!foundUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ data: foundUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// ============================================
// POST /api/v1/users - Create user (admin only)
// ============================================
users.post('/', authMiddleware, requirePermission('users.create'), async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    // Validate request body
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.errors }, 400);
    }

    const { email, password, name, role, permissions } = result.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return c.json({ error: 'Weak password', details: passwordValidation.errors }, 400);
    }

    // Check if email already exists in this tenant
    const existingUser = await db.user.findFirst({
      where: {
        email,
        tenantId: currentUser.tenantId,
      },
    });

    if (existingUser) {
      return c.json({ error: 'Email already exists in this tenant' }, 400);
    }

    // Only OWNER can create another OWNER
    if (role === 'OWNER' && currentUser.role !== 'OWNER') {
      return c.json({ error: 'Only OWNER can create another OWNER' }, 403);
    }

    // Cannot create user with role higher than current user
    if (currentUser.role === 'STAFF' && (role === 'ADMIN' || role === 'OWNER')) {
      return c.json({ error: 'Cannot create user with higher role' }, 403);
    }
    if (currentUser.role === 'ADMIN' && role === 'OWNER') {
      return c.json({ error: 'Only OWNER can create another OWNER' }, 403);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        permissions,
        tenantId: currentUser.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.USER_CREATED,
      entity: 'user',
      entityId: newUser.id,
      metadata: {
        userEmail: newUser.email,
        userRole: newUser.role,
        createdBy: currentUser.email,
      },
    });

    return c.json(
      {
        message: 'User created successfully',
        data: newUser,
      },
      201
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// ============================================
// PATCH /api/v1/users/:id - Update user
// ============================================
users.patch('/:id', authMiddleware, requirePermission('users.update'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.errors }, 400);
    }

    // Check if user exists and is from the same tenant
    const existingUser = await db.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Role change validation
    if (result.data.role) {
      const newRole = result.data.role;

      // Only OWNER can change to OWNER
      if (newRole === 'OWNER' && currentUser.role !== 'OWNER') {
        return c.json({ error: 'Only OWNER can assign OWNER role' }, 403);
      }

      // Cannot promote user to same or higher level than current user
      if (currentUser.role === 'STAFF' && (newRole === 'ADMIN' || newRole === 'OWNER')) {
        return c.json({ error: 'Cannot assign higher role' }, 403);
      }
      if (currentUser.role === 'ADMIN' && newRole === 'OWNER') {
        return c.json({ error: 'Only OWNER can assign OWNER role' }, 403);
      }

      // Cannot modify another OWNER unless you are an OWNER
      if (existingUser.role === 'OWNER' && currentUser.role !== 'OWNER') {
        return c.json({ error: 'Cannot modify another OWNER' }, 403);
      }
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: result.data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        permissions: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.USER_UPDATED,
      entity: 'user',
      entityId: id,
      metadata: {
        changes: result.data,
        updatedBy: currentUser.email,
      },
    });

    return c.json({
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// ============================================
// PATCH /api/v1/users/:id/role - Change user role
// ============================================
users.patch('/:id/role', authMiddleware, requirePermission('users.update'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    // Validate request body
    const result = updateRoleSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.errors }, 400);
    }

    // Check if user exists and is from the same tenant
    const existingUser = await db.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const newRole = result.data.role;

    // Role change validation
    // Only OWNER can create another OWNER
    if (newRole === 'OWNER' && currentUser.role !== 'OWNER') {
      return c.json({ error: 'Only OWNER can assign OWNER role' }, 403);
    }

    // Cannot promote user to same or higher level than current user
    if (currentUser.role === 'STAFF' && (newRole === 'ADMIN' || newRole === 'OWNER')) {
      return c.json({ error: 'Cannot assign higher role' }, 403);
    }
    if (currentUser.role === 'ADMIN' && newRole === 'OWNER') {
      return c.json({ error: 'Only OWNER can assign OWNER role' }, 403);
    }

    // Cannot modify another OWNER unless you are an OWNER
    if (existingUser.role === 'OWNER' && currentUser.role !== 'OWNER') {
      return c.json({ error: 'Cannot modify another OWNER' }, 403);
    }

    // Update user role
    const updatedUser = await db.user.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.USER_ROLE_CHANGED,
      entity: 'user',
      entityId: id,
      metadata: {
        previousRole: existingUser.role,
        newRole,
        changedBy: currentUser.email,
      },
    });

    return c.json({
      message: 'User role updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

// ============================================
// DELETE /api/v1/users/:id - Soft delete user (set isActive = false)
// ============================================
users.delete('/:id', authMiddleware, requirePermission('users.delete'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');

    // Cannot delete yourself
    if (id === currentUser.id) {
      return c.json({ error: 'Cannot delete your own user' }, 400);
    }

    // Check if user exists and is from the same tenant
    const existingUser = await db.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Cannot delete another OWNER unless you are an OWNER
    if (existingUser.role === 'OWNER' && currentUser.role !== 'OWNER') {
      return c.json({ error: 'Cannot delete another OWNER' }, 403);
    }

    // Soft delete (set isActive = false)
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.USER_DELETED,
      entity: 'user',
      entityId: id,
      metadata: {
        userEmail: existingUser.email,
        userRole: existingUser.role,
        deletedBy: currentUser.email,
      },
    });

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

export default users;
