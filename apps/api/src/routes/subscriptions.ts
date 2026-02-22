// Subscription Routes - Manage subscriptions
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { db } from '../lib/db';
import { logAudit } from '../lib/audit';

const subscriptions = new Hono();

// ============================================
// GET /api/v1/subscriptions - Get current subscription
// ============================================
subscriptions.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const subscription = await db.subscription.findUnique({
      where: { tenantId: user.tenantId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        paymentMethods: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    // If no subscription exists, return default FREE plan
    if (!subscription) {
      return c.json({
        planId: 'FREE',
        status: 'ACTIVE',
        provider: null,
        invoices: [],
        paymentMethods: [],
      });
    }

    return c.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return c.json({ error: 'Failed to fetch subscription' }, 500);
  }
});

// ============================================
// POST /api/v1/subscriptions/cancel - Cancel subscription
// ============================================
subscriptions.post(
  '/cancel',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');

      const subscription = await db.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!subscription) {
        return c.json({ error: 'No subscription found' }, 404);
      }

      if (subscription.planId === 'FREE') {
        return c.json({ error: 'Cannot cancel FREE plan' }, 400);
      }

      // Update subscription to cancel at period end
      const updated = await db.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });

      // Log audit event
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'subscription.canceled',
        entity: 'subscription',
        entityId: subscription.id,
        metadata: { planId: subscription.planId },
      });

      return c.json(updated);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return c.json({ error: 'Failed to cancel subscription' }, 500);
    }
  }
);

// ============================================
// POST /api/v1/subscriptions/resume - Resume canceled subscription
// ============================================
subscriptions.post(
  '/resume',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');

      const subscription = await db.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!subscription) {
        return c.json({ error: 'No subscription found' }, 404);
      }

      if (!subscription.cancelAtPeriodEnd) {
        return c.json({ error: 'Subscription is not scheduled for cancellation' }, 400);
      }

      // Update subscription to remove cancellation flag
      const updated = await db.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: false },
      });

      // Log audit event
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'subscription.resumed',
        entity: 'subscription',
        entityId: subscription.id,
        metadata: { planId: subscription.planId },
      });

      return c.json(updated);
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return c.json({ error: 'Failed to resume subscription' }, 500);
    }
  }
);

// ============================================
// GET /api/v1/subscriptions/invoices - List invoices
// ============================================
subscriptions.get('/invoices', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.invoice.count({ where: { tenantId: user.tenantId } }),
    ]);

    return c.json({
      data: invoices,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

// ============================================
// GET /api/v1/subscriptions/invoices/:id - Get invoice details
// ============================================
subscriptions.get('/invoices/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const invoice = await db.invoice.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    return c.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return c.json({ error: 'Failed to fetch invoice' }, 500);
  }
});

export default subscriptions;
