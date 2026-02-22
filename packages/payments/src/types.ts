// Payment Types and Plan Definitions

export type PaymentProviderName = 'stripe' | 'transbank' | 'mercadopago' | 'flow';
export type PlanId = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: number; // in CLP
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    users: number;
    records: number;
  };
}

export const PLANS: Record<PlanId, SubscriptionPlan> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: 'CLP',
    interval: 'monthly',
    features: ['1 usuario', '100 registros'],
    limits: { users: 1, records: 100 },
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    price: 29000,
    currency: 'CLP',
    interval: 'monthly',
    features: ['5 usuarios', '1,000 registros', 'Soporte por email'],
    limits: { users: 5, records: 1000 },
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business',
    price: 79000,
    currency: 'CLP',
    interval: 'monthly',
    features: ['25 usuarios', '10,000 registros', 'Soporte prioritario'],
    limits: { users: 25, records: 10000 },
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 0,
    currency: 'CLP',
    interval: 'monthly',
    features: ['Usuarios ilimitados', 'Registros ilimitados', 'SLA garantizado'],
    limits: { users: -1, records: -1 },
  },
};

export interface CheckoutOptions {
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  planId: PlanId;
  provider: PaymentProviderName;
}

export interface Subscription {
  id: string;
  tenantId: string;
  provider: PaymentProviderName;
  providerSubscriptionId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface WebhookEvent {
  provider: PaymentProviderName;
  eventType: string;
  data: unknown;
}

export interface WebhookResult {
  success: boolean;
  processed: boolean;
  error?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'oneclick';
  provider: PaymentProviderName;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface PaymentProvider {
  name: PaymentProviderName;

  // Subscription operations
  createCheckoutSession(
    planId: PlanId,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession>;

  getSubscription(providerSubscriptionId: string): Promise<Subscription | null>;

  cancelSubscription(providerSubscriptionId: string): Promise<void>;

  // Payment methods
  listPaymentMethods(tenantId: string): Promise<PaymentMethod[]>;

  // Webhooks
  handleWebhook(event: WebhookEvent): Promise<WebhookResult>;

  verifyWebhookSignature(rawPayload: string, signature: string): boolean;

  // Portal
  getPortalUrl(tenantId: string): Promise<string>;
}
