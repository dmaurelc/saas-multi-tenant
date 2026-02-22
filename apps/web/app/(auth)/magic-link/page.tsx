'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantSlug: z.string().optional(),
});

type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, requestMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  // Check for OAuth callback
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth');
    if (oauthSuccess === 'success') {
      // OAuth login successful, redirect to dashboard after brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    }
  }, [searchParams, router]);

  const onSubmit = async (data: MagicLinkFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await requestMagicLink(data.email, data.tenantSlug);
      setSuccess(true);
      setEmailSentTo(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Mail className="h-6 w-6" />
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We sent a magic link to {emailSentTo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Click the link in the email to sign in. The link expires in 15 minutes.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmailSentTo('');
                }}
                className="text-primary hover:underline"
              >
                try again
              </button>
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              ← Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Mail className="h-6 w-6" />
            Magic Link Login
          </CardTitle>
          <CardDescription className="text-center">
            Sign in without a password using your email
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              We&apos;ll send you a link to sign in instantly. No password needed.
            </p>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send Magic Link
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in with email & password
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
