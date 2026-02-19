# Blueprint Base - SaaS Multi-Tenant

## Visión General

Este documento define la arquitectura base del proyecto SaaS Multi-Tenant, incluyendo la estructura del monorepo, stack tecnológico, patrones de diseño y flujos de validación.

---

## Estructura del Monorepo

```
saas-multi-tenant/
├── apps/
│   ├── web/                 # Next.js 16 - Frontend tenant
│   │   ├── app/             # App Router
│   │   │   ├── (auth)/      # Login, Register, Magic Link
│   │   │   ├── (dashboard)/ # Dashboard protegido
│   │   │   ├── (public)/    # Páginas públicas (catálogo, etc.)
│   │   │   └── api/         # API Routes
│   │   ├── components/      # Componentes React
│   │   ├── lib/             # Utilidades y helpers
│   │   └── styles/          # Tailwind CSS
│   │
│   ├── api/                 # Backend API (Hono/Next.js)
│   │   ├── routes/          # Endpoints organizados por módulo
│   │   │   ├── auth.ts
│   │   │   ├── tenants.ts
│   │   │   ├── users.ts
│   │   │   ├── payments.ts
│   │   │   └── ...
│   │   ├── middleware/      # Auth, tenant resolution, logging
│   │   └── lib/             # Lógica de negocio
│   │
│   └── admin/               # Panel admin plataforma
│       └── ...              # Solo para platform_admin
│
├── packages/
│   ├── shared/              # Tipos, utilidades, constantes
│   │   ├── types/           # TypeScript types compartidos
│   │   ├── constants/       # Constantes globales
│   │   └── utils/           # Utilidades puras
│   │
│   ├── ui/                  # Componentes UI (shadcn/ui)
│   │   ├── components/      # Button, Input, Modal, etc.
│   │   └── styles/          # Estilos base
│   │
│   ├── database/            # Schema, migraciones, RLS
│   │   ├── schema/          # Prisma schema definitions
│   │   ├── migrations/      # SQL migrations
│   │   ├── rls/             # Row Level Security policies
│   │   └── seeds/           # Seed data
│   │
│   └── payments/            # Lógica de pagos multi-pasarela
│       ├── providers/       # Stripe, Transbank, MercadoPago, Flow
│       ├── types/           # Interfaces compartidas
│       └── utils/           # Helpers de pagos
│
├── docs/
│   ├── planning/            # Roadmap y planificación
│   ├── architecture/        # Documentación técnica
│   ├── agents/              # Definición de agentes IA
│   └── users/               # Usuarios sintéticos
│
├── tools/
│   ├── scripts/             # Scripts de utilidad
│   └── generators/          # Generadores de código
│
├── turbo.json               # Configuración Turborepo
├── pnpm-workspace.yaml      # Configuración workspaces
├── package.json             # Dependencies raíz
└── .env.example             # Variables de entorno template
```

---

## Stack por Capa

| Capa | Tecnologías | Justificación |
|------|-------------|---------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui | App Router, SSR, DX excelente |
| **Backend** | Next.js API Routes / Hono | Edge-ready, TypeScript nativo |
| **Base de datos** | Neon (PostgreSQL), Prisma ORM | Serverless, RLS, type-safe |
| **Auth** | JWT + RLS, bcrypt | Simple, stateless, seguro |
| **Pagos** | Stripe SDK, Transbank SDK, MercadoPago SDK, Flow API | Cobertura global + Chile |
| **Deployment** | Dokploy, Docker | Self-hosted, control total |
| **Testing** | Vitest, Playwright | Rápido, E2E completo |
| **Monorepo** | pnpm workspaces, Turborepo | Cache, paralelización |

---

## Patrones de Arquitectura

### 1. Multi-tenant Resolution

El sistema detecta el tenant actual mediante tres métodos:

```typescript
// middleware/tenant.ts
export async function resolveTenant(request: Request): Promise<Tenant> {
  const host = request.headers.get('host');

  // 1. Subdomain: tenant.saas.com
  const subdomain = extractSubdomain(host);
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    return await getTenantBySlug(subdomain);
  }

  // 2. Custom domain: cliente.com
  const tenant = await getTenantByCustomDomain(host);
  if (tenant) return tenant;

  // 3. Header: X-Tenant-ID (para API)
  const tenantId = request.headers.get('x-tenant-id');
  if (tenantId) {
    return await getTenantById(tenantId);
  }

  throw new TenantNotFoundError();
}
```

### 2. Row Level Security (RLS)

Cada tabla tiene una policy que aísla datos por tenant:

```sql
-- Habilitar RLS en tabla
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy por defecto
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Excepciones para platform_admin
CREATE POLICY platform_admin_access ON products
  USING (
    current_setting('app.user_role', true) = 'platform_admin'
  );
```

Set del tenant en cada request:

```typescript
// middleware/rls.ts
export async function setTenantContext(tenantId: string, userId: string) {
  await db.execute(sql`
    SET app.current_tenant = ${tenantId};
    SET app.current_user = ${userId};
  `);
}
```

### 3. Payments Strategy Pattern

Abstracción para múltiples pasarelas de pago:

