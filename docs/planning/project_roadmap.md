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

## SPRINT 2: Auth Avanzado + Roles

**Rama:** `sprint/2-auth-advanced`
**Versión:** `v0.3.0-alpha.1`
**Dependencias:** Sprint 1

### Tareas Magic Link

- [ ] Generar token único para magic link
- [ ] Enviar email con link
- [ ] Validar token y crear sesión
- [ ] Expiración de token (15 min)

### Tareas OAuth

- [ ] Configurar Google OAuth
- [ ] Configurar GitHub OAuth
- [ ] Flujo OAuth callback
- [ ] Multi-tenant con OAuth

### Tareas Roles

- [ ] Definir roles: owner, admin, staff, customer
- [ ] Tabla roles con permisos JSON
- [ ] `hasPermission()` helper
- [ ] Middleware de autorización

### Tareas Frontend

- [ ] Componente `<RoleGuard>`
- [ ] UI adaptada al rol

### Criterios de Aceptación

- [ ] Magic link funcional
- [ ] OAuth funcional (Google y GitHub)
- [ ] Roles asignados correctamente
- [ ] Permisos verificados en cada acción

---

## SPRINT 3: Gestión de Tenants

**Rama:** `sprint/3-tenants`
**Versión:** `v0.4.0-alpha.1`
**Dependencias:** Sprint 2

### Tareas Backend

- [ ] CRUD de tenants
- [ ] Branding (logo, colores primarios/secundarios)
- [ ] Subdominio automático
- [ ] Validación dominio custom

### Tareas Frontend

- [ ] Página configuración de tenant
- [ ] Formulario branding con preview
- [ ] Configuración dominio custom

### Tareas Multi-tenant

- [ ] Middleware detección por subdomain
- [ ] Middleware detección por custom domain
- [ ] Middleware detección por header X-Tenant-ID
- [ ] Caching de resolución de tenant

### Criterios de Aceptación

- [ ] Tenant actualiza branding correctamente
- [ ] Subdominio funciona (tenant.saas.com)
- [ ] Dominio custom verificable
- [ ] Resolución de tenant cacheada

---

## SPRINT 4: Gestión de Usuarios

**Rama:** `sprint/4-users`
**Versión:** `v0.5.0-alpha.1`
**Dependencias:** Sprint 3

### Tareas Backend

- [ ] CRUD usuarios dentro del tenant
- [ ] Sistema de invitaciones por email
- [ ] Cambio de rol de usuarios
- [ ] Auditoría de acciones (audit_logs table)

### Tareas Frontend

- [ ] Listado de usuarios con paginación
- [ ] Modal crear/editar usuario
- [ ] Modal invitación por email
- [ ] Historial de actividad

### Tareas Invitaciones

- [ ] Tabla `invitations`
- [ ] Email template para invitación
- [ ] Página aceptar invitación

### Criterios de Aceptación

- [ ] Admin crea/edita usuarios del tenant
- [ ] Invitaciones funcionan end-to-end
- [ ] Logs de auditoría registrados
- [ ] Solo usuarios del tenant son visibles

---

## SPRINT 5: Dashboard + Pagos + Notificaciones + Métricas

**Rama:** `sprint/5-core-complete`
**Versión:** `v1.0.0-alpha.1` (CORE COMPLETO)
**Dependencias:** Sprint 4

### Tareas Dashboard

- [ ] Endpoint KPIs por tenant
- [ ] Frontend dashboard con widgets
- [ ] Gráficos de actividad (últimos 30 días)

### Tareas Pagos Stripe

- [ ] Configurar Stripe account
- [ ] Crear productos y precios en Stripe
- [ ] Checkout suscripción
- [ ] Webhooks Stripe (payment_succeeded, payment_failed)
- [ ] Portal de cliente Stripe

### Tareas Pagos Chile

- [ ] Transbank Webpay Plus integration
- [ ] Transbank Oneclick (suscripciones)
- [ ] MercadoPago integration
- [ ] Flow integration
- [ ] Abstracción Strategy Pattern para pagos

### Tareas Notificaciones

- [ ] Tabla `notifications`
- [ ] Notificaciones in-app (bell icon)
- [ ] Email transactional (Resend/SendGrid)
- [ ] Preferencias de notificación por usuario

### Tareas Métricas

- [ ] Tabla `events` para analytics
- [ ] Endpoint tracking de eventos
- [ ] Dashboard de métricas básicas

### Criterios de Aceptación

- [ ] Dashboard muestra KPIs relevantes
- [ ] Stripe checkout funcional
- [ ] Al menos 1 pasarela chilena funcional
- [ ] Notificaciones in-app funcionando
- [ ] Métricas registrándose en DB

---

## SPRINT 6: eCommerce - Productos

**Rama:** `sprint/6-ecommerce-products`
**Versión:** `v1.1.0-alpha.1`
**Dependencias:** Sprint 5

### Tareas

- [ ] Modelo datos: `products`, `categories`, `variants`, `product_images`
- [ ] CRUD categorías jerárquicas (parent_id)
- [ ] CRUD productos con variantes
- [ ] Búsqueda full-text con índices GIN
- [ ] Admin: gestión productos/categorías
- [ ] Public: catálogo y detalle de producto
- [ ] RLS para eCommerce

### Criterios de Aceptación

- [ ] CRUD productos completo
- [ ] Categorías jerárquicas funcionando
- [ ] Catálogo público visible
- [ ] Búsqueda retorna resultados relevantes

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

| Fase           | Sprints | Versión Final | Estado    |
| -------------- | ------- | ------------- | --------- |
| Core SaaS      | 0-5     | v1.0.0        | Pendiente |
| eCommerce      | 6-9     | v1.1.0        | Pendiente |
| SaaS Servicios | 10-13   | v1.2.0        | Pendiente |
| Inmobiliario   | 14-17   | v1.3.0        | Pendiente |
| Restaurante    | 18-21   | v1.4.0        | Pendiente |
| Enterprise     | 22-24   | v2.0.0        | Pendiente |

---

## Progreso General

```
Core SaaS:        ▓▓░░░░░░░░ 33% (Sprints 0-1 completados)
eCommerce:        ░░░░░░░░░░ 0% (0/4 sprints)
SaaS Servicios:   ░░░░░░░░░░ 0% (0/4 sprints)
Inmobiliario:     ░░░░░░░░░░ 0% (0/4 sprints)
Restaurante:      ░░░░░░░░░░ 0% (0/4 sprints)
Enterprise:       ░░░░░░░░░░ 0% (0/3 sprints)
```

**Total: 2/25 sprints completados (Sprint 0-1: 100% completados)**
