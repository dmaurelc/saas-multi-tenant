-- Sprint 5: Add Payments, Notifications, and Metrics tables
-- This migration adds the database schema for:
-- - Subscriptions (Stripe, Transbank, MercadoPago, Flow)
-- - Invoices and Payments
-- - Payment Methods
-- - Notifications and Notification Preferences
-- - Analytics Events

-- ============================================
-- Create ENUM types
-- ============================================

CREATE TYPE "Provider" AS ENUM ('STRIPE', 'TRANSBANK', 'MERCADOPAGO', 'FLOW');

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

CREATE TYPE "PaymentType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'ONECLICK');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

CREATE TYPE "NotificationType" AS ENUM (
  'USER_INVITED',
  'USER_ADDED',
  'USER_ROLE_CHANGED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_CANCELED',
  'INVOICE_AVAILABLE',
  'TENANT_UPDATED',
  'SYSTEM_ANNOUNCEMENT',
  'CUSTOM'
);

-- ============================================
-- Create SUBSCRIPTIONS table
-- ============================================

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL UNIQUE,
  "provider" "Provider" NOT NULL DEFAULT 'STRIPE',
  "provider_subscription_id" text,
  "provider_customer_id" text,
  "plan_id" "Plan" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "canceled_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "subscriptions_provider_subscription_id_idx" ON "subscriptions"("provider_subscription_id");

-- ============================================
-- Create INVOICES table
-- ============================================

CREATE TABLE "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "subscription_id" uuid,
  "provider" "Provider" NOT NULL DEFAULT 'STRIPE',
  "provider_invoice_id" text,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" text NOT NULL DEFAULT 'CLP',
  "subtotal" integer NOT NULL,
  "tax" integer NOT NULL DEFAULT 0,
  "total" integer NOT NULL,
  "due_date" timestamp,
  "paid_at" timestamp,
  "invoice_url" text,
  "line_items" jsonb,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");
CREATE INDEX "invoices_provider_invoice_id_idx" ON "invoices"("provider_invoice_id");

-- ============================================
-- Create PAYMENT METHODS table
-- ============================================

CREATE TABLE "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "subscription_id" uuid,
  "provider" "Provider" NOT NULL DEFAULT 'STRIPE',
  "provider_method_id" text NOT NULL,
  "type" "PaymentType" NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "last4" text,
  "brand" text,
  "expires_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payment_methods_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "payment_methods_subscription_id_idx" ON "payment_methods"("subscription_id");

-- ============================================
-- Create PAYMENTS table
-- ============================================

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "invoice_id" uuid,
  "provider" "Provider" NOT NULL DEFAULT 'STRIPE',
  "provider_payment_id" text,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'CLP',
  "processed_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");
CREATE INDEX "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");

-- ============================================
-- Create NOTIFICATIONS table
-- ============================================

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "data" jsonb,
  "read_at" timestamp,
  "action_url" text,
  "action_label" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp,

  CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- ============================================
-- Create NOTIFICATION PREFERENCES table
-- ============================================

CREATE TABLE "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "email_enabled" boolean NOT NULL DEFAULT true,
  "in_app_enabled" boolean NOT NULL DEFAULT true,
  "preferences" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notification_preferences_tenant_id_idx" ON "notification_preferences"("tenant_id");

-- ============================================
-- Create EVENTS table (Analytics)
-- ============================================

CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "user_id" uuid,
  "event_type" text NOT NULL,
  "event_name" text NOT NULL,
  "properties" jsonb,
  "session_id" text,
  "ip_address" text,
  "user_agent" text,
  "referrer" text,
  "created_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "events_tenant_id_idx" ON "events"("tenant_id");
CREATE INDEX "events_user_id_idx" ON "events"("user_id");
CREATE INDEX "events_event_type_idx" ON "events"("event_type");
CREATE INDEX "events_created_at_idx" ON "events"("created_at");

-- ============================================
-- Enable RLS on new tables
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create RLS Policies
-- ============================================

-- Subscription policies
CREATE POLICY "subscriptions_tenant_isolation" ON subscriptions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Invoice policies
CREATE POLICY "invoices_tenant_isolation" ON invoices
  FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Payment policies
CREATE POLICY "payments_tenant_isolation" ON payments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Payment method policies
CREATE POLICY "payment_methods_tenant_isolation" ON payment_methods
  FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Notification policies (user can see their own)
CREATE POLICY "notifications_user_isolation" ON notifications
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND
    user_id = current_setting('app.current_user', true)::uuid
  );

CREATE POLICY "notifications_tenant_admin" ON notifications
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND
    current_setting('app.user_role', true) IN ('OWNER', 'ADMIN')
  );

-- Notification preferences
CREATE POLICY "notification_preferences_user_isolation" ON notification_preferences
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND
    user_id = current_setting('app.current_user', true)::uuid
  );

-- Events policies
CREATE POLICY "events_tenant_isolation" ON events
  FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY "events_tenant_admin" ON events
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND
    current_setting('app.user_role', true) IN ('OWNER', 'ADMIN')
  );
