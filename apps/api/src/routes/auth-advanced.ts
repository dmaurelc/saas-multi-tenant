import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import db from '../lib/db';
import { generateTokenPair } from '../lib/jwt';
import { logAudit, AuditActions } from '../lib/audit';
import { authMiddleware } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { createMagicLink, validateMagicLink, markMagicLinkUsed } from '../lib/magicLink';

const app = new Hono();

// ============================================
// Validation Schemas
// ============================================

const magicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const magicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ============================================
// Magic Link Routes
// ============================================

/**
 * POST /api/v1/auth/magic-link/request
 * Request a magic link to be sent to email
 */
app.post(
  '/magic-link/request',
  authRateLimit,
  zValidator('json', magicLinkRequestSchema),
  async (c) => {
    const { email } = c.req.valid('json');

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      // But return success to prevent email enumeration
      return c.json({
        message: 'If an account exists with this email, a magic link will be sent',
      });
    }

    if (!user.isActive) {
      return c.json({ error: 'Forbidden', message: 'Account is disabled' }, 403);
    }

    if (!user.tenant.isActive) {
      return c.json({ error: 'Forbidden', message: 'Tenant account is disabled' }, 403);
    }

    // Create magic link
    const magicLink = await createMagicLink(email);

    // TODO: Send email with magic link
    // For now, return the token in development mode
    const isDev = process.env.NODE_ENV === 'development';

    // Audit log
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'auth.magic_link_requested',
      entity: 'magic_link',
      entityId: magicLink.token,
      metadata: { email },
    });

    return c.json({
      message: 'Magic link sent to email',
      // In production, don't return the token
      ...(isDev && {
        devToken: magicLink.token,
        devUrl: `/api/v1/auth/magic-link/verify?token=${magicLink.token}`,
      }),
    });
  }
);

/**
 * POST /api/v1/auth/magic-link/verify
 * Verify magic link and create session
 */
app.post(
  '/magic-link/verify',
  authRateLimit,
  zValidator('json', magicLinkVerifySchema),
  async (c) => {
    const { token } = c.req.valid('json');

    // Validate magic link
    const result = await validateMagicLink(token);

    if (!result.valid || !result.user) {
      return c.json({ error: 'Unauthorized', message: result.error }, 401);
    }

    const user = result.user;

    // Mark as used
    await markMagicLinkUsed(token);

    // Generate tokens
    const tokens = generateTokenPair({
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
        token: tokens.accessToken,
        expiresAt,
      },
    });

    // Audit log
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditActions.USER_LOGIN,
      entity: 'user',
      entityId: user.id,
      metadata: { method: 'magic_link' },
    });

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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
      ...tokens,
    });
  }
);

/**
 * GET /api/v1/auth/magic-link/verify
 * Verify magic link via GET (for email links)
 */
app.get('/magic-link/verify', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: 'Bad Request', message: 'Token is required' }, 400);
  }

  // Validate magic link
  const result = await validateMagicLink(token);

  if (!result.valid || !result.user) {
    return c.json({ error: 'Unauthorized', message: result.error }, 401);
  }

  const user = result.user;

  // Mark as used
  await markMagicLinkUsed(token);

  // Generate tokens
  const tokens = generateTokenPair({
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
      token: tokens.accessToken,
      expiresAt,
    },
  });

  // Audit log
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: AuditActions.USER_LOGIN,
    entity: 'user',
    entityId: user.id,
    metadata: { method: 'magic_link' },
  });

  // Return HTML page that sets tokens in localStorage
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Login Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h1 { color: #333; margin-bottom: 0.5rem; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ Login Successful</h1>
    <p>Redirecting you to the dashboard...</p>
    <div class="spinner"></div>
  </div>
  <script>
    // Store tokens in localStorage
    localStorage.setItem('accessToken', '${tokens.accessToken}');
    localStorage.setItem('refreshToken', '${tokens.refreshToken}');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard';
    }, 1500);
  </script>
</body>
</html>
  `;

  return c.html(html);
});

// ============================================
// OAuth Routes (placeholders - to be implemented)
// ============================================

/**
 * GET /api/v1/auth/oauth/google
 * Initiate Google OAuth flow
 */
app.get('/oauth/google', async (c) => {
  // TODO: Implement Google OAuth
  return c.json({ message: 'Google OAuth not yet implemented' }, 501);
});

/**
 * GET /api/v1/auth/oauth/github
 * Initiate GitHub OAuth flow
 */
app.get('/oauth/github', async (c) => {
  // TODO: Implement GitHub OAuth
  return c.json({ message: 'GitHub OAuth not yet implemented' }, 501);
});

/**
 * GET /api/v1/auth/oauth/callback/:provider
 * OAuth callback handler
 */
app.get('/oauth/callback/:provider', async (c) => {
  const provider = c.req.param('provider');

  if (provider !== 'google' && provider !== 'github') {
    return c.json({ error: 'Bad Request', message: 'Invalid OAuth provider' }, 400);
  }

  // TODO: Implement OAuth callback
  return c.json({ message: 'OAuth callback not yet implemented' }, 501);
});

export default app;
