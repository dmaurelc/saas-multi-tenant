# Project Roadmap - SaaS Multi-Tenant

## Overview

Este roadmap cubre el desarrollo completo del proyecto SaaS Multi-Tenant en **24 sprints**, organizados en 3 capas:

1. **Core SaaS** (Sprints 0-5): Auth, Tenants, Usuarios, Dashboard, Pagos, Notificaciones, Métricas
2. **Multi-Vertical** (Sprints 6-21): eCommerce, SaaS Servicios, Inmobiliario, Restaurantes
3. **Enterprise** (Sprints 22-24): SSO, Webhooks, API Pública, Multi-tenant Jerárquico

## Flujo de Releases

```
feature/sprint-X-* → sprint/X → develop (testing) → release/vX.X.X → main
```

---

## SPRINT 0: Setup Inicial

**Rama:** `sprint/0-setup`
**Versión:** `v0.1.0-alpha.1`
**Dependencias:** Ninguna

### Tareas

#### Infraestructura

- [x] Inicializar monorepo (pnpm workspaces + Turborepo)
- [x] Configurar estructura de carpetas (apps/, packages/, docs/, tools/)
- [x] Crear `.gitignore` para Nod1e.js/Next.js
- [x] Inicializar repositorio Git

#### Base de Datos

- [x] Crear proyecto en Neon
- [x] Configurar conexión desde apps/api
- [x] Crear esquemas iniciales (tenants, users)
- [x] Configurar RLS básico

#### CI/CD

- [x] Configurar GitHub Actions
- [x] Workflow para tests
- [x] Workflow para lint
- [x] Branch protection rules

#### Calidad de Código

- [x] Configurar ESLint
- [x] Configurar Prettier
- [x] Configurar Husky hooks
- [x] Configurar Commitlint

### Criterios de Aceptación

- [x] Monorepo funcional con pnpm workspaces
- [x] Conexión a Neon exitosa
- [x] CI/CD ejecutándose en develop
- [x] Conventional Commits validados
- [x] Git flow configurado (main, develop, branch protection)

---

## SPRINT 1: Autenticación Base

**Rama:** `sprint/1-auth`
**Versión:** `v0.2.0-alpha.1`
**Dependencias:** Sprint 0

### Tareas Backend

- [x] Crear `apps/api/routes/auth`
- [x] Registro con email/password
- [x] Login con JWT (incluye tenant_id)
- [x] Middleware de autenticación multi-tenant
- [x] Logout con invalidación de tokens

### Tareas RLS

- [x] Configurar `set_config('app.current_tenant', tenant_id)`
- [x] Tests de aislamiento entre tenants

### Tareas Frontend

- [x] Crear `apps/web/app/(auth)/login`
- [x] Crear `apps/web/app/(auth)/register`
- [x] AuthContext y `useAuth()`
- [x] Protected routes

### Criterios de Aceptación

- [x] Usuario puede registrarse en un tenant
- [x] Login genera token válido con tenant_id
- [x] RLS aísla datos entre tenants
- [x] Logout invalida token correctamente

---

## SPRINT 2: Auth Avanzado + Roles ✅ COMPLETADO

**Rama:** `sprint/2-auth-advanced`
**Versión:** `v0.3.0-alpha.1`
**Dependencias:** Sprint 1

### Tareas Magic Link

- [x] Generar token único para magic link
- [/] Enviar email con link (TODO implementado)
- [x] Validar token y crear sesión
- [x] Expiración de token (15 min)

### Tareas OAuth

- [/] Configurar Google OAuth (código listo, falta credentials)
- [/] Configurar GitHub OAuth (código listo, falta credentials)
- [/] Flujo OAuth callback (implementado, requiere dominio para producción)
- [x] Multi-tenant con OAuth (oauth_accounts table)

### Tareas Roles

- [x] Definir roles: owner, admin, staff, customer
- [x] Tabla roles con permisos JSON (users.permissions)
- [x] `hasPermission()` helper
- [x] Middleware de autorización

