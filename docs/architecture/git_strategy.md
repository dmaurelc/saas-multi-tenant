# Estrategia Git - SaaS Multi-Tenant

## Branches Principales

| Branch               | Propósito              | Protección                 |
| -------------------- | ---------------------- | -------------------------- |
| `main`               | Producción             | Merge solo desde releases  |
| `develop`            | Testing e integración  | Require PR + tests passing |
| `sprint/X`           | Desarrollo de sprint   | Delete after merge         |
| `feature/sprint-X-*` | Features individuales  | Delete after merge         |
| `release/vX.X.X`     | Preparación de release | Delete after merge         |

## Flujo de Trabajo Completo

### 1. Inicio de Sprint

```bash
# Asegurar develop actualizado
git checkout develop
git pull origin develop

# Crear rama de sprint
git checkout -b sprint/5-core-complete
git push -u origin sprint/5-core-complete
```

### 2. Crear Feature Branch

```bash
# Desde la rama de sprint
git checkout sprint/5-core-complete
git checkout -b feature/sprint-5-stripe-integration

# Desarrollo...
git add .
git commit -m "feat(payments): add Stripe checkout integration"
git push -u origin feature/sprint-5-stripe-integration
```

### 3. Completar Feature

```bash
# Push y crear PR a sprint/X
git push origin feature/sprint-5-stripe-integration

# Crear PR desde GitHub CLI
gh pr create --base sprint/5-core-complete --title "feat(payments): Stripe integration" --body "..."
```

### 4. Sprint Listo → Merge a Develop (Testing)

```bash
# Cuando todas las features del sprint están listas
git checkout develop
git merge sprint/5-core-complete --no-ff
git push origin develop

# Sub-agente de testing ejecuta validaciones automáticamente
# Ver: /docs/architecture/blueprint_base.md#flujo-de-validación
```

### 5. Testing Exitoso → Crear Release

```bash
# Crear rama de release desde develop
git checkout -b release/v1.0.0-alpha.1 develop

# Actualizar CHANGELOG.md
# Actualizar versiones en package.json si es necesario

# Crear tag
git tag -a v1.0.0-alpha.1 -m "Release v1.0.0-alpha.1 - Core SaaS Complete"

# Push de release y tags
git push origin release/v1.0.0-alpha.1 --tags
```

### 6. Merge a Main (Producción)

```bash
# Crear PR desde release a main
gh pr create --base main --head release/v1.0.0-alpha.1 \
  --title "Release v1.0.0-alpha.1" \
  --body "## Changes
- Core SaaS completo
- Auth, Tenants, Users, Dashboard, Payments

## Checklist
- [ ] Tests passing
- [ ] Sub-agent validation complete
- [ ] Changelog updated"

# Después de aprobación y merge
git checkout main
git pull origin main

# Deploy automático a producción via CI/CD
```

### 7. Cleanup

```bash
# Eliminar ramas de sprint y features
git branch -d sprint/5-core-complete
git branch -d feature/sprint-5-stripe-integration
git push origin --delete sprint/5-core-complete
git push origin --delete feature/sprint-5-stripe-integration
```

### 8. Sprint Completion Checklist

**IMPORTANTE**: Al finalizar CADA sprint, seguir este checklist obligatoriamente:

- [ ] Actualizar `docs/planning/project_roadmap.md` con tareas completadas del sprint
- [ ] Documentar tareas pendientes en tabla separada del roadmap (requieren config externa)
- [ ] Crear tag release con **versión especificada en `project_roadmap.md`** (no usar fórmula)
- [ ] Merge a `develop` con todos los cambios del sprint
- [ ] Crear nueva rama para el siguiente sprint
- [ ] **REGLA DE ORO**: Commits SIN mencionar Claude ni ninguna referencia externa

#### Ejemplo de comando para tag de release

```bash
# La versión debe ser la especificada en project_roadmap.md para cada sprint
git tag -a v0.5.0-alpha.1 -m "Release v0.5.0-alpha.1 - Sprint 4: Gestión de Usuarios"
git push origin v0.5.0-alpha.1
```

#### Ejemplo de commit válido

```bash
# ✅ CORRECTO
git commit -m "feat(auth): implement oauth for google and github"

# ❌ INCORRECTO
git commit -m "feat(auth): implement oauth - Claude helped with this"
```

---

## Conventional Commits

| Tipo       | Descripción                            | Ejemplo                                           |
| ---------- | -------------------------------------- | ------------------------------------------------- |
| `feat`     | Nueva funcionalidad                    | `feat(auth): add magic link authentication`       |
| `fix`      | Bug fix                                | `fix(payments): fix webhook signature validation` |
| `docs`     | Documentación                          | `docs(readme): update installation instructions`  |
| `refactor` | Refactor sin cambios de comportamiento | `refactor(auth): extract token validation logic`  |
| `test`     | Tests                                  | `test(tenants): add RLS isolation tests`          |
| `chore`    | Mantenimiento                          | `chore(deps): update dependencies`                |
| `perf`     | Mejoras de performance                 | `perf(api): add query caching`                    |
| `style`    | Formato de código                      | `style(ui): format components`                    |

### Scope por Módulo

