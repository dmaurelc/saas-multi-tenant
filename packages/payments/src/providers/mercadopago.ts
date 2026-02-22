// MercadoPago Payment Provider Implementation
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
import crypto from 'crypto';

interface MercadoPagoConfig {
  accessToken: string;
  environment?: 'TEST' | 'LIVE';
}

export class MercadoPagoProvider implements PaymentProvider {
  name = 'mercadopago' as const;
  private accessToken: string;
  private baseUrl: string;

  constructor(config: MercadoPagoConfig) {
    this.accessToken = config.accessToken;
    // Use sandbox for test mode
    this.baseUrl =
      config.environment === 'LIVE' ? 'https://api.mercadopago.com' : 'https://api.mercadopago.com'; // MercadoPago uses the same URL, test mode is controlled by access token
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: 'Unknown error' }))) as {
        message?: string;
      };
      throw new Error(error.message || `MercadoPago API error: ${response.status}`);
    }

    return response.json() as T;
  }

  async createCheckoutSession(
    planId: string,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession> {
    // Get amount from plan
    const amount = this.getPlanAmount(planId);

    // Create preference for checkout
    const preferenceData = {
      items: [
        {
          id: `plan-${planId.toLowerCase()}`,
          title: `Plan ${planId}`,
          description: `Suscripción al plan ${planId}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'CLP',
        },
      ],
      payer: {
        email: (options.metadata?.email as string) || undefined,
      },
      back_urls: {
        success: options.successUrl,
        failure: options.cancelUrl,
        pending: options.successUrl,
      },
      auto_return: 'approved',
      metadata: {
        tenantId,
        planId,
        userId: options.metadata?.userId,
      },
      external_reference: `tenant-${tenantId}-${planId}-${Date.now()}`,
    };

    try {
      const response = await this.request<{
        id: string;
        init_point: string;
        sandbox_init_point: string;
      }>('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preferenceData),
      });

      // Use sandbox init point for test mode
      const isTest = !this.accessToken.startsWith('PROD');
      const checkoutUrl = isTest ? response.sandbox_init_point : response.init_point;

      return {
        sessionId: response.id,
        checkoutUrl,
        planId: planId as PlanId,
        provider: 'mercadopago',
      };
    } catch (error) {
      console.error('Error creating MercadoPago checkout:', error);
      throw new Error('Failed to create MercadoPago checkout session');
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    // MercadoPago has preapproval for recurring payments
    try {
      const preapproval = await this.request<{
        id: string;
        status: string;
        payer_id: string;
        card_id: string;
        reason: string;
        external_reference: string;
        date_created: string;
        last_modified: string;
        auto_recurring: {
          frequency: number;
          frequency_type: string;
          transaction_amount: number;
          currency_id: string;
        };
        back_url: string;
      }>(`/preapproval/${providerSubscriptionId}`);

      // Parse external_reference to get plan info
      // Format: tenant-{tenantId}-{planId}-{timestamp}
      const match = preapproval.external_reference?.match(/tenant-(.+?)-(.+?)-\d+/);
      const tenantId = match?.[1] || '';
      const planId = (match?.[2] || 'FREE') as PlanId;

      return {
        id: preapproval.id,
        tenantId,
        provider: 'mercadopago',
        providerSubscriptionId: preapproval.id,
        planId,
        status: this.mapMercadoPagoStatus(preapproval.status),
        currentPeriodStart: new Date(preapproval.date_created),
        currentPeriodEnd: new Date(preapproval.last_modified),
      };
    } catch (error) {
      console.error('Error getting MercadoPago subscription:', error);
      return null;
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    try {
      await this.request(`/preapproval/${providerSubscriptionId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
    } catch (error) {
      console.error('Error canceling MercadoPago subscription:', error);
      throw error;
    }
  }

  async listPaymentMethods(_tenantId: string): Promise<PaymentMethod[]> {
    // MercadoPago doesn't have a direct way to list saved payment methods
    // Customers cards are associated with their MercadoPago account
    return [];
  }

  async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
    try {
      const mpEvent = event.data as any;

      // MercadoPago sends notifications about payment status changes
      switch (event.eventType) {
        case 'payment':
        case 'payment.updated':
        case 'payment.created':
          await this.handlePaymentUpdate(mpEvent);
          break;

        case 'preapproval':
        case 'preapproval_updated':
        case 'preapproval_created':
          await this.handlePreapprovalUpdate(mpEvent);
          break;

        default:
          console.log(`Unhandled MercadoPago event: ${event.eventType}`);
      }

      return { success: true, processed: true };
    } catch (error) {
      console.error('Error handling MercadoPago webhook:', error);
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  verifyWebhookSignature(rawPayload: string, signature: string): boolean {
    // MercadoPago uses X-Signature header with HMAC SHA256
    // Format: ts={timestamp};v1={signature}
    const [ts, v1] = signature.split(';').map((s) => s.split('=')[1]);

    if (!ts || !v1) {
      return false;
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('No MercadoPago webhook secret configured');
      return false;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${rawPayload}${ts}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expectedSignature));
  }

  async getPortalUrl(_tenantId: string): Promise<string> {
    // MercadoPago doesn't have a customer portal
    // Users manage their subscriptions through their MercadoPago account
    return '';
  }

  // Private methods

  private getPlanAmount(planId: string): number {
    const prices: Record<string, number> = {
      PRO: 29000,
      BUSINESS: 79000,
      ENTERPRISE: 0, // Custom pricing
    };

    const amount = prices[planId];
    if (amount === undefined) {
      throw new Error(`No price configured for plan: ${planId}`);
    }

    return amount;
  }

  private mapMercadoPagoStatus(status: string): Subscription['status'] {
    const statusMap: Record<string, Subscription['status']> = {
      authorized: 'active',
      pending: 'trialing',
      paused: 'past_due',
      cancelled: 'canceled',
    };

    return statusMap[status] || 'active';
  }

  private async handlePaymentUpdate(payment: any) {
    try {
      // Get payment details
      const paymentData = await this.request<{
        id: string;
        status: string;
        external_reference: string;
        transaction_amount: number;
        metadata: Record<string, unknown>;
      }>(`/payments/${payment.data?.id || payment.id}`);

      // Parse external_reference to get tenant and plan info
      const match = paymentData.external_reference?.match(/tenant-(.+?)-(.+?)-\d+/);
      if (match) {
        const [, tenantId, planId] = match;
        console.log(
          `MercadoPago payment for tenant ${tenantId}, plan ${planId}:`,
          paymentData.status
        );
      }
    } catch (error) {
      console.error('Error handling MercadoPago payment update:', error);
    }
  }

  private async handlePreapprovalUpdate(preapproval: any) {
    try {
      const preapprovalData = await this.request<{
        id: string;
        status: string;
        external_reference: string;
        reason: string;
        auto_recurring: {
          transaction_amount: number;
        };
      }>(`/preapproval/${preapproval.data?.id || preapproval.id}`);

      console.log(`MercadoPago preapproval updated:`, preapprovalData);
    } catch (error) {
      console.error('Error handling MercadoPago preapproval update:', error);
    }
  }

  // Create recurring payment (preapproval)
  async createRecurringPayment(
    planId: string,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession> {
    const amount = this.getPlanAmount(planId);

    const preapprovalData = {
      reason: `Suscripción plan ${planId}`,
      external_reference: `tenant-${tenantId}-${planId}-${Date.now()}`,
      payer_email: options.metadata?.email as string,
      auto_return: 'approved',
      back_url: options.successUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'CLP',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year
      },
      metadata: {
        tenantId,
        planId,
      },
    };

    try {
      const response = await this.request<{
        id: string;
        init_point: string;
        sandbox_init_point: string;
      }>('/preapproval', {
        method: 'POST',
        body: JSON.stringify(preapprovalData),
      });

      const isTest = !this.accessToken.startsWith('PROD');
      const checkoutUrl = isTest ? response.sandbox_init_point : response.init_point;

      return {
        sessionId: response.id,
        checkoutUrl,
        planId: planId as PlanId,
        provider: 'mercadopago',
      };
    } catch (error) {
      console.error('Error creating MercadoPago recurring payment:', error);
      throw new Error('Failed to create MercadoPago recurring payment');
    }
  }
}
