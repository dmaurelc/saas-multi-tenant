import { Context, Next } from 'hono';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (c: Context) => string;
}

/**
 * Simple rate limiting middleware
 * Note: For production, use Redis-based rate limiting
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message, keyGenerator } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator
      ? keyGenerator(c)
      : c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    const now = Date.now();
    const record = store[key];

    if (!record || now > record.resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      record.count++;

      if (record.count > max) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);

        return c.json(
          {
            error: 'Too Many Requests',
            message: message || `Too many requests. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          },
          429
        );
      }
    }

    // Add rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', (max - store[key].count).toString());
    c.header('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    await next();
  };
}

/**
 * Pre-configured rate limiters
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (c) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    return `auth:${ip}`;
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});
