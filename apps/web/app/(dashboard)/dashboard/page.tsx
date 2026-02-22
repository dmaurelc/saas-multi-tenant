'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LogOut,
  User,
  Building,
  Users,
  CreditCard,
  Activity,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { apiClient } from '@/lib/api/client';

interface DashboardData {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    recentEvents: number;
    currentPlan: string;
    planDistribution?: Record<string, number>;
  };
  activity: {
    users: Array<{ date: string; count: number }>;
    events: Array<{ date: string; count: number }>;
    payments?: Array<{ date: string; amount: number }>;
  };
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError(null);
        const [kpisRes, activityRes] = await Promise.all([
          apiClient.get<{ data: DashboardData['kpis'] }>('/api/v1/metrics/kpis'),
          apiClient.get<{ data: DashboardData['activity'] }>('/api/v1/metrics/activity'),
        ]);

        setData({
          kpis: kpisRes.data,
          activity: activityRes.data,
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {user?.tenant?.name} • Plan {data?.kpis.currentPlan || 'FREE'}
            </p>
          </div>
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
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardContent className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Users"
            value={data?.kpis.totalUsers || 0}
            icon={Users}
            loading={loading}
          />
          <KPICard
            title="Active Users"
            value={data?.kpis.activeUsers || 0}
            icon={User}
            loading={loading}
          />
          <KPICard
            title="Revenue"
            value={formatCurrency(data?.kpis.totalRevenue || 0)}
            icon={DollarSign}
            loading={loading}
          />
          <KPICard
            title="Events (30d)"
            value={data?.kpis.recentEvents || 0}
            icon={Calendar}
            loading={loading}
          />
        </div>

        {/* Activity Chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity (Last 30 Days)
            </CardTitle>
            <CardDescription>User registrations and events</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={data?.activity} loading={loading} />
          </CardContent>
        </Card>

        {/* User & Tenant Info Cards */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
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
                  <dd className="capitalize">{data?.kpis.currentPlan?.toLowerCase() || 'Free'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Card - Role Adapted */}
        <Card className="mt-6">
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
                  Billing & Subscription
                </Button>
              </RoleGuard>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Welcome to your Dashboard! 🎉</h2>
              <p className="text-muted-foreground">
                Your multi-tenant SaaS platform is ready with Sprint 5 features. Dashboard,
                Payments, Notifications, and Metrics are now available!
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