### Tareas Frontend

- [x] Componente `<RoleGuard>`
- [x] UI adaptada al rol
- [x] Página de Magic Link login
- [x] Botones OAuth en login (Google + GitHub)

### Criterios de Aceptación

- [/] Magic link funcional (código completo, falta configurar email service)
- [/] OAuth funcional (código completo, falta configurar credentials + dominio)
- [x] Roles asignados correctamente
- [x] Permisos verificados en cada acción

### Tareas Pendientes - Requieren Configuración Externa

> Estas tareas están implementadas a nivel código pero requieren configuración externa para funcionar en producción.

| Tarea                   | Estado Código | Estado Producción | Requisitos                                                                                                                                       |
| ----------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **OAuth Google**        | ✅ Completo   | ⏳ Pendiente      | - Crear OAuth 2.0 Client en Google Cloud Console<br>- Configurar redirect URIs<br>- Agregar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` a `.env` |
| **OAuth GitHub**        | ✅ Completo   | ⏳ Pendiente      | - Crear OAuth App en GitHub Developer Settings<br>- Configurar callback URL<br>- Agregar `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` a `.env`    |
| **Magic Link Email**    | ✅ Completo   | ⏳ Pendiente      | - Configurar servicio de email (Resend/SendGrid)<br>- Agregar `RESEND_API_KEY` o `SENDGRID_API_KEY` a `.env`<br>- Configurar email templates     |
| **Custom Domain OAuth** | ⏳ Pendiente  | ⏳ Pendiente      | - Requiere dominio propio configurado<br>- Actualizar redirect URIs en OAuth providers                                                           |

---

## SPRINT 3: Gestión de Tenants ✅ COMPLETADO

**Rama:** `sprint/3-tenants`
**Versión:** `v0.4.0-alpha.1`
**Dependencias:** Sprint 2

### Tareas Backend

- [x] CRUD de tenants
- [x] Branding (logo, colores primarios/secundarios)
- [x] Subdominio automático
- [x] Validación dominio custom

### Tareas Frontend

- [x] Página configuración de tenant
- [x] Formulario branding con preview
- [x] Configuración dominio custom

### Tareas Multi-tenant

- [x] Middleware detección por subdomain
- [x] Middleware detección por custom domain
- [x] Middleware detección por header X-Tenant-ID
- [x] Caching de resolución de tenant

### Criterios de Aceptación

- [x] Tenant actualiza branding correctamente
- [/] Subdominio funciona (tenant.saas.com) - requiere configuración DNS
- [/] Dominio custom verificable - requiere configuración DNS
- [x] Resolución de tenant cacheada

### Tareas Pendientes - Requieren Configuración Externa

> Estas tareas están implementadas a nivel código pero requieren configuración externa para funcionar en producción.

| Tarea                            | Estado Código | Estado Producción | Requisitos                                                                                                                           |
| -------------------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Subdominio (tenant.saas.com)** | ✅ Completo   | ⏳ Pendiente      | - Configurar wildcard DNS en el proveedor<br>- Configurar servidor web para aceptar subdominios<br>- Apuntar \*.saas.com al servidor |
| **Dominio Custom**               | ✅ Completo   | ⏳ Pendiente      | - Usuario debe configurar DNS de su dominio<br>- CNAME o A record apuntando a saas.com<br>- Verificación de dominio configurada      |

---

## SPRINT 4: Gestión de Usuarios ✅ COMPLETADO

**Rama:** `sprint/4-users`
**Versión:** `v0.5.0-alpha.1`
**Dependencias:** Sprint 3

### Tareas Backend

- [x] CRUD usuarios dentro del tenant
- [x] Sistema de invitaciones por email
- [x] Cambio de rol de usuarios
- [x] Auditoría de acciones (audit_logs table)

### Tareas Frontend

- [x] Listado de usuarios con paginación
- [x] Modal crear/editar usuario
- [x] Modal invitación por email
- [/] Historial de actividad (pendiente - endpoint existe, falta UI)

### Tareas Invitaciones

- [x] Tabla `invitations`
- [x] Email template para invitación
- [x] Página aceptar invitación

### Criterios de Aceptación

- [x] Admin crea/edita usuarios del tenant
- [x] Invitaciones funcionan end-to-end
- [x] Logs de auditoría registrados
- [x] Solo usuarios del tenant son visibles

### Tareas Pendientes - Requieren Configuración Externa

> Estas tareas están implementadas a nivel código pero requieren configuración externa para funcionar en producción.

| Tarea                  | Estado Código | Estado Producción | Requisitos                                                                                         |
| ---------------------- | ------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| **Email Invitaciones** | ✅ Completo   | ⏳ Pendiente      | - Configurar servicio de email (Resend/SendGrid)<br>- Configurar email templates para invitaciones |

---

## SPRINT 5: Dashboard + Pagos + Notificaciones + Métricas ✅ COMPLETADO

**Rama:** `sprint/5-core-complete`
**Versión:** `v1.0.0-alpha.1` (CORE COMPLETO)
**Dependencias:** Sprint 4

### Tareas Dashboard

- [x] Endpoint KPIs por tenant
- [x] Frontend dashboard con widgets
- [x] Gráficos de actividad (últimos 30 días)

### Tareas Pagos Stripe

- [x] Configurar Stripe account (código listo, requiere credentials)
- [x] Crear productos y precios en Stripe (configuración en .env)
- [x] Checkout suscripción
- [x] Webhooks Stripe (payment_succeeded, payment_failed)
- [x] Portal de cliente Stripe (base implementada)

### Tareas Pagos Chile

- [x] Transbank Webpay Plus integration
- [x] Transbank Oneclick (suscripciones)
- [x] MercadoPago integration
- [x] Flow integration
- [x] Abstracción Strategy Pattern para pagos

### Tareas Notificaciones

- [x] Tabla `notifications`
- [x] Notificaciones in-app (bell icon)
- [x] Email transactional (Resend - código listo, requiere API key)
- [x] Preferencias de notificación por usuario

### Tareas Métricas

- [x] Tabla `events` para analytics
- [x] Endpoint tracking de eventos
- [x] Dashboard de métricas básicas

### Criterios de Aceptación

- [x] Dashboard muestra KPIs relevantes
- [ ] Stripe checkout funcional (requiere configuración de Stripe)
- [x] Pasarelas chilenas implementadas (requieren credenciales para producción)
- [x] Notificaciones in-app funcionando
- [x] Métricas registrándose en DB

### Tareas Pendientes - Requieren Configuración Externa

> Estas tareas están implementadas a nivel código pero requieren configuración externa para funcionar en producción.

| Tarea                | Estado Código | Estado Producción | Requisitos                                                                                                                                              |
| -------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stripe Checkout**  | ✅ Completo   | ⏳ Pendiente      | - Crear cuenta en Stripe<br>- Configurar products y prices<br>- Agregar `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` a `.env` |
| **Stripe Webhooks**  | ✅ Completo   | ⏳ Pendiente      | - Configurar webhook endpoint en Stripe Dashboard<br>- Agregar `STRIPE_WEBHOOK_SECRET` a `.env`                                                         |
| **Email Service**    | ✅ Completo   | ⏳ Pendiente      | - Crear cuenta en Resend<br>- Agregar `RESEND_API_KEY` y `EMAIL_FROM` a `.env`                                                                          |
| **Transbank Webpay** | ✅ Completo   | ⏳ Pendiente      | - Agregar `TBK_COMMERCE_CODE`, `TBK_API_KEY` a `.env`<br>- Configurar certificación para producción                                                     |
| **MercadoPago**      | ✅ Completo   | ⏳ Pendiente      | - Agregar `MERCADOPAGO_ACCESS_TOKEN` a `.env`<br>- Crear aplicación en MercadoPago Developers                                                           |
| **Flow**             | ✅ Completo   | ⏳ Pendiente      | - Agregar `FLOW_API_KEY`, `FLOW_SECRET` a `.env`<br>- Crear cuenta en Flow                                                                              |

---

## SPRINT 6: eCommerce - Productos ✅ COMPLETADO

**Rama:** `sprint/6-ecommerce-products`
**Versión:** `v1.1.0-alpha.1`
**Dependencias:** Sprint 5

### Tareas

- [x] Modelo datos: `products`, `categories`, `variants`, `product_images`
- [x] CRUD categorías jerárquicas (parent_id)
- [x] CRUD productos con variantes
- [x] Búsqueda full-text con índices GIN
- [x] Admin: gestión productos/categorías
- [x] Public: catálogo y detalle de producto
- [x] RLS para eCommerce
- [x] Tests unitarios para API
- [x] Nuevos permisos: products.*, categories.manage

### Criterios de Aceptación

- [x] CRUD productos completo
- [x] Categorías jerárquicas funcionando
- [x] Catálogo público visible
- [x] Búsqueda retorna resultados relevantes

### Archivos Creados

**Backend:**
- `apps/api/src/routes/products.ts` - API CRUD de productos con variantes e imágenes
- `apps/api/src/routes/categories.ts` - API CRUD de categorías jerárquicas
- `apps/api/src/routes/search.ts` - API de búsqueda full-text
- `apps/api/src/__tests__/products.test.ts` - Tests unitarios

**Frontend Admin:**
- `apps/web/app/(dashboard)/products/page.tsx` - Gestión de productos
- `apps/web/app/(dashboard)/categories/page.tsx` - Gestión de categorías (tree view)

**Frontend Público:**
- `apps/web/app/(store)/products/page.tsx` - Catálogo público con filtros
- `apps/web/app/(store)/products/[slug]/page.tsx` - Detalle de producto

**Base de Datos:**
- `prisma/migrations/20250225_sprint6_add_ecommerce_products/migration.sql` - Migración con RLS y GIN index

**Componentes:**
- `apps/web/components/ui/textarea.tsx` - Componente Textarea

### Notas

- El slug se genera automáticamente desde el nombre (lowercase + guiones)
- Las categorías soportan jerarquía con materialized path
- Los productos pueden tener múltiples variantes (talle, color, etc.)
- Las imágenes pueden estar asociadas a un producto o a una variante específica
- La búsqueda full-text usa PostgreSQL GIN index para mejor rendimiento
- RLS configurado para aislar productos y categorías por tenant

---

## SPRINT 7: eCommerce - Carrito e Inventario

**Rama:** `sprint/7-ecommerce-cart`
**Versión:** `v1.1.0-alpha.2`
**Dependencias:** Sprint 6

### Tareas

- [ ] Tabla `inventory_movements`
- [ ] Stock tracking automático
- [ ] Alertas de stock bajo
- [ ] Tabla `cart_items`
- [ ] Endpoints carrito CRUD
- [ ] Cálculo de totales con impuestos
- [ ] Frontend carrito (sidebar/modal)

### Criterios de Aceptación

- [ ] Stock actualizado automáticamente en cada venta
- [ ] Carrito persiste entre sesiones
- [ ] Cálculos correctos (subtotal, impuestos, total)
- [ ] Alertas de stock bajo visibles en admin

---

## SPRINT 8: eCommerce - Checkout y Órdenes

**Rama:** `sprint/8-ecommerce-orders`
**Versión:** `v1.1.0-alpha.3`
**Dependencias:** Sprint 7

### Tareas

- [ ] Tablas `orders`, `order_items`
- [ ] Proceso checkout multi-step (shipping → payment → confirm)
- [ ] Integración pagos en checkout
- [ ] Estados de orden (pending, paid, shipped, delivered, cancelled)
- [ ] Frontend checkout completo
- [ ] Admin gestión de órdenes

### Criterios de Aceptación

- [ ] Checkout completo funcional
- [ ] Pago integrado con pasarelas
- [ ] Stock actualizado post-pago exitoso
- [ ] Admin puede cambiar estados de orden

---

## SPRINT 9: eCommerce - Envíos, Cupones e Impuestos

**Rama:** `sprint/9-ecommerce-shipping`
**Versión:** `v1.1.0` (ECOMMERCE ESTABLE)
**Dependencias:** Sprint 8

### Tareas

- [ ] Tablas `shipping_methods`, `shipments`
- [ ] Reglas de envío por zona/región
- [ ] Tracking de envío (link externo)
- [ ] Tabla `coupons`
- [ ] Tipos descuento (% y monto fijo)
- [ ] Validación y aplicación de cupones
- [ ] Configuración de impuestos por región

### Criterios de Aceptación

- [ ] Métodos de envío configurables
- [ ] Cupones funcionando (validación y aplicación)
- [ ] Impuestos calculados según región
- [ ] Tracking de envíos visible para cliente

---

## SPRINT 10: SaaS Servicios - Servicios y Reservas

**Rama:** `sprint/10-services-booking`
**Versión:** `v1.2.0-alpha.1`
**Dependencias:** Sprint 5

### Tareas

- [ ] Tablas `services`, `service_categories`
- [ ] CRUD de servicios con duración y precio
- [ ] Tabla `bookings`
- [ ] Disponibilidad por horarios
- [ ] Frontend booking de servicios
- [ ] Confirmación por email

### Criterios de Aceptación

- [ ] Servicios creados con duración y precio
- [ ] Reservas verifican disponibilidad
- [ ] Cliente recibe confirmación

---

## SPRINT 11: SaaS Servicios - Calendario y Staff

**Rama:** `sprint/11-services-calendar`
**Versión:** `v1.2.0-alpha.2`
**Dependencias:** Sprint 10

### Tareas

- [ ] Tabla `staff` con horarios
- [ ] Calendario de disponibilidad
- [ ] Asignación de servicios a staff
- [ ] Vista calendario para admin
- [ ] Vista calendario para clientes

### Criterios de Aceptación

- [ ] Staff tiene horarios configurables
- [ ] Calendario muestra disponibilidad real
- [ ] Reservas asignadas a staff específico

---

## SPRINT 12: SaaS Servicios - Facturación Recurrente

**Rama:** `sprint/12-services-billing`
**Versión:** `v1.2.0-alpha.3`
**Dependencias:** Sprint 11

### Tareas

- [ ] Suscripciones a servicios
- [ ] Facturación automática mensual
- [ ] Historial de pagos
- [ ] Recordatorios de pago
- [ ] Gestión de suscripciones

### Criterios de Aceptación

- [ ] Suscripciones creadas correctamente
- [ ] Facturación automática ejecutándose
- [ ] Recordatorios enviados

---

## SPRINT 13: SaaS Servicios - Reportes

**Rama:** `sprint/13-services-reports`
**Versión:** `v1.2.0` (SaaS SERVICIOS ESTABLE)
**Dependencias:** Sprint 12

### Tareas

- [ ] Reporte de ingresos por servicio
- [ ] Reporte de ocupación
- [ ] Reporte de clientes frecuentes
- [ ] Exportación a CSV/PDF
- [ ] Dashboard de métricas

### Criterios de Aceptación

- [ ] Reportes generados con datos reales
- [ ] Exportación funcional
- [ ] Métricas actualizadas

---

## SPRINT 14: Inmobiliario - Propiedades

**Rama:** `sprint/14-real-estate-properties`
**Versión:** `v1.3.0-alpha.1`
**Dependencias:** Sprint 5

### Tareas

- [ ] Tablas `properties`, `property_types`, `property_features`
- [ ] CRUD de propiedades
- [ ] Galería de imágenes
- [ ] Mapa de ubicación
- [ ] Estados: venta, arriendo, vendido, arrendado

### Criterios de Aceptación

- [ ] Propiedades creadas con todos los atributos
- [ ] Imágenes gestionables
- [ ] Ubicación en mapa visible

---

## SPRINT 15: Inmobiliario - Filtros y Búsqueda

**Rama:** `sprint/15-real-estate-search`
**Versión:** `v1.3.0-alpha.2`
**Dependencias:** Sprint 14

### Tareas

- [ ] Filtros avanzados (precio, ubicación, habitaciones, etc.)
- [ ] Búsqueda geoespacial
- [ ] Ordenamiento por múltiples criterios
- [ ] Guardar búsquedas
- [ ] Alertas de nuevas propiedades

### Criterios de Aceptación

- [ ] Filtros funcionando correctamente
- [ ] Búsqueda geoespacial retorna resultados cercanos
- [ ] Alertas enviadas cuando hay coincidencias

---

## SPRINT 16: Inmobiliario - Agentes

**Rama:** `sprint/16-real-estate-agents`
**Versión:** `v1.3.0-alpha.3`
**Dependencias:** Sprint 15

### Tareas

- [ ] Tabla `agents` con especialidades
- [ ] Asignación de propiedades a agentes
- [ ] Perfil público de agente
- [ ] Contacto con agente
- [ ] Dashboard de agente

### Criterios de Aceptación

- [ ] Agentes asignados a propiedades
- [ ] Perfil público visible
- [ ] Leads registrados al contactar

---

## SPRINT 17: Inmobiliario - Reservas de Visita

**Rama:** `sprint/17-real-estate-tours`
**Versión:** `v1.3.0` (INMOBILIARIO ESTABLE)
**Dependencias:** Sprint 16

### Tareas

- [ ] Sistema de agendamiento de visitas
- [ ] Calendario de disponibilidad
- [ ] Confirmación y recordatorios
- [ ] Feedback post-visita
- [ ] Historial de visitas

### Criterios de Aceptación

- [ ] Visitas agendadas correctamente
- [ ] Recordatorios enviados
- [ ] Feedback capturado

---

## SPRINT 18: Restaurante - Menú y Mesas

**Rama:** `sprint/18-restaurant-menu`
**Versión:** `v1.4.0-alpha.1`
**Dependencias:** Sprint 5

### Tareas

- [ ] Tablas `menu_items`, `menu_categories`, `tables`
- [ ] CRUD de menú con categorías
- [ ] Gestión de mesas con QR
- [ ] Disponibilidad de mesas
- [ ] Menú digital público

### Criterios de Aceptación

- [ ] Menú completo con categorías
- [ ] QR genera enlace a menú
- [ ] Mesas gestionables

---

## SPRINT 19: Restaurante - Reservas

**Rama:** `sprint/19-restaurant-reservations`
**Versión:** `v1.4.0-alpha.2`
**Dependencias:** Sprint 18

### Tareas

- [ ] Tabla `reservations`
- [ ] Sistema de reservas online
- [ ] Gestión de capacity por horario
- [ ] Confirmación y recordatorios
- [ ] Waitlist automática

### Criterios de Aceptación

- [ ] Reservas online funcionando
- [ ] Capacity respetado
- [ ] Waitlist activa cuando no hay espacio

---

## SPRINT 20: Restaurante - Órdenes

**Rama:** `sprint/20-restaurant-orders`
**Versión:** `v1.4.0-alpha.3`
**Dependencias:** Sprint 19

### Tareas

- [ ] Tablas `orders`, `order_items` para restaurante
- [ ] Órdenes desde mesa (QR)
- [ ] Kitchen display system
- [ ] Estados de orden (pending, preparing, ready, served)
- [ ] Notificaciones al cliente

### Criterios de Aceptación

- [ ] Órdenes creadas desde QR
- [ ] Cocina ve órdenes en tiempo real
- [ ] Cliente notificado cuando está lista

---

## SPRINT 21: Restaurante - Delivery

**Rama:** `sprint/21-restaurant-delivery`
**Versión:** `v1.4.0` (RESTAURANTE ESTABLE)
**Dependencias:** Sprint 20

### Tareas

- [ ] Sistema de delivery con zonas
- [ ] Integración con repartidores
- [ ] Tracking de pedido en vivo
- [ ] Tiempo estimado de entrega
- [ ] Calificación del servicio

### Criterios de Aceptación

- [ ] Delivery disponible por zona
- [ ] Tracking en tiempo real
- [ ] Calificaciones registradas

---

## SPRINT 22: Enterprise - SSO y Webhooks

**Rama:** `sprint/22-enterprise-sso`
**Versión:** `v2.0.0-alpha.1`
**Dependencias:** Sprint 5

### Tareas SSO

- [ ] SAML 2.0 integration
- [ ] OIDC integration
- [ ] Mapeo de roles desde IdP
- [ ] Just-in-time provisioning

### Tareas Webhooks

- [ ] Tabla `webhooks`
- [ ] Eventos configurables
- [ ] Retry logic con exponential backoff
- [ ] Logs de webhooks

### Criterios de Aceptación

- [ ] SSO funcionando con IdP comunes
- [ ] Webhooks enviados correctamente
- [ ] Reintentos funcionando

---

## SPRINT 23: Enterprise - API Pública

**Rama:** `sprint/23-enterprise-api`
**Versión:** `v2.0.0-alpha.2`
**Dependencias:** Sprint 22

### Tareas

- [ ] API keys management
- [ ] Rate limiting por plan
- [ ] Documentación OpenAPI/Swagger
- [ ] SDKs (JavaScript, Python)
- [ ] API analytics

### Criterios de Aceptación

- [ ] API keys generadas y revocadas
- [ ] Rate limiting funcionando
- [ ] Documentación completa

---

## SPRINT 24: Enterprise - Multi-tenant Jerárquico

**Rama:** `sprint/24-enterprise-hierarchical`
**Versión:** `v2.0.0` (ENTERPRISE COMPLETO)
**Dependencias:** Sprint 23

### Tareas

- [ ] Estructura de tenants jerárquicos (parent/child)
- [ ] Herencia de configuración
- [ ] Consoladación de reportes
- [ ] Permisos cross-tenant (para admins de organización)
- [ ] Billing consolidado

### Criterios de Aceptación

- [ ] Jerarquía de tenants creada
- [ ] Configuración heredada correctamente
- [ ] Reportes consolidados
- [ ] Billing centralizado

---

## Resumen de Versiones

| Fase           | Sprints | Versión Final | Estado              |
| -------------- | ------- | ------------- | ------------------- |
| Core SaaS      | 0-5     | v1.0.0        | ✅ COMPLETO         |
| eCommerce      | 6-9     | v1.1.0        | Sprint 6 ✅ (1/4)    |
| SaaS Servicios | 10-13   | v1.2.0        | Pendiente           |
| Inmobiliario   | 14-17   | v1.3.0        | Pendiente           |
| Restaurante    | 18-21   | v1.4.0        | Pendiente           |
| Enterprise     | 22-24   | v2.0.0        | Pendiente           |

---

## Progreso General

```
Core SaaS:        ▓▓▓▓▓▓░░░░ 100% (Sprint 0-5 ✅ CORE COMPLETADO)
eCommerce:        ▓░░░░░░░░░ 25% (1/4 sprints - Sprint 6 ✅)
SaaS Servicios:   ░░░░░░░░░░ 0% (0/4 sprints)
Inmobiliario:     ░░░░░░░░░░ 0% (0/4 sprints)
Restaurante:      ░░░░░░░░░░ 0% (0/4 sprints)
Enterprise:       ░░░░░░░░░░ 0% (0/3 sprints)
```

**Total: 6/25 sprints completados (24%)**
**Actual: Sprint 7 - eCommerce Carrito e Inventario (NEXT)**

> **Nota Sprint 6**: ✅ COMPLETADO - Backend, Frontend y Tests 100% completos.
> **Commit:** `51c8357` - feat(ecommerce): implement Sprint 6 - Products module
>
> El módulo de productos está completamente implementado con:
> - CRUD de productos con variantes (SKUs, precios, stock)
> - Categorías jerárquicas con materialized path
> - Búsqueda full-text con índices GIN
> - Admin products + Admin categories
> - Catálogo público + página de detalle
> - Tests unitarios para validación de schema
> - RLS configurado para tenant isolation

> **Nota Sprint 5**: ✅ COMPLETADO - Backend y Frontend 100% completos.
> **Tareas pendientes requieren configuración externa:**
>
> - **Stripe Checkout**: Configurar cuenta en Stripe y agregar credenciales a `.env`
> - **Email Service**: Configurar Resend y agregar `RESEND_API_KEY` a `.env`
> - **Pasarelas Chilenas**: Opcionales, pueden implementarse en Sprint 6+
>
> El código está completo y los flujos funcionan. Solo falta configurar los servicios externos para producción.

> **Nota Sprint 4**: ✅ COMPLETADO - Mergeado a develop.
> Backend 100% completo. Frontend 100% completo.
> **Tareas pendientes requieren configuración externa:**
>
> - **Email Service**: Integrar con Resend/SendGrid para enviar Magic Links
> - **OAuth Credentials**: Configurar Google OAuth + GitHub OAuth (requiere dominio para producción)
>
> El código está listo y los flujos funcionan, solo falta configurar los servicios externos.
>
> **Nota Sprint 3**: ✅ COMPLETADO - Mergeado a develop.
> Backend 100% completo. Frontend 100% completo.
> **Tareas pendientes requieren configuración externa:**
>
> - **Subdominio (tenant.saas.com)**: Configurar wildcard DNS (\*.saas.com)
> - **Dominio Custom**: Usuario debe configurar DNS de su dominio
>
> El código de resolución de tenant está completo y funcional, solo falta configuración DNS.
>
> **Nota Sprint 4**: ✅ COMPLETADO - Mergeado a develop.
> Backend 100% completo. Frontend 100% completo.
> **Tareas pendientes requieren configuración externa:**
>
> - **Email Invitaciones**: Integrar con Resend/SendGrid para enviar invitaciones por email
>
> El sistema de invitaciones está completo y funcional (funciona con link directo en desarrollo), solo falta configurar el servicio de email para producción.

---

## Variables de Entorno Requeridas

### Base de Datos

```bash
# Neon PostgreSQL
DATABASE_URL=postgresql://...
```

### JWT / Auth

```bash
JWT_SECRET=tu-secreto-super-seguro
JWT_REFRESH_SECRET=tu-secreto-refresh-super-seguro
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### OAuth - Sprint 2 ⏳

```bash
# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=tu-github-client-id
GITHUB_CLIENT_SECRET=tu-github-client-secret
```

### Email Service - Sprint 2/5 ⏳

```bash
# Resend (Recomendado)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# O SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@tudominio.com
```

### Stripe Pagos - Sprint 5 ⏳

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_PRO=price_xxxxx
STRIPE_PRICE_ID_BUSINESS=price_xxxxx
```

### Pagos Chile - Sprint 5 ⏳

```bash
# Transbank
TBK_COMMERCE_CODE=xxxxxxxx
TBK_API_KEY=xxxxxxxx
TBK_INTEGRATION_TYPE=TEST

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=xxxxxxxx

# Flow
FLOW_API_KEY=xxxxxxxx
FLOW_SECRET=xxxxxxxx
```

### Application URLs

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### DNS Configuration - Sprint 3 ⏳

```bash
# Wildcard DNS para subdominios
*.saas.com  A  tu-ip-servidor

# Para dominios custom de usuarios
# Cada usuario configura su DNS:
custom-domain.com  CNAME  saas.com
# o
custom-domain.com  A  tu-ip-servidor
```
