// Permission System for Multi-Tenant SaaS
// Defines permissions for each role and provides helper functions

export type Permission = string;
export type PermissionScope = 'all' | 'tenant' | 'own';

// ============================================
// Permission Definitions
// ============================================

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

// ============================================
// Role Permissions Configuration
// ============================================

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

// ============================================
// Permission Helper Functions
// ============================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = RolePermissions[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has a specific permission
 * Checks both role permissions and custom user permissions
 */
export function hasPermission(
  userRole: string,
  userPermissions: string[] | null,
  permission: Permission
): boolean {
  // Check role permissions first
  if (roleHasPermission(userRole, permission)) {
    return true;
  }

  // Check custom user permissions
  if (userPermissions && Array.isArray(userPermissions)) {
    return userPermissions.includes(permission);
  }

  return false;
}

/**
 * Check if a user has ANY of the specified permissions
 */
export function hasAnyPermission(
  userRole: string,
  userPermissions: string[] | null,
  permissions: Permission[]
): boolean {
  return permissions.some((perm) => hasPermission(userRole, userPermissions, perm));
}

/**
 * Check if a user has ALL of the specified permissions
 */
export function hasAllPermissions(
  userRole: string,
  userPermissions: string[] | null,
  permissions: Permission[]
): boolean {
  return permissions.every((perm) => hasPermission(userRole, userPermissions, perm));
}

/**
 * Get all permissions for a user (role + custom)
 */
export function getUserPermissions(
  userRole: string,
  userPermissions: string[] | null
): Permission[] {
  const rolePerms = RolePermissions[userRole] || [];
  const customPerms = (userPermissions || []) as Permission[];

  // Combine and deduplicate
  return Array.from(new Set([...rolePerms, ...customPerms]));
}

/**
 * Filter resources based on ownership scope
 */
export function filterByScope<T extends { userId?: string; tenantId?: string }>(
  resources: T[],
  userId: string,
  tenantId: string,
  scope: PermissionScope
): T[] {
  switch (scope) {
    case 'all':
      return resources;
    case 'tenant':
      return resources.filter((r) => r.tenantId === tenantId);
    case 'own':
      return resources.filter((r) => r.userId === userId);
    default:
      return resources;
  }
}

/**
 * Get scope for a permission based on role
 */
export function getPermissionScope(role: string, permission: Permission): PermissionScope {
  // OWNER and ADMIN can access tenant-wide
  if (role === 'OWNER' || role === 'ADMIN') {
    return 'tenant';
  }

  // STAFF can only access their own resources by default
  if (role === 'STAFF') {
    return 'own';
  }

  // CUSTOMER can only read their own
  return 'own';
}
