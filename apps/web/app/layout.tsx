import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'SaaS Multi-Tenant',
  description: 'Plataforma SaaS multi-tenant con arquitectura modular',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
