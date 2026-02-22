// Metrics & Analytics Routes - KPIs and activity tracking
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { db } from '../lib/db';

const metrics = new Hono();

// ============================================
// GET /api/v1/metrics/kpis - Get dashboard KPIs
// ============================================
metrics.get('/kpis', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;

    // Get current subscription for plan distribution
    const subscription = await db.subscription.findUnique({
      where: { tenantId },
    });

    const [totalUsers, activeUsers, totalRevenue, recentEvents] = await Promise.all([
      // Total users count
      db.user.count({ where: { tenantId } }),

      // Active users count
      db.user.count({ where: { tenantId, isActive: true } }),

      // Total revenue from successful payments
      db.payment.aggregate({
        where: { tenantId, status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),

      // Recent events count (last 30 days)
      db.event.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get plan distribution (for admin view)
    let planDistribution = null;
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      const allTenants = await db.tenant.findMany({
        select: { plan: true },
      });

      planDistribution = allTenants.reduce(
        (acc, tenant) => {
          acc[tenant.plan] = (acc[tenant.plan] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }

    return c.json({
      totalUsers,
      activeUsers,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentEvents,
      currentPlan: subscription?.planId || 'FREE',
      planDistribution,
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return c.json({ error: 'Failed to fetch KPIs' }, 500);
  }
});

// ============================================
// GET /api/v1/metrics/activity - Activity for charts (last 30 days)
// ============================================
metrics.get('/activity', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const days = parseInt(c.req.query('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user registrations by day
    const usersByDay = (await db.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `) as Array<{ date: string; count: bigint }>;

    // Get events by day
    const eventsByDay = (await db.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `) as Array<{ date: string; count: bigint }>;

    // Get payments by day
    const paymentsByDay = (await db.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as amount
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
        AND status = 'SUCCEEDED'
      GROUP BY DATE(created_at)
      ORDER BY date
    `) as Array<{ date: string; amount: bigint }>;

    return c.json({
      users: usersByDay.map((item) => ({ date: item.date, count: Number(item.count) })),
      events: eventsByDay.map((item) => ({ date: item.date, count: Number(item.count) })),
      payments: paymentsByDay.map((item) => ({ date: item.date, amount: Number(item.amount) })),
    });
  } catch (error) {
    console.error('Error fetching activity data:', error);
    return c.json({ error: 'Failed to fetch activity data' }, 500);
  }
});

// ============================================
// POST /api/v1/metrics/events - Track analytics event
// ============================================
metrics.post('/events', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const eventSchema = z.object({
      eventType: z.string().min(1).max(100),
      eventName: z.string().min(1).max(200),
      properties: z.record(z.any()).optional(),
    });

    const result = eventSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.errors }, 400);
    }

    const event = await db.event.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        eventType: result.data.eventType,
        eventName: result.data.eventName,
        properties: result.data.properties || {},
        sessionId: c.req.header('x-session-id'),
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        referrer: c.req.header('referer'),
      },
    });

    return c.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

// ============================================
// GET /api/v1/metrics/events - Get events with filters
// ============================================
metrics.get('/events', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const skip = (page - 1) * limit;
    const eventType = c.req.query('eventType');

    const where: any = { tenantId: user.tenantId };
    if (eventType) {
      where.eventType = eventType;
    }

    const [events, total] = await Promise.all([
      db.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.event.count({ where }),
    ]);

    return c.json({
      data: events,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// ============================================
// GET /api/v1/metrics/revenue - Revenue analytics
// ============================================
metrics.get('/revenue', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const days = parseInt(c.req.query('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get revenue by day
    const revenueByDay = (await db.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as amount
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
        AND status = 'SUCCEEDED'
      GROUP BY DATE(created_at)
      ORDER BY date
    `) as Array<{ date: string; amount: bigint }>;

    // Get total revenue and stats
    const stats = await db.payment.aggregate({
      where: {
        tenantId,
        status: 'SUCCEEDED',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    return c.json({
      daily: revenueByDay.map((item) => ({ date: item.date, amount: Number(item.amount) })),
      total: stats._sum.amount || 0,
      count: stats._count,
      average: stats._avg.amount || 0,
    });
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    return c.json({ error: 'Failed to fetch revenue metrics' }, 500);
  }
});

export default metrics;
