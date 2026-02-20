// Shared types and utilities for SaaS Multi-Tenant

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
}

export type Plan = Tenant['plan'];
export type Role = User['role'];