```typescript
// packages/payments/types.ts
interface PaymentProvider {
  name: string;
  createSubscription(data: SubscriptionData): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  handleWebhook(event: WebhookEvent): Promise<WebhookResult>;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;
}

// packages/payments/providers/stripe.ts
class StripeProvider implements PaymentProvider {
  name = 'stripe';
  // ... implementación
}

// packages/payments/providers/transbank.ts
class TransbankProvider implements PaymentProvider {
  name = 'transbank';
  // ... implementación
}

// packages/payments/index.ts
class PaymentService {
  private providers: Map<string, PaymentProvider>;

  getProvider(name: string): PaymentProvider {
    return this.providers.get(name);
  }
}
```

### 4. Repository Pattern

Abstracción de acceso a datos:

```typescript
// packages/database/repositories/base.ts
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findByTenant(tenantId: string, filters?: Filters): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// packages/database/repositories/products.ts
class ProductRepository implements Repository<Product> {
  // Implementación con Prisma
}
```

---

## Flujo de Validación por Sprint

### Arquitectura de Testing

```
┌─────────────────────────────────────────────────────────────┐
│                    SUB-AGENTE DE TESTING                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Ejecutar tests unitarios (Vitest)                       │
│     ├─ Coverage > 80%                                       │
│     └─ Todos los tests passing                              │
│                                                             │
│  2. Ejecutar tests de integración (API)                     │
│     ├─ Endpoints CRUD                                       │
│     ├─ Auth flows                                           │
│     └─ Webhooks                                             │
│                                                             │
│  3. Ejecutar tests E2E (Playwright)                         │
│     ├─ Flujos críticos de usuario                           │
│     └─ Cross-browser testing                                │
│                                                             │
│  4. Cargar usuarios sintéticos                              │
│     └─ Desde /docs/users/synthetic_users.json              │
│                                                             │
│  5. Ejecutar escenarios de testing:                         │
│     ├─ Login como cada rol                                  │
│     ├─ Verificar permisos                                   │
│     ├─ Verificar aislamiento RLS                            │
│     ├─ Verificar límites de plan                            │
│     └─ Verificar flujos de pago                             │
│                                                             │
│  6. Generar reporte de cobertura                            │
│                                                             │
│  7. Si todo OK → Marcar sprint como "ready for release"     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Checklist de Validación

| Criterio | Requisito | Herramienta |
|----------|-----------|-------------|
| Tests unitarios | Coverage > 80% | Vitest + c8 |
| Tests E2E | 100% passing | Playwright |
| RLS | Aislamiento verificado | Tests específicos |
| Performance | p95 < 500ms | Lighthouse + custom |
| Seguridad | Sin vulnerabilidades críticas | npm audit, Snyk |
| Consola | Sin errores | Playwright |
| Docs | Actualizada | Review manual |

### Comando de Validación

```bash
# Ejecutar validación completa
pnpm validate:sprint 5

# Esto ejecuta:
# 1. pnpm test:unit --coverage
# 2. pnpm test:e2e
# 3. pnpm test:rls
# 4. pnpm test:performance
# 5. pnpm audit
# 6. Generar reporte
```

---

## Configuración de Entorno

### Variables de Entorno

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Auth
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="7d"

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Payments - Stripe
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Payments - Chile
TRANSBANK_COMMERCE_CODE=""
TRANSBANK_API_KEY=""
TRANSBANK_ENVIRONMENT="integration"

# Email
RESEND_API_KEY=""
EMAIL_FROM="noreply@saas.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="SaaS Multi-Tenant"
```

### Scripts NPM

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "validate:sprint": "tsx tools/scripts/validate-sprint.ts"
  }
}
```

---

## Estructura de Base de Datos

### Tablas Core

```sql
-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  vertical VARCHAR(50),
  custom_domain VARCHAR(255) UNIQUE,
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  preferences JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) UNIQUE,
  provider VARCHAR(50) NOT NULL,
  provider_subscription_id VARCHAR(255),
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events (Analytics)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices

```sql
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

---

## Deployment

### Dockerfile Base

```dockerfile
# apps/web/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web
COPY packages ./packages

# Build
RUN pnpm --filter web build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

### Dokploy Configuration

```yaml
# dokploy.yaml
version: "3"
services:
  saas-web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      # ... otras variables
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Monitoreo y Logging

### Estructura de Logs

```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  tenant_id?: string;
  user_id?: string;
  message: string;
  metadata?: Record<string, unknown>;
  request_id?: string;
}
```

### Métricas a Capturar

- Response time (p50, p95, p99)
- Request rate por tenant
- Error rate
- Database query time
- Cache hit rate
- Active users por tenant

---

## Seguridad

### Checklist

- [ ] RLS habilitado en todas las tablas con tenant_id
- [ ] Validación de input en todos los endpoints
- [ ] Rate limiting por IP y por tenant
- [ ] CSRF protection
- [ ] Headers de seguridad (HSTS, CSP, X-Frame-Options)
- [ ] Sanitización de HTML en inputs
- [ ] Validación de tipos de archivo en uploads
- [ ] Encriptación de datos sensibles
- [ ] Logs de auditoría para acciones críticas
- [ ] Rotación de secrets

### Headers de Seguridad

```typescript
// middleware/security.ts
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
};
```
