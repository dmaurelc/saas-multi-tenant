// Flow Payment Provider Implementation
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

interface FlowConfig {
  apiKey: string;
  secret: string;
  environment?: 'TEST' | 'LIVE';
}

export class FlowProvider implements PaymentProvider {
  name = 'flow' as const;
  private apiKey: string;
  private secret: string;
  private baseUrl: string;

  constructor(config: FlowConfig) {
    this.apiKey = config.apiKey;
    this.secret = config.secret;
    // Flow uses different URLs for test and production
    this.baseUrl =
      config.environment === 'LIVE' ? 'https://www.flow.cl/api' : 'https://sandbox.flow.cl/api';
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { params?: Record<string, string> }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, this.baseUrl);

    // Add query parameters for GET requests
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Sign the request
    const timestamp = Date.now().toString();
    const signature = this.signRequest(url.toString() + timestamp);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: 'Unknown error' }))) as {
        message?: string;
      };
      throw new Error(error.message || `Flow API error: ${response.status}`);
    }

    return response.json() as T;
  }

  private signRequest(data: string): string {
    return crypto.createHmac('sha256', this.secret).update(data).digest('hex');
  }

  async createCheckoutSession(
    planId: string,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession> {
    // Get amount from plan
    const amount = this.getPlanAmount(planId);

    // Create payment session
    const paymentData = {
      apiKey: this.apiKey,
      commerceOrder: `tenant-${tenantId}-${planId}-${Date.now()}`,
      subject: `Plan ${planId}`,
      currency: 'CLP',
      amount: amount,
      email: options.metadata?.email || '',
      paymentMethod: 9, // Webpay
      urlConfirmation: `${options.successUrl}/api/v1/payments/webhooks/flow`,
      urlReturn: options.successUrl,
      metadata: {
        tenantId,
        planId,
        userId: options.metadata?.userId,
      } as Record<string, unknown>,
    };

    try {
      const response = await this.request<{
        token: string;
        url: string;
        flowOrder: number;
      }>('/payment/create', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      return {
        sessionId: response.token,
        checkoutUrl: response.url + '?token=' + response.token,
        planId: planId as PlanId,
        provider: 'flow',
      };
    } catch (error) {
      console.error('Error creating Flow checkout:', error);
      throw new Error('Failed to create Flow checkout session');
    }
  }

  async getSubscription(_providerSubscriptionId: string): Promise<Subscription | null> {
    // Flow doesn't have native subscriptions
    // Would need to be implemented with recurring payments
    return null;
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // Not applicable for Flow
    throw new Error('Subscription cancellation not supported for Flow');
  }

  async listPaymentMethods(_tenantId: string): Promise<PaymentMethod[]> {
    // Flow doesn't store payment methods
    return [];
  }

  async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
    try {
      const flowEvent = event.data as any;

      // Flow sends payment status updates
      switch (event.eventType) {
        case 'payment.created':
          await this.handlePaymentCreated(flowEvent);
          break;

        case 'payment.updated':
        case 'payment.status':
          await this.handlePaymentStatus(flowEvent);
          break;

        case 'payment.success':
          await this.handlePaymentSuccess(flowEvent);
          break;

        case 'payment.error':
          await this.handlePaymentError(flowEvent);
          break;

        default:
          console.log(`Unhandled Flow event: ${event.eventType}`);
      }

      return { success: true, processed: true };
    } catch (error) {
      console.error('Error handling Flow webhook:', error);
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  verifyWebhookSignature(rawPayload: string, signature: string): boolean {
    // Flow uses signature in the request
    // The signature is generated from the data + secret
    try {
      const data = JSON.parse(rawPayload);
      const expectedSignature = this.signRequest(JSON.stringify(data) + data.timestamp);
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  async getPortalUrl(_tenantId: string): Promise<string> {
    // Flow doesn't have a customer portal
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

  private async handlePaymentCreated(payment: any) {
    console.log(`Flow payment created:`, payment);
  }

  private async handlePaymentStatus(payment: any) {
    try {
      // Get payment status from Flow
      const status = await this.request<{
        status: number;
        flowOrder: number;
        commerceOrder: string;
        amount: number;
        pending: number;
        date: string;
      }>('/payment/getStatus', {
        params: { token: payment.token },
      });

      // Map Flow status codes:
      // 1 = Created, 2 = Paid, 3 = Rejected, 4 = Pending, 5 = Failed, 6 = Cancelled, 7 = Refunded

      // Parse commerce order to get tenant and plan info
      const match = status.commerceOrder.match(/tenant-(.+?)-(.+?)-\d+/);
      if (match) {
        const [, tenantId, planId] = match;
        console.log(`Flow payment status for tenant ${tenantId}, plan ${planId}:`, status.status);
      }
    } catch (error) {
      console.error('Error handling Flow payment status:', error);
    }
  }

  private async handlePaymentSuccess(payment: any) {
    try {
      const status = await this.request<{
        status: number;
        flowOrder: number;
        commerceOrder: string;
        amount: number;
        date: string;
        payer: string;
      }>('/payment/getStatus', {
        params: { token: payment.token },
      });

      console.log(`Flow payment success:`, status);

      // Create payment record in database
      const match = status.commerceOrder.match(/tenant-(.+?)-(.+?)-\d+/);
      if (match) {
        const [, tenantId, planId] = match;
        console.log(
          `Payment completed for tenant ${tenantId}, plan ${planId}, amount: ${status.amount}`
        );
      }
    } catch (error) {
      console.error('Error handling Flow payment success:', error);
    }
  }

  private async handlePaymentError(payment: any) {
    console.error(`Flow payment error:`, payment);
  }

  // Method to get payment status by token
  async getPaymentStatus(token: string): Promise<{
    status: number;
    statusDescription: string;
    flowOrder: number;
    commerceOrder: string;
    amount: number;
    pending: number;
    date: string;
  }> {
    try {
      const response = await this.request<{
        status: number;
        flowOrder: number;
        commerceOrder: string;
        amount: number;
        pending: number;
        date: string;
      }>('/payment/getStatus', {
        params: { token },
      });

      const statusMap: Record<number, string> = {
        1: 'Created',
        2: 'Paid',
        3: 'Rejected',
        4: 'Pending',
        5: 'Failed',
        6: 'Cancelled',
        7: 'Refunded',
      };

      return {
        ...response,
        statusDescription: statusMap[response.status] || 'Unknown',
      };
    } catch (error) {
      console.error('Error getting Flow payment status:', error);
      throw error;
    }
  }

  // Method to refund a payment
  async refundPayment(token: string, amount?: number): Promise<void> {
    const refundData = {
      apiKey: this.apiKey,
      token: token,
      amount: amount, // If not provided, full refund
    };

    try {
      await this.request('/payment/refund', {
        method: 'POST',
        body: JSON.stringify(refundData),
      });
    } catch (error) {
      console.error('Error refunding Flow payment:', error);
      throw error;
    }
  }

  // Method to create a recurring payment (simulated)
  async createRecurringPayment(
    planId: string,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession> {
    // Flow doesn't have native recurring payments
    // This would be implemented by creating multiple scheduled payments
    // For now, return a regular payment
    return this.createCheckoutSession(planId, tenantId, options);
  }
}
