# Sistema de Agentes - SaaS Multi-Tenant

> Definición completa del sistema de agentes IA para el proyecto

---

## Resumen

Este proyecto utiliza un sistema de agentes IA especializados para optimizar el desarrollo, mantenimiento y operación de la plataforma SaaS Multi-Tenant.

---

## Arquitectura de Agentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUARIO                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     🟣 ORQUESTADOR (Manager)                             │
│                        claude-opus-4-6                                   │
│                                                                          │
│  • Recibe solicitudes del usuario                                        │
│  • Clasifica y delega tareas                                             │
│  • Coordina entre subagentes                                             │
│  • Mantiene estado global                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ 🔵 PLANNING   │           │ 🟢 DOCS       │           │ 🟡 DATABASE   │
│   Sonnet      │           │   Haiku       │           │   Sonnet      │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Roadmaps    │           │ • README      │           │ • Schemas     │
│ • Sprints     │           │ • API Docs    │           │ • RLS         │
│ • Estimaciones│           │ • Guías       │           │ • Migraciones │
└───────────────┘           └───────────────┘           └───────────────┘

        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ 🔴 API        │           │ 🩵 UX/UI      │           │ 🛡️ SECURITY   │
│   Sonnet      │           │   Sonnet      │           │   Opus        │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Endpoints   │           │ • Componentes │           │ • Auditorías  │
│ • Contratos   │           │ • Accesibilidad│          │ • Vulnerabil. │
│ • Validación  │           │ • Design Sys  │           │ • OWASP       │
└───────────────┘           └───────────────┘           └───────────────┘

        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ 🟠 PERFORMANCE│           │ 🩷 TESTING    │           │ 🟤 DEPLOY     │
│   Sonnet      │           │   Sonnet      │           │   Sonnet      │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Lighthouse  │           │ • Unit Tests  │           │ • Dokploy     │
│ • Bundle Opt  │           │ • E2E Tests   │           │ • Docker      │
│ • Caching     │           │ • Synthetic   │           │ • CI/CD       │
└───────────────┘           └───────────────┘           └───────────────┘

                                    │
                                    ▼
                           ┌───────────────┐
                           │ ⚫ GIT        │
                           │   Haiku       │
                           ├───────────────┤
                           │ • Branching   │
                           │ • PRs         │
                           │ • Versioning  │
                           └───────────────┘
```

---

## Agentes Disponibles

### 1. Orquestador (Manager)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `orchestrator` |
| **Modelo** | `claude-opus-4-6` |
| **Color** | 🟣 `#9333EA` |
| **Archivo** | [orchestrator.md](./orchestrator.md) |

**Responsabilidades:**
- Coordinación general de subagentes
- Delegación inteligente de tareas
- Gestión de estado del proyecto
- Resolución de conflictos

**Comandos:** `/orch`, `/orchestrate`, `/orch status`, `/orch next`

---

### 2. Planning (Arquitecto de Planes)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `planning` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🔵 `#3B82F6` |
| **Archivo** | [subagent_planning.md](./subagent_planning.md) |

**Responsabilidades:**
- Gestión de roadmaps
- Sprint planning
- Estimaciones y story points
- Análisis de dependencias

**Comandos:** `/plan sprint`, `/plan roadmap`, `/plan estimate`, `/plan breakdown`

---

### 3. Documentation (Cronista Técnico)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `documentation` |
| **Modelo** | `claude-haiku-4-5` |
| **Color** | 🟢 `#10B981` |
| **Archivo** | [subagent_documentation.md](./subagent_documentation.md) |

**Responsabilidades:**
- Documentación técnica
- API documentation (OpenAPI)
- Guías de usuario
- ADRs (Architecture Decision Records)

**Comandos:** `/doc api`, `/doc readme`, `/doc guide`, `/doc adr`

---

### 4. Database (Arquitecto de Datos)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `database` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🟡 `#F59E0B` |
| **Archivo** | [subagent_database.md](./subagent_database.md) |

**Responsabilidades:**
- Diseño de schemas (Prisma)
- Row Level Security (RLS)
- Migraciones
- Optimización de queries

**Comandos:** `/db schema`, `/db migrate`, `/db rls`, `/db seed`, `/db studio`

---

### 5. API (Arquitecto de API)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `api` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🔴 `#EF4444` |
| **Archivo** | [subagent_api.md](./subagent_api.md) |

**Responsabilidades:**
- Diseño de endpoints REST
- Contratos de datos (Zod)
- Validación de input
- Documentación OpenAPI

**Comandos:** `/api endpoint`, `/api contract`, `/api validate`, `/api docs`

---

### 6. UX/UI (Diseñador de Experiencias)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `uxui` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🩵 `#06B6D4` |
| **Archivo** | [subagent_uxui.md](./subagent_uxui.md) |

**Responsabilidades:**
- Componentes UI (shadcn/ui)
- Accesibilidad (WCAG 2.1 AA)
- Design system
- Branding dinámico

**Comandos:** `/ui component`, `/ui page`, `/ui form`, `/ui audit`

---

