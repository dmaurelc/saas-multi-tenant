'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { type Role } from '@saas/shared';

interface InvitationData {
  id: string;
  email: string;
  role: Role;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string | null;
  };
  invitedBy: {
    name: string | null;
    email: string;
  };
}

const roleLabels: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  CUSTOMER: 'Customer',
};

function InviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const verifyInvitation = async () => {
      try {
        const response = await apiClient.get<{ data: InvitationData }>(
          `/api/v1/invitations/${token}`
        );
        setInvitation(response.data);
        setName(response.data.email.split('@')[0]);
      } catch (err: any) {
        setError(err.message || 'Failed to verify invitation');
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!invitation) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        message: string;
        data: {
          user: { id: string; email: string; name: string; role: Role };
          accessToken: string;
          refreshToken: string;
        };
      }>(`/api/v1/invitations/${token}/accept`, {
        name,
        password,
      });

      // Login the user - store tokens and fetch user data
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Refresh user from server to get full user data with tenant
      await refreshUser();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setVerifying(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Verifying invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
            style={{
              background: invitation.tenant.primaryColor
                ? `linear-gradient(135deg, ${invitation.tenant.primaryColor}, ${invitation.tenant.primaryColor}80)`
                : 'linear-gradient(135deg, rgb(59 130 246), rgb(147 51 234))',
            }}
          >
            {invitation.tenant.name.charAt(0).toUpperCase()}
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            Join <strong>{invitation.tenant.name}</strong> as a{' '}
            <strong>{roleLabels[invitation.role]}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>{invitation.invitedBy.name || invitation.invitedBy.email}</strong> invited you
              to join <strong>{invitation.tenant.name}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={invitation.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleAccept}
            disabled={verifying || !name || !password || password !== confirmPassword}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            By accepting, you agree to join {invitation.tenant.name}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <InviteForm />
    </Suspense>
  );
}
