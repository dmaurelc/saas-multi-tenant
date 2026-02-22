// Payment Routes - Checkout, Webhooks, Portal
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { db } from '../lib/db';
import { logAudit } from '../lib/audit';

const payments = new Hono();

// Validation schemas
const checkoutSchema = z.object({
  planId: z.enum(['PRO', 'BUSINESS', 'ENTERPRISE']),
  provider: z.enum(['stripe', 'transbank', 'mercadopago', 'flow']).default('stripe'),
});

// ============================================
// POST /api/v1/payments/checkout - Create checkout session
// ============================================
payments.post('/checkout', authMiddleware, requirePermission('subscription.update'), async (c) => {
  try {
    const body = await c.req.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.errors }, 400);
    }

    const user = c.get('user');
    const { planId, provider } = result.data;

    // Import PaymentService dynamically to avoid initialization issues
    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    // Check if provider is available
    if (!paymentService.isProviderAvailable(provider)) {
      return c.json({ error: `Payment provider ${provider} is not configured` }, 400);
    }

    const paymentProvider = paymentService.getProvider(provider);

    const session = await paymentProvider.createCheckoutSession(planId, user.tenantId, {
      successUrl: `${process.env.APP_URL || 'http://localhost:3000'}/billing?success=true`,
      cancelUrl: `${process.env.APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
      metadata: {
        email: user.email,
        tenantId: user.tenantId,
        userId: user.id,
      },
    });

    // Log audit event
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'checkout.initiated',
      entity: 'subscription',
      entityId: session.sessionId,
      metadata: { planId, provider },
    });

    return c.json(session);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

// ============================================
// POST /api/v1/payments/webhooks/stripe - Stripe webhook handler
// ============================================
payments.post('/webhooks/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'No signature provided' }, 401);
    }

    const body = await c.req.text();

    // Import PaymentService
    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    const provider = paymentService.getProvider('stripe');

    // Verify signature
    if (!provider.verifyWebhookSignature(body, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse event
    const event = JSON.parse(body);

    // Handle webhook
    const result = await provider.handleWebhook({
      provider: 'stripe',
      eventType: event.type,
      data: event,
    });

    if (!result.success) {
      console.error('Webhook handling failed:', result.error);
      return c.json({ error: result.error || 'Webhook handling failed' }, 500);
    }

    return c.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// ============================================
// POST /api/v1/payments/webhooks/transbank - Transbank webhook handler
// ============================================
payments.post('/webhooks/transbank', async (c) => {
  try {
    const body = await c.req.json();

    // Import PaymentService
    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    if (!paymentService.isProviderAvailable('transbank')) {
      return c.json({ error: 'Transbank not configured' }, 400);
    }

    const provider = paymentService.getProvider('transbank');

    // Handle webhook
    const result = await provider.handleWebhook({
      provider: 'transbank',
      eventType: body.status || 'transaction.updated',
      data: body,
    });

    if (!result.success) {
      console.error('Transbank webhook handling failed:', result.error);
      return c.json({ error: result.error || 'Webhook handling failed' }, 500);
    }

    return c.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Error processing Transbank webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// ============================================
// POST /api/v1/payments/webhooks/mercadopago - MercadoPago webhook handler
// ============================================
payments.post('/webhooks/mercadopago', async (c) => {
  try {
    const signature = c.req.header('x-signature');
    const body = await c.req.text();

    // Import PaymentService
    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    if (!paymentService.isProviderAvailable('mercadopago')) {
      return c.json({ error: 'MercadoPago not configured' }, 400);
    }

    const provider = paymentService.getProvider('mercadopago');

    // Verify signature if provided
    if (signature && !provider.verifyWebhookSignature(body, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse event
    const event = JSON.parse(body);

    // For MercadoPago, the topic is in the query param or header
    const topic = c.req.query('topic') || c.req.header('x-topic') || 'payment';
    const eventType = event.type || topic;

    // Handle webhook
    const result = await provider.handleWebhook({
      provider: 'mercadopago',
      eventType,
      data: event,
    });

    if (!result.success) {
      console.error('MercadoPago webhook handling failed:', result.error);
      return c.json({ error: result.error || 'Webhook handling failed' }, 500);
    }

    return c.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Error processing MercadoPago webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// ============================================
// POST /api/v1/payments/webhooks/flow - Flow webhook handler
// ============================================
payments.post('/webhooks/flow', async (c) => {
  try {
    const signature = c.req.header('x-signature');
    const body = await c.req.text();

    // Import PaymentService
    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    if (!paymentService.isProviderAvailable('flow')) {
      return c.json({ error: 'Flow not configured' }, 400);
    }

    const provider = paymentService.getProvider('flow');

    // Verify signature if provided
    if (signature && !provider.verifyWebhookSignature(body, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse event
    const event = JSON.parse(body);

    // Handle webhook
    const result = await provider.handleWebhook({
      provider: 'flow',
      eventType: event.status || 'payment.updated',
      data: event,
    });

    if (!result.success) {
      console.error('Flow webhook handling failed:', result.error);
      return c.json({ error: result.error || 'Webhook handling failed' }, 500);
    }

    return c.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Error processing Flow webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// ============================================
// GET /api/v1/payments/methods - List saved payment methods
// ============================================
payments.get('/methods', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const paymentMethods = await db.paymentMethod.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { isDefault: 'desc' },
    });

    return c.json({ data: paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return c.json({ error: 'Failed to fetch payment methods' }, 500);
  }
});

// ============================================
// POST /api/v1/payments/methods - Add new payment method
// ============================================
payments.post('/methods', authMiddleware, requirePermission('subscription.update'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    // For now, just return a placeholder
    // In production, this would integrate with Stripe's PaymentMethods API
    return c.json(
      {
        error: 'Payment method management not yet implemented',
      },
      501
    );
  } catch (error) {
    console.error('Error adding payment method:', error);
    return c.json({ error: 'Failed to add payment method' }, 500);
  }
});

// ============================================
// DELETE /api/v1/payments/methods/:id - Remove payment method
// ============================================
payments.delete(
  '/methods/:id',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');

      const paymentMethod = await db.paymentMethod.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!paymentMethod) {
        return c.json({ error: 'Payment method not found' }, 404);
      }

      await db.paymentMethod.delete({
        where: { id },
      });

      return c.json({ success: true });
    } catch (error) {
      console.error('Error removing payment method:', error);
      return c.json({ error: 'Failed to remove payment method' }, 500);
    }
  }
);

// ============================================
// GET /api/v1/payments/portal - Get customer portal URL
// ============================================
payments.get('/portal', authMiddleware, requirePermission('subscription.update'), async (c) => {
  try {
    const user = c.get('user');

    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    const provider = paymentService.getProvider('stripe');
    const portalUrl = await provider.getPortalUrl(user.tenantId);

    if (!portalUrl) {
      return c.json({ error: 'Portal URL not available' }, 400);
    }

    return c.json({ portalUrl });
  } catch (error) {
    console.error('Error getting portal URL:', error);
    return c.json({ error: 'Failed to get portal URL' }, 500);
  }
});

// ============================================
// TRANSBANK ONECLICK - Recurring payments with stored cards
// ============================================

// ============================================
// POST /api/v1/payments/oneclick/inscribe - Start Oneclick inscription
// ============================================
payments.post(
  '/oneclick/inscribe',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');

      const { PaymentService } = await import('@saas/payments');
      const paymentService = new PaymentService();

      if (!paymentService.isProviderAvailable('transbank')) {
        return c.json({ error: 'Transbank not configured' }, 400);
      }

      const provider = paymentService.getProvider('transbank') as any;

      // Check if Oneclick is configured
      if (!provider.oneclick) {
        return c.json({ error: 'Oneclick is not configured' }, 400);
      }

      // Create response URL for redirect after enrollment
      const responseUrl = `${process.env.APP_URL || 'http://localhost:3000'}/billing/oneclick/finish`;

      // Start inscription
      const response = await provider.startOneclickInscription(
        user.id, // Using user ID as username
        user.email,
        responseUrl
      );

      // Log audit event
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'oneclick.inscription.started',
        entity: 'payment_method',
        entityId: response.token,
        metadata: { email: user.email },
      });

      return c.json({
        token: response.token,
        url: response.urlWebpay,
      });
    } catch (error) {
      console.error('Error starting Oneclick inscription:', error);
      return c.json({ error: 'Failed to start Oneclick inscription' }, 500);
    }
  }
);

// ============================================
// PUT /api/v1/payments/oneclick/finish/:token - Finish Oneclick inscription
// ============================================
payments.put(
  '/oneclick/finish/:token',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');
      const token = c.req.param('token');

      const { PaymentService } = await import('@saas/payments');
      const paymentService = new PaymentService();

      if (!paymentService.isProviderAvailable('transbank')) {
        return c.json({ error: 'Transbank not configured' }, 400);
      }

      const provider = paymentService.getProvider('transbank') as any;

      // Finish inscription
      const response = await provider.finishOneclickInscription(token);

      if (response.responseCode !== 0) {
        return c.json(
          {
            error: 'Inscription failed',
            responseCode: response.responseCode,
          },
          400
        );
      }

      // Store payment method in database
      const paymentMethod = await db.paymentMethod.create({
        data: {
          tenantId: user.tenantId,
          provider: 'TRANSBANK',
          providerMethodId: response.tbkUser, // Using tbk_user as provider method ID
          type: 'ONECLICK',
          isDefault: false, // First one will be set as default by business logic if needed
          last4: response.cardNumber,
          brand: response.cardType,
          metadata: {
            tbkUser: response.tbkUser,
            username: user.id,
            authorizationCode: response.authorizationCode,
          },
        },
      });

      // Log audit event
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'oneclick.inscription.completed',
        entity: 'payment_method',
        entityId: paymentMethod.id,
        metadata: {
          cardType: response.cardType,
          last4: response.cardNumber,
        },
      });

      return c.json({
        success: true,
        paymentMethod: {
          id: paymentMethod.id,
          type: 'ONECLICK',
          last4: response.cardNumber,
          brand: response.cardType,
        },
      });
    } catch (error) {
      console.error('Error finishing Oneclick inscription:', error);
      return c.json({ error: 'Failed to finish Oneclick inscription' }, 500);
    }
  }
);

// ============================================
// DELETE /api/v1/payments/oneclick/:id - Delete Oneclick inscription
// ============================================
payments.delete(
  '/oneclick/:id',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');

      // Get payment method
      const paymentMethod = await db.paymentMethod.findFirst({
        where: { id, tenantId: user.tenantId, type: 'ONECLICK' },
      });

      if (!paymentMethod) {
        return c.json({ error: 'Oneclick payment method not found' }, 404);
      }

      const { PaymentService } = await import('@saas/payments');
      const paymentService = new PaymentService();

      if (!paymentService.isProviderAvailable('transbank')) {
        return c.json({ error: 'Transbank not configured' }, 400);
      }

      const provider = paymentService.getProvider('transbank') as any;

      // Get tbkUser and username from metadata
      const tbkUser = paymentMethod.metadata?.tbkUser;
      const username = paymentMethod.metadata?.username;

      if (!tbkUser || !username) {
        return c.json({ error: 'Invalid payment method data' }, 400);
      }

      // Delete inscription from Transbank
      await provider.deleteOneclickInscription(tbkUser, username);

      // Delete from database
      await db.paymentMethod.delete({
        where: { id },
      });

      // Log audit event
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'oneclick.inscription.deleted',
        entity: 'payment_method',
        entityId: id,
      });

      return c.json({ success: true });
    } catch (error) {
      console.error('Error deleting Oneclick inscription:', error);
      return c.json({ error: 'Failed to delete Oneclick inscription' }, 500);
    }
  }
);

// ============================================
// POST /api/v1/payments/oneclick/authorize - Authorize recurring payment
// ============================================
payments.post(
  '/oneclick/authorize',
  authMiddleware,
  requirePermission('subscription.update'),
  async (c) => {
    try {
      const user = c.get('user');
      const body = await c.req.json();

      const { paymentMethodId, amount, commerceCode } = body;

      if (!paymentMethodId || !amount) {
        return c.json({ error: 'Missing required fields: paymentMethodId, amount' }, 400);
      }

      // Get payment method
      const paymentMethod = await db.paymentMethod.findFirst({
        where: { id: paymentMethodId, tenantId: user.tenantId, type: 'ONECLICK' },
      });

      if (!paymentMethod) {
        return c.json({ error: 'Oneclick payment method not found' }, 404);
      }

      const { PaymentService } = await import('@saas/payments');
      const paymentService = new PaymentService();

      if (!paymentService.isProviderAvailable('transbank')) {
        return c.json({ error: 'Transbank not configured' }, 400);
      }

      const provider = paymentService.getProvider('transbank') as any;

      // Get tbkUser and username from metadata
      const tbkUser = paymentMethod.metadata?.tbkUser;
      const username = paymentMethod.metadata?.username;

      if (!tbkUser || !username) {
        return c.json({ error: 'Invalid payment method data' }, 400);
      }

      // Generate unique buy order
      const buyOrder = `subscription-${user.tenantId}-${Date.now()}`;

      // Authorize payment
      const response = await provider.authorizeOneclickPayment({
        username,
        tbkUser,
        buyOrder,
        amount,
        commerceCode: commerceCode || process.env.TBK_ONECLICK_COMMERCE_CODE || '',
      });

      if (!response.success) {
        return c.json(
          {
            error: 'Payment authorization failed',
            responseCode: response.responseCode,
          },
          400
        );
      }

      // Create payment record
      const payment = await db.payment.create({
        data: {
          tenantId: user.tenantId,
          provider: 'TRANSBANK',
          providerPaymentId: response.transactionId || buyOrder,
          status: 'SUCCEEDED',
          amount,
          currency: 'CLP',
          processedAt: new Date(),
          metadata: {
            buyOrder,
            authorizationCode: response.authorizationCode,
            paymentMethodId,
          },
        },
      });

      // Log audit event
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'oneclick.payment.authorized',
        entity: 'payment',
        entityId: payment.id,
        metadata: {
          amount,
          authorizationCode: response.authorizationCode,
        },
      });

      return c.json({
        success: true,
        payment: {
          id: payment.id,
          amount,
          status: 'SUCCEEDED',
          authorizationCode: response.authorizationCode,
        },
      });
    } catch (error) {
      console.error('Error authorizing Oneclick payment:', error);
      return c.json({ error: 'Failed to authorize Oneclick payment' }, 500);
    }
  }
);

// ============================================
// GET /api/v1/payments/oneclick/status/:buyOrder - Get transaction status
// ============================================
payments.get('/oneclick/status/:buyOrder', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const buyOrder = c.req.param('buyOrder');

    const { PaymentService } = await import('@saas/payments');
    const paymentService = new PaymentService();

    if (!paymentService.isProviderAvailable('transbank')) {
      return c.json({ error: 'Transbank not configured' }, 400);
    }

    const provider = paymentService.getProvider('transbank') as any;

    // Get transaction status
    const status = await provider.getOneclickTransactionStatus(buyOrder);

    return c.json(status);
  } catch (error) {
    console.error('Error getting Oneclick transaction status:', error);
    return c.json({ error: 'Failed to get transaction status' }, 500);
  }
});

export default payments;