### 7. Security (Guardián de Seguridad)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `security` |
| **Modelo** | `claude-opus-4-6` |
| **Color** | 🛡️ `#6B21A8` |
| **Archivo** | [subagent_security.md](./subagent_security.md) |

**Responsabilidades:**
- Auditorías de seguridad
- OWASP Top 10
- Verificación de RLS
- Headers de seguridad

**Comandos:** `/sec audit`, `/sec scan`, `/sec rls`, `/sec report`

---

### 8. Performance (Optimizador de Rendimiento)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `performance` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🟠 `#F97316` |
| **Archivo** | [subagent_performance.md](./subagent_performance.md) |

**Responsabilidades:**
- Core Web Vitals
- Bundle optimization
- Query optimization
- Caching strategies

**Comandos:** `/perf audit`, `/perf lighthouse`, `/perf bundle`, `/perf cache`

---

### 9. Testing (Ingeniero de Calidad)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `testing` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🩷 `#EC4899` |
| **Archivo** | [subagent_testing.md](./subagent_testing.md) |

**Responsabilidades:**
- Tests unitarios (Vitest)
- Tests E2E (Playwright)
- Usuarios sintéticos
- Validación de RLS

**Comandos:** `/test unit`, `/test e2e`, `/test synthetic`, `/test rls`, `/test coverage`

---

### 10. Deploy (Ingeniero de Deployment)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `deploy` |
| **Modelo** | `claude-sonnet-4-5` |
| **Color** | 🟤 `#A16207` |
| **Archivo** | [subagent_deploy.md](./subagent_deploy.md) |

**Responsabilidades:**
- Deployment en Dokploy
- Docker builds
- CI/CD pipelines
- Multi-tenant routing

**Comandos:** `/deploy staging`, `/deploy production`, `/deploy rollback`, `/deploy logs`

---

### 11. Git (Guardián del Repositorio)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `git` |
| **Modelo** | `claude-haiku-4-5` |
| **Color** | ⚫ `#171717` |
| **Archivo** | [subagent_git.md](./subagent_git.md) |

**Responsabilidades:**
- Branching strategy (Git Flow)
- Conventional commits
- Pull requests
- Versioning

**Comandos:** `/git branch`, `/git feature`, `/git sprint`, `/git pr`, `/git release`

---

## MCPs Disponibles

### Globales
| MCP | Descripción | Uso Principal |
|-----|-------------|---------------|
| `dokploy` | Gestión de deployments | Deploy agent |
| `neon` | Gestión de base de datos Neon | Database agent |
| `n8n` | Workflows automatizados | Integraciones |
| `web_reader` | Lectura web | Documentation agent |
| `4_5v_mcp` | Análisis de imágenes | UX/UI agent |

### Locales
| MCP | Descripción | Uso Principal |
|-----|-------------|---------------|
| `filesystem` | Sistema de archivos | Todos los agentes |
| `ide` | Integración IDE | Testing, Performance |

---

## Matriz de Delegación

| Tipo de Tarea | Agente Principal | Agentes de Soporte |
|--------------|------------------|-------------------|
| Nueva feature | Planning → API → UX/UI | Database, Testing |
| Bug fix | API → Testing | Security (si aplica) |
| DB schema | Database | API, Security |
| UI component | UX/UI | Testing |
| Security issue | Security | API, Database |
| Deployment | Deploy | Testing, Security |
| Performance | Performance | Database, API |
| Documentation | Documentation | - |

---

## Flujo de Trabajo Típico

```
Usuario: "Implementar autenticación con magic links"
                    │
                    ▼
            ┌───────────────┐
            │  ORQUESTADOR  │
            │   Analiza     │
            └───────┬───────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│PLANNING │   │DATABASE │   │   API   │
│Planificar│   │ magic_  │   │Endpoints│
│  tasks   │   │ links   │   │ /auth/* │
└─────────┘   └─────────┘   └─────────┘
    │               │               │
    └───────────────┼───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │    UX/UI      │
            │  Formulario   │
            │  solicitud    │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │   TESTING     │
            │  E2E + Unit   │
            │  + Synthetic  │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │   SECURITY    │
            │   Audit del   │
            │    flujo      │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │     GIT       │
            │ Feature branch│
            │ PR → develop  │
            └───────────────┘
```

---

## Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `.claude/settings.json` | Configuración del proyecto |
| `memory/MEMORY.md` | Memoria persistente |
| `docs/agents/orchestrator.md` | Definición del orquestador |
| `docs/agents/subagent_*.md` | Definición de subagentes |
| `docs/users/synthetic_users.json` | Usuarios sintéticos para testing |

---

## Quick Reference

### Invocar Orquestador
```
/orchestrate <tarea>
/orch status
/orch next
```

### Invocar Subagentes Directamente
```
/plan <comando>
/doc <comando>
/db <comando>
/api <comando>
/ui <comando>
/sec <comando>
/perf <comando>
/test <comando>
/deploy <comando>
/git <comando>
```

### Comandos Comunes
```
/commit              # Crear commit (skill)
/test all            # Ejecutar todos los tests
/deploy staging      # Deploy a staging
/sec audit           # Auditoría de seguridad
```
