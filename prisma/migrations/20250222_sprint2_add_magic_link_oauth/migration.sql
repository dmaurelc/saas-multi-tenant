-- Sprint 2 Migration: Magic Link and OAuth
-- Drop existing RLS policies temporarily
DROP POLICY IF EXISTS "audit_logs_isolation" ON "audit_logs";
DROP POLICY IF EXISTS "users_isolation" ON "users";
DROP POLICY IF EXISTS "sessions_isolation" ON "sessions";

-- Add permissions column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" JSONB;

-- Create OAuthProvider enum (must be done before using it)
DO $$ BEGIN
    CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create magic_links table
CREATE TABLE IF NOT EXISTS "magic_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenant_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- Create indexes for magic_links
CREATE INDEX IF NOT EXISTS "magic_links_token_idx" ON "magic_links"("token");
CREATE INDEX IF NOT EXISTS "magic_links_email_idx" ON "magic_links"("email");
CREATE INDEX IF NOT EXISTS "magic_links_expires_at_idx" ON "magic_links"("expires_at");

-- Add foreign key for magic_links
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create oauth_accounts table
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- Create indexes for oauth_accounts
CREATE INDEX IF NOT EXISTS "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "oauth_accounts_provider_idx" ON "oauth_accounts"("provider");

-- Add foreign key for oauth_accounts
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraint for oauth_accounts
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- Recreate RLS policies
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_isolation" ON "audit_logs"
    FOR ALL
    TO public
    USING (true)
    WITH CHECK ("tenant_id"::TEXT = current_setting('app.current_tenant', true)::TEXT);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_isolation" ON "users"
    FOR ALL
    TO public
    USING (true)
    WITH CHECK ("tenant_id"::TEXT = current_setting('app.current_tenant', true)::TEXT);

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_isolation" ON "sessions"
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (EXISTS (
        SELECT 1 FROM "users" WHERE "users"."id" = "sessions"."user_id"
        AND "users"."tenant_id"::TEXT = current_setting('app.current_tenant', true)::TEXT
    ));
