// Frontend Permission Utilities for Multi-Tenant SaaS
// Mirror of backend permission system for client-side authorization

import type { Role } from '@saas/shared';
import type { AuthUser } from './api/client';

// Re-export permission types from backend for consistency
export type Permission = string;
export type PermissionScope = 'all' | 'tenant' | 'own';

// Permission definitions (should match backend)
export const Permissions = {
  // User Management
  'users.create': 'Create users',
  'users.read': 'View users',
  'users.update': 'Update users',
  'users.delete': 'Delete users',
  'users.invite': 'Invite users',

  // Tenant Management
  'tenants.read': 'View tenant details',
  'tenants.update': 'Update tenant settings',
  'tenants.branding': 'Manage branding',
  'tenants.domain': 'Manage custom domains',

  // Subscription & Billing
  'subscription.read': 'View subscription',
  'subscription.update': 'Manage subscription',
  'subscription.cancel': 'Cancel subscription',

  // Content/Data
  'content.create': 'Create content',
  'content.read': 'View content',
  'content.update': 'Update content',
  'content.delete': 'Delete content',

  // Reports & Analytics
  'reports.view': 'View reports',
  'reports.export': 'Export reports',

  // Settings
  'settings.manage': 'Manage settings',

  // Audit Logs
  'audit.read': 'View audit logs',
} as const;

// Role permissions configuration (should match backend)
export const RolePermissions: Record<string, Permission[]> = {
  OWNER: [
    // Full access - everything
    ...Object.keys(Permissions),
  ],
  ADMIN: [
    // Almost full access except subscription management
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'users.invite',
    'tenants.read',
    'tenants.update',
    'tenants.branding',
    'content.create',
    'content.read',
    'content.update',
    'content.delete',
    'reports.view',
    'reports.export',
    'settings.manage',
    'audit.read',
  ],
  STAFF: [
    // Limited access
    'users.read',
    'tenants.read',
    'content.create',
    'content.read',
    'content.update',
    'reports.view',
  ],
  CUSTOMER: [
    // End customer access
    'content.read',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = RolePermissions[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has a specific permission
 * Checks both role permissions and custom user permissions
 */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;

  // Check role permissions first
  if (roleHasPermission(user.role, permission)) {
    return true;
  }

  // Note: Custom user permissions would be in user.permissions if implemented
  // For now, we rely on role-based permissions
  return false;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some((perm) => hasPermission(user, perm));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(user: AuthUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every((perm) => hasPermission(user, perm));
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: Role): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user has ANY of the specified roles
 */
export function hasAnyRole(user: AuthUser | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as Role);
}

/**
 * Check if user is OWNER
 */
export function isOwner(user: AuthUser | null): boolean {
  return hasRole(user, 'OWNER');
}

/**
 * Check if user is OWNER or ADMIN
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasAnyRole(user, ['OWNER', 'ADMIN']);
}

/**
 * Check if user is OWNER, ADMIN, or STAFF
 */
export function isStaff(user: AuthUser | null): boolean {
  return hasAnyRole(user, ['OWNER', 'ADMIN', 'STAFF']);
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: AuthUser | null): Permission[] {
  if (!user) return [];
  return RolePermissions[user.role] || [];
}
