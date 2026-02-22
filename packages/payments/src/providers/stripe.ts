// Stripe Payment Provider Implementation
import Stripe from 'stripe';
import {
  PaymentProvider,
  CheckoutSession,
  CheckoutOptions,
  PlanId,
  WebhookEvent,
  WebhookResult,
  PaymentMethod,
  Subscription,
} from '../types.js';

export class StripeProvider implements PaymentProvider {
  name = 'stripe' as const;
  private client: Stripe;

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey);
  }

  async createCheckoutSession(
    planId: string,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession> {
    const prices = {
      PRO: process.env.STRIPE_PRICE_ID_PRO,
      BUSINESS: process.env.STRIPE_PRICE_ID_BUSINESS,
    };

    const priceId = prices[planId as keyof typeof prices];
    if (!priceId) {
      throw new Error(`No price ID configured for plan: ${planId}`);
    }

    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        tenantId,
        planId,
      },
      customer_email: (options.metadata?.email as string) || undefined,
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url!,
      planId: planId as PlanId,
      provider: 'stripe',
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    try {
      const stripeSubscription = await this.client.subscriptions.retrieve(providerSubscriptionId);

      // Stripe API returns data with different shape depending on API version
      // We need to cast to access the properties
      const subscriptionData = stripeSubscription as unknown as {
        id: string;
        metadata: { tenantId?: string; planId?: string };
        status: string;
        current_period_start: number;
        current_period_end: number;
      };

      return {
        id: stripeSubscription.id,
        tenantId: subscriptionData.metadata.tenantId || '',
        provider: 'stripe',
        providerSubscriptionId: stripeSubscription.id,
        planId: (subscriptionData.metadata.planId as PlanId) || 'FREE',
        status: subscriptionData.status as Subscription['status'],
        currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
        currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
      };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return null;
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.client.subscriptions.cancel(providerSubscriptionId);
  }

  async listPaymentMethods(_tenantId: string): Promise<PaymentMethod[]> {
    // This would require storing the customer ID in the tenant or subscription
    // For now, return empty array
    return [];
  }

  async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
    try {
      const stripeEvent = event.data as Stripe.Event;

      switch (stripeEvent.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${stripeEvent.type}`);
      }

      return { success: true, processed: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  verifyWebhookSignature(rawPayload: string, signature: string): boolean {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('No Stripe webhook secret configured');
      return false;
    }

    try {
      Stripe.webhooks.constructEvent(rawPayload, signature, webhookSecret);
      return true;
    } catch (error) {
      console.error('Invalid webhook signature:', error);
      return false;
    }
  }

  async getPortalUrl(_tenantId: string): Promise<string> {
    // This would require the customer ID
    // For now, return empty string
    return '';
  }

  // Private handlers

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { tenantId, planId } = session.metadata || {};

    if (!tenantId || !planId) {
      console.error('Missing metadata in checkout session');
      return;
    }

    // The subscription will be created/updated via the subscription.updated event
    // This is just for logging/tracking
    console.log(`Checkout completed for tenant ${tenantId}, plan ${planId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const { tenantId, planId } = subscription.metadata || {};

    if (!tenantId || !planId) {
      console.error('Missing metadata in subscription');
      return;
    }

    // Update subscription in database
    // This would be called via the API that imports this module
    console.log(`Subscription updated for tenant ${tenantId}: ${subscription.status}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const { tenantId } = subscription.metadata || {};

    if (!tenantId) {
      console.error('Missing metadata in subscription');
      return;
    }

    // Update subscription status in database
    console.log(`Subscription deleted for tenant ${tenantId}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const inv = invoice as unknown as { subscription?: string };
    const subscriptionId = inv.subscription;

    if (!subscriptionId) {
      console.error('No subscription ID in invoice');
      return;
    }

    console.log(`Payment succeeded for subscription ${subscriptionId}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const inv = invoice as unknown as { subscription?: string };
    const subscriptionId = inv.subscription;

    if (!subscriptionId) {
      console.error('No subscription ID in invoice');
      return;
    }

    console.log(`Payment failed for subscription ${subscriptionId}`);
  }
}
