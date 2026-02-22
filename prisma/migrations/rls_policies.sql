-- RLS (Row Level Security) Policies for Multi-Tenant Isolation
-- Run this migration after the base schema is created

-- ============================================
-- Enable RLS on all multi-tenant tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Users Table Policies
-- ============================================

-- Users can only see users in their own tenant
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Platform admins can see all users
CREATE POLICY "users_platform_admin" ON users
  FOR ALL
  USING (
    current_setting('app.user_role', true) = 'PLATFORM_ADMIN'
  );

-- ============================================
-- Sessions Table Policies
-- ============================================

-- Users can only see their own sessions
CREATE POLICY "sessions_user_isolation" ON sessions
  FOR ALL
  USING (
    user_id = current_setting('app.current_user', true)::uuid
  );

-- Platform admins can see all sessions
CREATE POLICY "sessions_platform_admin" ON sessions
  FOR ALL
  USING (
    current_setting('app.user_role', true) = 'PLATFORM_ADMIN'
  );

-- ============================================
-- Audit Logs Table Policies
-- ============================================

-- Users can only see audit logs in their own tenant
CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Platform admins can see all audit logs
CREATE POLICY "audit_logs_platform_admin" ON audit_logs
  FOR ALL
  USING (
    current_setting('app.user_role', true) = 'PLATFORM_ADMIN'
  );

-- ============================================
-- Tenants Table Policies
-- ============================================

-- Users can see their own tenant
CREATE POLICY "tenants_isolation" ON tenants
  FOR SELECT
  USING (
    id = current_setting('app.current_tenant', true)::uuid
  );

-- Platform admins can see all tenants
CREATE POLICY "tenants_platform_admin" ON tenants
  FOR ALL
  USING (
    current_setting('app.user_role', true) = 'PLATFORM_ADMIN'
  );

-- ============================================
-- Verification Queries
-- ============================================

-- Run these to verify RLS is configured correctly:
--
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies WHERE schemaname = 'public';
