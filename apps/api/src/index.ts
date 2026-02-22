import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import authRoutes from './routes/auth';
import authAdvancedRoutes from './routes/auth-advanced';
import tenantsRoutes from './routes/tenants';
import { apiRateLimit } from './middleware/rateLimit';
import { tenantResolver } from './middleware/tenant';

const app = new Hono();

// ============================================
// Global Middleware
// ============================================

// Logger
app.use('*', logger());

// Pretty JSON
app.use('*', prettyJSON());

// CORS
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ].filter(Boolean),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
  })
);

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// API rate limiting
app.use('/api/*', apiRateLimit);

// Tenant resolution (subdomain/custom domain/header)
app.use('/api/*', tenantResolver);

// ============================================
// Health Check
// ============================================

app.get('/', (c) => {
  return c.json({
    name: 'SaaS Multi-Tenant API',
    version: '0.2.0-alpha.1',
    description: 'Multi-tenant SaaS platform API',
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// API Routes
// ============================================

// Auth routes (public + protected)
app.route('/api/v1/auth', authRoutes);

// Advanced auth routes (magic link, oauth)
app.route('/api/v1/auth', authAdvancedRoutes);

// Tenant routes (CRUD)
app.route('/api/v1/tenants', tenantsRoutes);

// ============================================
// Error Handling
// ============================================

app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: c.req.path,
    },
    404
  );
});

app.onError((err, c) => {
  console.error('Server Error:', err);

  // Handle known errors
  if (err.message.includes('Unique constraint')) {
    return c.json({ error: 'Conflict', message: 'Resource already exists' }, 409);
  }

  if (err.message.includes('Foreign key constraint')) {
    return c.json({ error: 'Bad Request', message: 'Invalid reference to related resource' }, 400);
  }

  // Generic error
  return c.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
    500
  );
});

// ============================================
// Start Server
// ============================================

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`🚀 API Server running on http://localhost:${port}`);

export default app;
