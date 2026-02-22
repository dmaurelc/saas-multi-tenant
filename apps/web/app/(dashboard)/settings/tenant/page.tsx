'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api, type AuthUser } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Building, Upload, Check, Palette, Loader2 } from 'lucide-react';

const tenantSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  logo: z.string().url('Invalid URL').optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
});

type TenantSettingsFormData = z.infer<typeof tenantSettingsSchema>;

export default function TenantSettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tenant, setTenant] = useState<AuthUser['tenant'] | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<TenantSettingsFormData>({
    resolver: zodResolver(tenantSettingsSchema),
  });

  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');
  const logo = watch('logo');

  // Fetch current tenant data
  useEffect(() => {
    if (user?.tenant) {
      setTenant(user.tenant);
      setValue('name', user.tenant.name);
      setValue('logo', user.tenant.logo || '');
      setValue('primaryColor', user.tenant.primaryColor || '#3b82f6');
      setValue('secondaryColor', user.tenant.secondaryColor || '#8b5cf6');
    }
  }, [user, setValue]);

  const onSubmit = async (data: TenantSettingsFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/${tenant?.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tenant');
      }

      const result = await response.json();
      setTenant(result.data);
      setSuccess(true);

      // Update user in AuthContext
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...user,
          tenant: result.data,
        })
      );

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Tenant Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Branding Section */}
        <RoleGuard permission="tenants.branding">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>Customize your organization's appearance</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500 text-green-700 bg-green-50">
                    <Check className="h-4 w-4" />
                    <AlertDescription>Tenant settings updated successfully!</AlertDescription>
                  </Alert>
                )}

                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    placeholder="My Organization"
                    {...register('name')}
                    error={errors.name?.message}
                  />
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    {...register('logo')}
                    error={errors.logo?.message}
                  />
                  {logo && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                      <img
                        src={logo}
                        alt="Logo preview"
                        className="h-16 max-w-xs object-contain border rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Color Picker */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        className="h-10 w-16"
                        {...register('primaryColor')}
                      />
                      <Input
                        type="text"
                        placeholder="#3b82f6"
                        {...register('primaryColor')}
                        error={errors.primaryColor?.message}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        className="h-10 w-16"
                        {...register('secondaryColor')}
                      />
                      <Input
                        type="text"
                        placeholder="#8b5cf6"
                        {...register('secondaryColor')}
                        error={errors.secondaryColor?.message}
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                {(primaryColor || secondaryColor) && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-3">Preview:</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building
                          className="h-5 w-5"
                          style={{ color: primaryColor || '#3b82f6' }}
                        />
                        <span className="font-semibold">{tenant.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          style={{
                            backgroundColor: primaryColor || '#3b82f6',
                            color: 'white',
                          }}
                        >
                          Primary Button
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          style={{
                            borderColor: secondaryColor || '#8b5cf6',
                            color: secondaryColor || '#8b5cf6',
                          }}
                        >
                          Secondary Button
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </RoleGuard>

        {/* Save Button */}
        <RoleGuard permission="tenants.update">
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              isLoading={isLoading || isSubmitting}
              disabled={!tenant}
            >
              <Upload className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </RoleGuard>
      </main>
    </div>
  );
}
