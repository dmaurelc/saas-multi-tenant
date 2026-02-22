// Magic Link Authentication
import db from './db';
import { randomBytes } from 'crypto';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const MAGIC_LINK_TOKEN_BYTES = 32;

export interface MagicLinkTokenPayload {
  email: string;
  tenantId?: string;
}

/**
 * Generate a secure random token for magic link
 */
export function generateMagicLinkToken(): string {
  return randomBytes(MAGIC_LINK_TOKEN_BYTES).toString('hex');
}

/**
 * Calculate expiration date for magic link
 */
export function getMagicLinkExpiration(): Date {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_LINK_EXPIRY_MINUTES);
  return expiresAt;
}

/**
 * Create a magic link for authentication
 */
export async function createMagicLink(email: string, tenantId?: string) {
  const token = generateMagicLinkToken();
  const expiresAt = getMagicLinkExpiration();

  // Check if user exists
  const user = await db.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If tenantId provided, verify it matches the user's tenant
  if (tenantId && user.tenantId !== tenantId) {
    throw new Error('Tenant mismatch');
  }

  // Create magic link
  const magicLink = await db.magicLink.create({
    data: {
      email,
      token,
      tenantId: user.tenantId,
      expiresAt,
      userId: user.id,
    },
  });

  return {
    token: magicLink.token,
    expiresAt: magicLink.expiresAt,
    email: magicLink.email,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    },
  };
}

/**
 * Validate a magic link token
 */
export async function validateMagicLink(token: string) {
  const magicLink = await db.magicLink.findUnique({
    where: { token },
    include: { user: { include: { tenant: true } } },
  });

  if (!magicLink) {
    return { valid: false, error: 'Invalid magic link', user: null };
  }

  // Check if expired
  if (magicLink.expiresAt < new Date()) {
    return { valid: false, error: 'Magic link expired', user: null };
  }

  // Check if already used
  if (magicLink.usedAt) {
    return { valid: false, error: 'Magic link already used', user: null };
  }

  // Check if user exists and is active
  if (!magicLink.user || !magicLink.user.isActive) {
    return { valid: false, error: 'User account is disabled', user: null };
  }

  // Check if tenant is active
  if (!magicLink.user.tenant.isActive) {
    return { valid: false, error: 'Tenant account is disabled', user: null };
  }

  return {
    valid: true,
    user: magicLink.user,
  };
}

/**
 * Mark magic link as used
 */
export async function markMagicLinkUsed(token: string) {
  return db.magicLink.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}

/**
 * Clean up expired magic links (run periodically)
 */
export async function cleanupExpiredMagicLinks() {
  const now = new Date();

  return db.magicLink.deleteMany({
    where: {
      expiresAt: { lt: now },
      usedAt: null,
    },
  });
}
