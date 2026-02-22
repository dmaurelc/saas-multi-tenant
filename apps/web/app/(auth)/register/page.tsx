'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/contexts/AuthContext';
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
import Link from 'next/link';

const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    name: z.string().min(1, 'Name is required').optional(),
    tenantName: z.string().min(1, 'Organization name is required'),
    tenantSlug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Auto-generate slug from tenant name
  const tenantName = watch('tenantName');
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Redirect if already authenticated
  if (isAuthenticated && !authLoading) {
    router.push('/dashboard');
    return null;
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        tenantSlug: data.tenantSlug,
        tenantName: data.tenantName,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to create your account and organization
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Organization Info */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-medium">Organization Details</h3>

              <div className="space-y-2">
                <Label htmlFor="tenantName">Organization Name</Label>
                <Input
                  id="tenantName"
                  placeholder="Acme Corporation"
                  {...register('tenantName')}
                  error={errors.tenantName?.message}
                  onChange={(e) => {
                    register('tenantName').onChange(e);
                    const slug = generateSlug(e.target.value);
                    // Update slug field if it hasn't been manually edited
                    const slugInput = document.getElementById('tenantSlug') as HTMLInputElement;
                    if (slugInput && !slugInput.dataset.manuallyEdited) {
                      slugInput.value = slug;
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Organization Slug</Label>
                <Input
                  id="tenantSlug"
                  placeholder="acme-corporation"
                  {...register('tenantSlug')}
                  error={errors.tenantSlug?.message}
                  onChange={(e) => {
                    // Mark as manually edited
                    const target = e.target as HTMLInputElement;
                    target.dataset.manuallyEdited = 'true';
                    register('tenantSlug').onChange(e);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  This will be your unique organization identifier
                </p>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Account Details</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register('name')}
                  error={errors.name?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  {...register('password')}
                  error={errors.password?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
