// Invitation Endpoints
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { logAudit, AuditActions } from '../lib/audit';
import { Role } from '@shared';
import { randomBytes } from 'crypto';

const invitations = new Hono();

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']).default('STAFF'),
  expiresIn: z.number().min(1).max(168).default(48), // Hours (max 7 days)
});

// ============================================
// GET /api/v1/invitations - List invitations (paginated, tenant-scoped)
// ============================================
invitations.get('/', authMiddleware, requirePermission('users.create'), async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const status = c.req.query('status'); // 'pending', 'accepted', 'expired'

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId: user.tenantId,
    };

    if (status === 'pending') {
      where.acceptedAt = null;
      where.expiresAt = { gt: new Date() };
    } else if (status === 'accepted') {
      where.acceptedAt = { not: null };
    } else if (status === 'expired') {
      where.acceptedAt = null;
      where.expiresAt = { lte: new Date() };
    }

    const [invitations, total] = await Promise.all([
      db.invitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
          invitedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          acceptedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.invitation.count({ where }),
    ]);

    return c.json({
      data: invitations,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return c.json({ error: 'Failed to fetch invitations' }, 500);
  }
});

// ============================================
// POST /api/v1/invitations - Create invitation
// ============================================
invitations.post('/', authMiddleware, requirePermission('users.create'), async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    // Validate request body
    const result = createInvitationSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.errors }, 400);
    }

    const { email, role, expiresIn } = result.data;

    // Check role permissions
    // Only OWNER can create ADMIN invitations
    if (role === 'ADMIN' && currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN') {
      return c.json({ error: 'Only OWNER or ADMIN can create ADMIN invitations' }, 403);
    }

    // STAFF cannot create invitations
    if (currentUser.role === 'STAFF') {
      return c.json({ error: 'STAFF cannot create invitations' }, 403);
    }

    // Check if email already exists in this tenant
    const existingUser = await db.user.findFirst({
      where: {
        email,
        tenantId: currentUser.tenantId,
      },
    });

    if (existingUser) {
      return c.json({ error: 'User already exists in this tenant' }, 400);
    }

    // Check for pending invitation
    const pendingInvitation = await db.invitation.findFirst({
      where: {
        email,
        tenantId: currentUser.tenantId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      return c.json({ error: 'Pending invitation already exists for this email' }, 400);
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        tenantId: currentUser.tenantId,
        invitedBy: currentUser.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.INVITATION_CREATED,
      entity: 'invitation',
      entityId: invitation.id,
      metadata: {
        email,
        role,
        invitedBy: currentUser.email,
      },
    });

    // TODO: Send email with invitation link
    // For now, return the token (in production, only send via email)
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?token=${token}`;

    return c.json(
      {
        message: 'Invitation created successfully',
        data: {
          ...invitation,
          invitationUrl: process.env.NODE_ENV === 'development' ? invitationUrl : undefined,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating invitation:', error);
    return c.json({ error: 'Failed to create invitation' }, 500);
  }
});

// ============================================
// GET /api/v1/invitations/:token - Get invitation by token
// ============================================
invitations.get('/:token', async (c) => {
  try {
    const token = c.req.param('token');

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            primaryColor: true,
          },
        },
        invitedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return c.json({ error: 'Invitation has expired' }, 400);
    }

    // Check if invitation is already accepted
    if (invitation.acceptedAt) {
      return c.json({ error: 'Invitation has already been accepted' }, 400);
    }

    // Check if tenant is active
    if (!invitation.tenant.isActive) {
      return c.json({ error: 'Tenant is inactive' }, 403);
    }

    return c.json({
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        tenant: invitation.tenant,
        invitedBy: invitation.invitedByUser,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return c.json({ error: 'Failed to fetch invitation' }, 500);
  }
});

// ============================================
// POST /api/v1/invitations/:token/accept - Accept invitation
// ============================================
invitations.post('/:token/accept', async (c) => {
  try {
    const token = c.req.param('token');
    const body = await c.req.json();

    // Validate request body
    const acceptSchema = z.object({
      name: z.string().min(1).max(255).optional(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    });

    const result = acceptSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.errors }, 400);
    }

    const { name, password } = result.data;

    // Find invitation
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        tenant: true,
      },
    });

    if (!invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return c.json({ error: 'Invitation has expired' }, 400);
    }

    // Check if invitation is already accepted
    if (invitation.acceptedAt) {
      return c.json({ error: 'Invitation has already been accepted' }, 400);
    }

    // Check if tenant is active
    if (!invitation.tenant.isActive) {
      return c.json({ error: 'Tenant is inactive' }, 403);
    }

    // Hash password
    const { hashPassword } = await import('../lib/password');
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        name,
        role: invitation.role,
        tenantId: invitation.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Mark invitation as accepted
    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        acceptedBy: user.id,
      },
    });

    // Log audit
    await logAudit({
      tenantId: invitation.tenantId,
      userId: user.id,
      action: AuditActions.INVITATION_ACCEPTED,
      entity: 'invitation',
      entityId: invitation.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    // Generate tokens
    const { generateTokenPair } = await import('../lib/jwt');
    const { accessToken, refreshToken } = await generateTokenPair(user);

    return c.json({
      message: 'Invitation accepted successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return c.json({ error: 'Failed to accept invitation' }, 500);
  }
});

// ============================================
// DELETE /api/v1/invitations/:id - Cancel invitation
// ============================================
invitations.delete('/:id', authMiddleware, requirePermission('users.create'), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = c.req.param('id');

    // Find invitation
    const invitation = await db.invitation.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    // Cannot delete already accepted invitations
    if (invitation.acceptedAt) {
      return c.json({ error: 'Cannot delete accepted invitation' }, 400);
    }

    // Delete invitation
    await db.invitation.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: AuditActions.USER_DELETED,
      entity: 'invitation',
      entityId: id,
      metadata: {
        email: invitation.email,
        role: invitation.role,
        cancelledBy: currentUser.email,
      },
    });

    return c.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return c.json({ error: 'Failed to cancel invitation' }, 500);
  }
});

export default invitations;
