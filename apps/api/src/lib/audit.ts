import db from './db';

interface AuditLogParams {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export async function logAudit(params: AuditLogParams) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata as any, // Prisma JsonValue type
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Common audit actions
 */
export const AuditActions = {
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ROLE_CHANGED: 'user.role_changed',
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  INVITATION_CREATED: 'invitation.created',
  INVITATION_ACCEPTED: 'invitation.accepted',
} as const;