| Scope           | Descripción                  |
| --------------- | ---------------------------- |
| `auth`          | Autenticación y autorización |
| `tenants`       | Gestión de tenants           |
| `users`         | Gestión de usuarios          |
| `payments`      | Pagos y suscripciones        |
| `notifications` | Sistema de notificaciones    |
| `ecommerce`     | Módulo eCommerce             |
| `services`      | Módulo SaaS Servicios        |
| `realestate`    | Módulo Inmobiliario          |
| `restaurant`    | Módulo Restaurante           |
| `api`           | API pública                  |
| `ui`            | Componentes de UI            |
| `db`            | Base de datos y migraciones  |

---

## Branch Protection Rules

### main

```yaml
required_status_checks:
  strict: true
  contexts:
    - tests
    - lint
    - build
    - security-scan

enforce_admins: true
required_pull_request_reviews:
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  required_approving_review_count: 1

restrictions: null

# No force push
# No delete
```

### develop

```yaml
required_status_checks:
  strict: true
  contexts:
    - tests
    - lint

enforce_admins: false
required_pull_request_reviews:
  required_approving_review_count: 1

# No force push
# Allow squash merge
```

### sprint/X y feature/sprint-X-\*

```yaml
required_status_checks:
  strict: false
  contexts:
    - lint

enforce_admins: false
required_pull_request_reviews: null

# Delete after merge
```

---

## Hooks (Husky)

### Configuración

```json
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:staged": "lint-staged",
    "test:unit": "vitest run",
    "commitlint": "commitlint --edit"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint:staged
```

### commit-msg

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm commitlint
```

### pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Solo ejecutar tests si se está pusheando a develop o main
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" = "develop" ] || [ "$current_branch" = "main" ]; then
  pnpm test:unit
fi
```

---

## Commitlint Config

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'perf', 'style', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'tenants',
        'users',
        'payments',
        'notifications',
        'ecommerce',
        'services',
        'realestate',
        'restaurant',
        'api',
        'ui',
        'db',
        'core',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

---

## CODEOWNERS

```
# .github/CODEOWNERS

# Core
/apps/api/ @team-backend
/apps/web/ @team-frontend
/packages/database/ @team-backend

# Pagos
/packages/payments/ @team-payments

# Documentación
/docs/ @team-docs

# CI/CD
/.github/ @team-devops
/turbo.json @team-devops
```

---

## Flujo Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE TRABAJO GIT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  feature/sprint-5-stripe                                                    │
│       │                                                                      │
│       │ PR + review                                                         │
│       ▼                                                                      │
│  sprint/5-core-complete ◄─── feature/sprint-5-notif                        │
│       │                               │                                      │
│       │ PR + review                   │ PR + review                         │
│       │                               │                                      │
│       │ merge (todas features listas)│                                      │
│       ▼                               │                                      │
│  develop ◄────────────────────────────┘                                      │
│       │                                                                      │
│       │ Sub-agente testing                                                  │
│       │ + Usuarios sintéticos                                               │
│       │                                                                      │
│       ▼ (si tests OK)                                                       │
│  release/v1.0.0-alpha.1                                                     │
│       │                                                                      │
│       │ tag + CHANGELOG                                                     │
│       │                                                                      │
│       ▼ PR + 1 approval                                                     │
│  main ──────────► Deploy producción                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Comandos Útiles

### Ver estado de branches

```bash
# Branches locales
git branch -vv

# Branches remotas
git branch -r

# Branches fusionadas a develop
git branch --merged develop

# Branches no fusionadas a develop
git branch --no-merged develop
```

### Sincronizar con remote

```bash
# Fetch sin merge
git fetch origin

# Fetch y prune (eliminar referencias a branches borrados)
git fetch -p

# Pull con rebase
git pull --rebase origin develop
```

### Resolver conflictos

```bash
# Durante merge conflict
git status
# Editar archivos en conflicto
git add <archivos-resueltos>
git merge --continue

# Abortar merge
git merge --abort
```

### Ver historial

```bash
# Historial de un archivo
git log --oneline --follow -- path/to/file

# Historial gráfico
git log --oneline --graph --all

# Cambios en un commit
git show <commit-hash>
```

---

## Tags y Releases

### Crear tag

```bash
# Tag anotado (recomendado)
git tag -a v1.0.0 -m "Release v1.0.0 - Core SaaS Complete"

# Push tag
git push origin v1.0.0

# Push todos los tags
git push origin --tags
```

### Listar tags

```bash
# Todos los tags
git tag -l

# Tags con patrón
git tag -l "v1.0*"

# Ver detalles de un tag
git show v1.0.0
```

### Eliminar tag

```bash
# Local
git tag -d v1.0.0

# Remoto
git push origin --delete v1.0.0
```

---

## Troubleshooting

### Accidental commit a main

```bash
# Crear branch y mover commit
git branch feature/sprint-X-fix
git reset --hard HEAD~1
git checkout feature/sprint-X-fix
```

### Commit con mensaje incorrecto

```bash
# Modificar último commit (antes de push)
git commit --amend -m "feat(auth): correct message"
```

### Branch desincronizada

```bash
# Rebase sobre develop
git checkout sprint/5-core-complete
git rebase develop

# O merge
git merge develop
```
