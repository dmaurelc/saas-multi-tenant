# Sistema de Agentes - Notas Detalladas

## Resumen de Decisiones

### Modelos por Tipo de Tarea

| Tipo de Tarea | Modelo | Justificación |
|---------------|--------|---------------|
| Coordinación/Seguridad | claude-opus-4-6 | Máxima capacidad de razonamiento |
| Desarrollo/Implementación | claude-sonnet-4-5 | Balance capacidad/velocidad |
| Docs/Git/Rutinas | claude-haiku-4-5 | Tareas más simples, eficiencia |

### Colores por Agente
Los colores fueron seleccionados para fácil identificación visual:
- 🟣 Purple: Orquestador (liderazgo)
- 🔵 Blue: Planning (estructurado)
- 🟢 Green: Documentation (crecimiento)
- 🟡 Amber: Database (datos)
- 🔴 Red: API (crítico)
- 🩵 Cyan: UX/UI (frescura)
- 🛡️ Dark Purple: Security (protección)
- 🟠 Orange: Performance (velocidad)
- 🩷 Pink: Testing (calidad)
- 🟤 Brown: Deploy (infraestructura)
- ⚫ Black: Git (control de versiones)

## Patrones de Delegación

### Tareas Complejas (múltiples agentes)
1. Planning → analiza y crea plan
2. Database → diseña schema
3. API → implementa endpoints
4. UX/UI → crea componentes
5. Testing → valida funcionalidad
6. Security → audita implementación

### Tareas Simples (un agente)
- Documentation → crear docs
- Git → crear branch/PR
- Deploy → deployment simple

## Reglas de Orquestación

1. **Siempre delegar** a subagentes para tareas específicas
2. **Validar dependencias** antes de ejecutar
3. **Confirmar acciones destructivas** con usuario
4. **Reportar progreso** de tareas largas
5. **Mantener contexto** entre delegaciones

## Integración con MCPs

### Dokploy
- Usado principalmente por Deploy agent
- Permite crear, actualizar, eliminar aplicaciones
- Gestión de dominios y SSL
- Monitoreo de recursos

### Supabase
- Usado por Database agent
- Ejecución de SQL directo
- Gestión de migraciones
- Listado de tablas y extensiones

### n8n
- Disponible para automatizaciones
- Integración con webhooks
- Flujos de notificaciones

## Limitaciones Conocidas

1. Los agentes no pueden ejecutar código directamente
2. Requieren aprobación para cambios destructivos
3. No pueden acceder a secrets de producción
4. Deben seguir conventional commits

## Próximas Mejoras

- [ ] Agentes especializados por vertical (eCommerce, Restaurantes, etc.)
- [ ] Integración con sistema de tickets (Linear, Jira)
- [ ] Notificaciones automáticas a Slack/Discord
- [ ] Dashboard de métricas de agentes
