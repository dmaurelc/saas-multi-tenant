# Agentes del Proyecto

Esta carpeta contiene la definición completa del sistema de agentes IA para el SaaS Multi-Tenant.

## Estructura

```
docs/agents/
├── README.md                    # Este archivo
├── system_definition.md         # Definición completa del sistema
├── orchestrator.md              # Agente orquestador principal
├── subagent_planning.md         # Subagente de planificación
├── subagent_documentation.md    # Subagente de documentación
├── subagent_database.md         # Subagente de base de datos
├── subagent_api.md              # Subagente de API
├── subagent_uxui.md             # Subagente de UX/UI
├── subagent_security.md         # Subagente de seguridad
├── subagent_performance.md      # Subagente de performance
├── subagent_testing.md          # Subagente de testing
├── subagent_deploy.md           # Subagente de deployment
└── subagent_git.md              # Subagente de git
```

## Inicio Rápido

### Invocar al Orquestador
```
/orchestrate <descripción de la tarea>
/orch <descripción>
```

### Invocar Subagentes Directamente
```
/plan <comando>      # Planificación
/doc <comando>       # Documentación
/db <comando>        # Base de datos
/api <comando>       # API
/ui <comando>        # UX/UI
/sec <comando>       # Seguridad
/perf <comando>      # Performance
/test <comando>      # Testing
/deploy <comando>    # Deployment
/git <comando>       # Git
```

## Agentes Disponibles

| Agente | ID | Modelo | Color | Especialidad |
|--------|-----|--------|-------|--------------|
| Orquestador | `orchestrator` | claude-opus-4-6 | 🟣 | Coordinación |
| Planning | `planning` | claude-sonnet-4-5 | 🔵 | Roadmaps, Sprints |
| Documentation | `documentation` | claude-haiku-4-5 | 🟢 | Docs, API docs |
| Database | `database` | claude-sonnet-4-5 | 🟡 | Neon, RLS, Migrations |
| API | `api` | claude-sonnet-4-5 | 🔴 | Endpoints, Contratos |
| UX/UI | `uxui` | claude-sonnet-4-5 | 🩵 | UI, Accesibilidad |
| Security | `security` | claude-opus-4-6 | 🛡️ | Auditoría, OWASP |
| Performance | `performance` | claude-sonnet-4-5 | 🟠 | Lighthouse, Cache |
| Testing | `testing` | claude-sonnet-4-5 | 🩷 | E2E, Unit, Synthetic |
| Deploy | `deploy` | claude-sonnet-4-5 | 🟤 | Dokploy, Docker |
| Git | `git` | claude-haiku-4-5 | ⚫ | Branching, PRs |

## MCPs Utilizados

### Globales
- **dokploy**: Gestión de deployments
- **supabase**: Gestión de proyectos Neon/Supabase
- **n8n**: Workflows automatizados
- **web_reader**: Lectura de contenido web
- **4_5v_mcp**: Análisis de imágenes

### Locales
- **filesystem**: Acceso al sistema de archivos
- **ide**: Integración con IDE

## Archivos Relacionados

- [Configuración del Proyecto](../../.claude/settings.json)
- [Memoria del Proyecto](../../memory/MEMORY.md)
- [Usuarios Sintéticos](../users/synthetic_users.json)
- [Roadmap del Proyecto](../planning/project_roadmap.md)
