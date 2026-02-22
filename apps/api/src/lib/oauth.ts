// OAuth Integration for Google and GitHub
import db from './db';
import { generateTokenPair } from './jwt';
import { logAudit } from './audit';
import { OAuthProvider } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified?: boolean;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

// ============================================
// OAuth Provider Configurations
// ============================================

export const OAuthConfigs: Record<string, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      'http://localhost:3000/api/v1/auth/oauth/callback/google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid profile email',
  },
  github: {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
    redirectUri:
      process.env.GITHUB_OAUTH_REDIRECT_URI ||
      'http://localhost:3000/api/v1/auth/oauth/callback/github',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'user:email',
  },
};

// ============================================
// Generate OAuth Authorization URL
// ============================================

export function getOAuthAuthorizationUrl(provider: string, state: string): string {
  const config = OAuthConfigs[provider];

  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    response_type: 'code',
    state,
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

// ============================================
// Exchange Authorization Code for Tokens
// ============================================

async function exchangeCodeForToken(
  provider: string,
  code: string
): Promise<{ access_token: string; refresh_token?: string }> {
  const config = OAuthConfigs[provider];

  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json() as Promise<{ access_token: string; refresh_token?: string }>;
}

// ============================================
// Get User Info from OAuth Provider
// ============================================

async function getOAuthUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo> {
  const config = OAuthConfigs[provider];

  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch user info: ${error}`);
  }

  const data: any = await response.json();

  // Normalize user info based on provider
  if (provider === 'google') {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
      emailVerified: data.verified_email,
    };
  }

  if (provider === 'github') {
    // GitHub doesn't provide email in the default user endpoint
    // We need to fetch it separately
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const emails = (await emailResponse.json()) as any[];
    const primaryEmail = emails.find((e: any) => e.primary && e.verified);

    return {
      id: data.id.toString(),
      email: primaryEmail?.email || data.email || '',
      name: data.name || data.login,
      avatar: data.avatar_url,
      emailVerified: !!primaryEmail,
    };
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

// ============================================
// Generate Random State for OAuth
// ============================================

export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ============================================
// Find or Create User from OAuth
// ============================================

export async function findOrCreateUserFromOAuth(
  provider: string,
  userInfo: OAuthUserInfo,
  tenantId?: string
) {
  // Check if OAuth account exists
  const oauthAccount = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: provider.toUpperCase() as OAuthProvider,
        providerAccountId: userInfo.id,
      },
    },
  });

  // If OAuth account exists, return the user
  if (oauthAccount) {
    const user = await db.user.findUnique({
      where: { id: oauthAccount.userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is disabled');
    }

    if (!user.tenant.isActive) {
      throw new Error('Tenant account is disabled');
    }

    return user;
  }

  // Check if user with same email exists
  const existingUser = await db.user.findUnique({
    where: { email: userInfo.email },
    include: { tenant: true },
  });

  if (existingUser) {
    // Link OAuth account to existing user
    const newOAuthAccount = await db.oAuthAccount.create({
      data: {
        userId: existingUser.id,
        provider: provider.toUpperCase() as OAuthProvider,
        providerAccountId: userInfo.id,
      },
    });

    // Audit log
    await logAudit({
      tenantId: existingUser.tenantId,
      userId: existingUser.id,
      action: 'auth.oauth_linked',
      entity: 'oauth_account',
      entityId: newOAuthAccount.id,
      metadata: { provider },
    });

    return existingUser;
  }

  // For new users, we require a tenant (provided during OAuth flow)
  if (!tenantId) {
    throw new Error('Tenant ID is required for new OAuth users');
  }

  // Verify tenant exists
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (!tenant.isActive) {
    throw new Error('Tenant account is disabled');
  }

  // Create new user with OAuth
  const newUser = await db.user.create({
    data: {
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.avatar,
      tenantId,
      role: 'STAFF', // Default role for OAuth users
      emailVerified: new Date(),
      oauthAccounts: {
        create: {
          provider: provider.toUpperCase() as OAuthProvider,
          providerAccountId: userInfo.id,
        },
      },
    },
    include: { tenant: true },
  });

  // Audit log
  await logAudit({
    tenantId: newUser.tenantId,
    userId: newUser.id,
    action: 'user.registered',
    entity: 'user',
    entityId: newUser.id,
    metadata: { method: 'oauth', provider },
  });

  return newUser;
}

// ============================================
// Complete OAuth Flow
// ============================================

export async function completeOAuthFlow(provider: string, code: string, tenantId?: string) {
  // Exchange code for access token
  const tokens = await exchangeCodeForToken(provider, code);

  // Get user info
  const userInfo = await getOAuthUserInfo(provider, tokens.access_token);

  // Find or create user
  const user = await findOrCreateUserFromOAuth(provider, userInfo, tenantId);

  // Generate JWT tokens
  const jwtTokens = generateTokenPair({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.session.create({
    data: {
      userId: user.id,
      token: jwtTokens.accessToken,
      expiresAt,
    },
  });

  // Update OAuth account with tokens
  await db.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: provider.toUpperCase() as OAuthProvider,
        providerAccountId: userInfo.id,
      },
    },
    create: {
      userId: user.id,
      provider: provider.toUpperCase() as OAuthProvider,
      providerAccountId: userInfo.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
  });

  // Audit log
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'user.login',
    entity: 'user',
    entityId: user.id,
    metadata: { method: 'oauth', provider },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
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
    ...jwtTokens,
  };
}

// ============================================
// Link OAuth Account to Existing User
// ============================================

export async function linkOAuthAccount(userId: string, provider: string, code: string) {
  const tokens = await exchangeCodeForToken(provider, code);
  const userInfo = await getOAuthUserInfo(provider, tokens.access_token);

  // Check if OAuth account already exists
  const existing = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: provider.toUpperCase() as OAuthProvider,
        providerAccountId: userInfo.id,
      },
    },
  });

  if (existing) {
    throw new Error('OAuth account already linked to another user');
  }

  // Link to user
  const oauthAccount = await db.oAuthAccount.create({
    data: {
      userId,
      provider: provider.toUpperCase() as OAuthProvider,
      providerAccountId: userInfo.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
  });

  // Audit log
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    await logAudit({
      tenantId: user.tenantId,
      userId,
      action: 'auth.oauth_linked',
      entity: 'oauth_account',
      entityId: oauthAccount.id,
      metadata: { provider },
    });
  }

  return oauthAccount;
}

// ============================================
// Unlink OAuth Account
// ============================================

export async function unlinkOAuthAccount(userId: string, provider: string) {
  const deleted = await db.oAuthAccount.deleteMany({
    where: {
      userId,
      provider: provider.toUpperCase() as OAuthProvider,
    },
  });

  // Check if user has password login
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, tenantId: true },
  });

  if (user && !user.passwordHash && deleted.count === 1) {
    // Check if user has other OAuth accounts
    const remainingAccounts = await db.oAuthAccount.count({
      where: { userId },
    });

    if (remainingAccounts === 0) {
      throw new Error('Cannot unlink last authentication method');
    }
  }

  if (user) {
    await logAudit({
      tenantId: user.tenantId,
      userId,
      action: 'auth.oauth_unlinked',
      entity: 'oauth_account',
      metadata: { provider },
    });
  }

  return deleted;
}
