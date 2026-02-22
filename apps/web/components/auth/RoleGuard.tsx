'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Role } from '@saas/shared';
import type { Permission } from '@/lib/permissions';
import {
  hasRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isOwner,
  isAdmin,
} from '@/lib/permissions';

interface RoleGuardProps {
  children: ReactNode;
  // Role-based guards
  role?: Role;
  roles?: Role[];
  // Permission-based guards
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // Default: false (any)
  // Shortcut guards
  requireOwner?: boolean;
  requireAdmin?: boolean;
  // Custom fallback
  fallback?: ReactNode;
  /**
   * Default fallback is an alert component.
   * Set to true to render nothing instead.
   */
  renderNothing?: boolean;
}

/**
 * RoleGuard - Authorization component for protecting UI elements
 *
 * @example
 * // By role
 * <RoleGuard role="OWNER">
 *   <OwnerPanel />
 * </RoleGuard>
 *
 * // By permission
 * <RoleGuard permission="users.create">
 *   <CreateUserButton />
 * </RoleGuard>
 *
 * // By multiple permissions (any)
 * <RoleGuard permissions={['users.update', 'users.delete']}>
 *   <UserActions />
 * </RoleGuard>
 *
 * // By multiple permissions (all)
 * <RoleGuard permissions={['users.update', 'users.delete']} requireAll={true}>
 *   <UserFullActions />
 * </RoleGuard>
 *
 * // With custom fallback
 * <RoleGuard permission="users.delete" fallback={<UpgradePrompt />}>
 *   <DeleteButton />
 * </RoleGuard>
 *
 * // Admin only (OWNER or ADMIN)
 * <RoleGuard requireAdmin>
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  role,
  roles,
  permission,
  permissions,
  requireAll = false,
  requireOwner = false,
  requireAdmin = false,
  fallback,
  renderNothing = false,
}: RoleGuardProps) {
  const { user } = useAuth();

  // Early return if no user
  if (!user) {
    return renderNothing ? null : <AccessDenied message="Please log in to access this feature." />;
  }

  let authorized = true;

  // Check requireOwner first (highest priority)
  if (requireOwner && !isOwner(user)) {
    authorized = false;
  }

  // Check requireAdmin
  if (authorized && requireAdmin && !isAdmin(user)) {
    authorized = false;
  }

  // Check single role
  if (authorized && role && !hasRole(user, role)) {
    authorized = false;
  }

  // Check multiple roles (any)
  if (authorized && roles && roles.length > 0 && !hasAnyPermission(user, roles)) {
    authorized = false;
  }

  // Check single permission
  if (authorized && permission && !hasPermission(user, permission)) {
    authorized = false;
  }

  // Check multiple permissions
  if (authorized && permissions && permissions.length > 0) {
    if (requireAll) {
      authorized = hasAllPermissions(user, permissions);
    } else {
      authorized = hasAnyPermission(user, permissions);
    }
  }

  if (!authorized) {
    if (fallback) return <>{fallback}</>;
    return renderNothing ? null : (
      <AccessDenied message="You don't have permission to access this feature." />
    );
  }

  return <>{children}</>;
}

function AccessDenied({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
