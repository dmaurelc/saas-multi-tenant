// Payment Package Entry Point

export type {
  PaymentProvider,
  PaymentProviderName,
  PlanId,
  SubscriptionPlan,
  CheckoutOptions,
  CheckoutSession,
  Subscription,
  WebhookEvent,
  WebhookResult,
  PaymentMethod,
  SubscriptionStatus,
} from './types.js';

export { PLANS } from './types.js';
export { StripeProvider } from './providers/stripe.js';
export { TransbankProvider } from './providers/transbank.js';
export { MercadoPagoProvider } from './providers/mercadopago.js';
export { FlowProvider } from './providers/flow.js';

import { PaymentProviderName, PaymentProvider } from './types.js';
import { StripeProvider } from './providers/stripe.js';
import { TransbankProvider } from './providers/transbank.js';
import { MercadoPagoProvider } from './providers/mercadopago.js';
import { FlowProvider } from './providers/flow.js';

export class PaymentService {
  private providers: Map<PaymentProviderName, PaymentProvider> = new Map();

  constructor() {
    // Initialize Stripe provider
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.providers.set('stripe', new StripeProvider(stripeSecretKey));
    }

    // Initialize Transbank provider with Oneclick support
    const tbkCommerceCode = process.env.TBK_COMMERCE_CODE;
    const tbkApiKey = process.env.TBK_API_KEY;
    const tbkOneclickCommerceCode = process.env.TBK_ONECLICK_COMMERCE_CODE;
    const tbkOneclickApiKey = process.env.TBK_ONECLICK_API_KEY;
    if (tbkCommerceCode && tbkApiKey) {
      this.providers.set(
        'transbank',
        new TransbankProvider({
          commerceCode: tbkCommerceCode,
          apiKey: tbkApiKey,
          environment: (process.env.TBK_INTEGRATION_TYPE as 'TEST' | 'LIVE') || 'TEST',
          oneclick:
            tbkOneclickCommerceCode && tbkOneclickApiKey
              ? {
                  commerceCode: tbkOneclickCommerceCode,
                  apiKey: tbkOneclickApiKey,
                }
              : undefined,
        })
      );
    }

    // Initialize MercadoPago provider
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (mpAccessToken) {
      this.providers.set(
        'mercadopago',
        new MercadoPagoProvider({
          accessToken: mpAccessToken,
          environment: 'TEST', // MercadoPago uses test mode based on access token prefix
        })
      );
    }

    // Initialize Flow provider
    const flowApiKey = process.env.FLOW_API_KEY;
    const flowSecret = process.env.FLOW_SECRET;
    if (flowApiKey && flowSecret) {
      this.providers.set(
        'flow',
        new FlowProvider({
          apiKey: flowApiKey,
          secret: flowSecret,
          environment: (process.env.FLOW_ENVIRONMENT as 'TEST' | 'LIVE') || 'TEST',
        })
      );
    }
  }

  getProvider(name: PaymentProviderName): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider ${name} not configured`);
    }
    return provider;
  }

  getAvailableProviders(): PaymentProviderName[] {
    return Array.from(this.providers.keys());
  }

  isProviderAvailable(name: PaymentProviderName): boolean {
    return this.providers.has(name);
  }

  // Helper method to get all providers configured for a specific plan
  getProvidersForPlan(_planId: string): PaymentProviderName[] {
    const available = this.getAvailableProviders();

    // In production, you might want to configure which provider
    // supports which plan. For now, return all available providers.
    return available;
  }

  // Helper method to get preferred provider for a region
  getPreferredProvider(region: string = 'CL'): PaymentProviderName {
    const available = this.getAvailableProviders();

    // Chile: Prefer Chilean providers, fallback to Stripe
    if (region === 'CL') {
      if (available.includes('transbank')) return 'transbank';
      if (available.includes('mercadopago')) return 'mercadopago';
      if (available.includes('flow')) return 'flow';
    }

    // Default to Stripe
    if (available.includes('stripe')) return 'stripe';

    // Fallback to any available provider
    if (available.length > 0) return available[0];

    throw new Error('No payment provider configured');
  }
}
