'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Building, Users, CreditCard } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd>{user?.name || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd>{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                  <dd className="capitalize">{user?.role?.toLowerCase()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Tenant Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd>{user?.tenant?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Slug</dt>
                  <dd className="font-mono text-sm">{user?.tenant?.slug}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Plan</dt>
                  <dd className="capitalize">{user?.tenant?.plan?.toLowerCase() || 'Free'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Quick Actions Card - Role Adapted */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Manage Users - OWNER and ADMIN only */}
                <RoleGuard permission="users.create" renderNothing>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </RoleGuard>

                {/* Organization Settings - OWNER and ADMIN only */}
                <RoleGuard permission="tenants.update" renderNothing>
                  <Button variant="outline" className="w-full justify-start">
                    <Building className="h-4 w-4 mr-2" />
                    Organization Settings
                  </Button>
                </RoleGuard>

                {/* Billing - OWNER only */}
                <RoleGuard permission="subscription.update" renderNothing>
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </Button>
                </RoleGuard>

                {/* No actions available for STAFF or CUSTOMER */}
                <RoleGuard
                  permissions={['users.create', 'tenants.update', 'subscription.update']}
                  requireAll={false}
                  fallback={
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No quick actions available for your role.
                    </p>
                  }
                >
                  {/* This content will never be shown, fallback is shown instead */}
                </RoleGuard>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Welcome to your Dashboard! 🎉</h2>
              <p className="text-muted-foreground">
                Your multi-tenant SaaS platform is ready. This is Sprint 1 focusing on
                authentication. More features coming soon!
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
