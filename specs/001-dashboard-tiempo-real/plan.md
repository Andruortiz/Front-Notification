# Implementation Plan: Ver notificaciones en tiempo real en el panel

**Branch**: `feature/HU2-XXX-dashboard-tiempo-real` (número de historia pendiente de asignar) | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-dashboard-tiempo-real/spec.md`

## Summary

Listado y Detalle dejan de ser una foto fija: consumen `GET /notifications:subscribe` (SSE, ya
implementado en el backend) para reflejar cambios de estado sin recargar ni repetir búsquedas. El
enfoque técnico: `@microsoft/fetch-event-source` como cliente SSE (por el header `X-Tenant-Id`, que
`EventSource` nativo no puede enviar), integrado con la cache existente de TanStack Query en vez de
un estado paralelo, más el bootstrap del tooling de pruebas (Vitest/RTL/MSW) que la constitución exige
y el proyecto todavía no tiene.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19

**Primary Dependencies**: Vite, TanStack Query v5, React Router v7, `@microsoft/fetch-event-source`
(nueva), `openapi-typescript` (regeneración puntual de `schema.d.ts`)

**Storage**: N/A — el estado en vivo vive en la cache de TanStack Query (`queryClient`), no en
`localStorage`/`sessionStorage`

**Testing**: Vitest + Testing Library + MSW (nuevas — no existían en el proyecto, ver research.md
Decisión 6)

**Target Platform**: navegadores evergreen modernos, servidos por Vite

**Project Type**: aplicación de una sola página (panel operativo interno)

**Performance Goals**: cambio de estado reflejado en ≤5s desde que ocurre en el backend (SC-001);
resync completo en ≤5s tras reconexión (SC-002)

**Constraints**: `X-Tenant-Id` sigue siendo un placeholder por header (Principio II); el endpoint de
suscripción no pagina y topa en 200 resultados del lado del backend; no se modifica el backend en
esta historia

**Scale/Scope**: 2 pantallas afectadas (Listado, Detalle), 1 endpoint nuevo consumido, ningún endpoint
nuevo en Catálogo

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                                        | Cumple                      | Nota                                                                                                                                                                                                                                                                         |
| ------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Contrato primero, tipos generados             | ✅ (con acción previa)      | `schema.d.ts` está desactualizado respecto al `api-notificaciones.yaml` real del backend (falta paginación y `NotificationLiveUpdate`) — se regenera como Tarea 1, antes de tocar código de esta historia (research.md Decisión 2).                                          |
| II. Tenant provisional                           | ✅                          | El cliente SSE manda `X-Tenant-Id` igual que `apiFetch`; no se introduce autenticación real.                                                                                                                                                                                 |
| III. Calidad verificada, no declarada            | ⚠️ → ✅ (con acción previa) | El proyecto no tiene Vitest/RTL/MSW instalado hoy. Esta historia los bootstrapea (research.md Decisión 6) porque, siendo tamaño M+, la constitución exige al menos una prueba de flujo con MSW — no es una excepción, es una dependencia que se resuelve dentro del alcance. |
| IV. Cero comentarios explicativos                | ✅                          | Sin comentarios de trade-offs en el código nuevo; el razonamiento vive aquí y en el PR.                                                                                                                                                                                      |
| V. Trazabilidad en git                           | ✅                          | Rama `feature/HU2-XXX-dashboard-tiempo-real` desde `develop`, PR contra `develop`, el usuario mergea.                                                                                                                                                                        |
| VI. Spec-kit proporcional al tamaño              | ✅                          | Historia M+ → flujo completo specify → plan → tasks, con aprobación explícita del usuario en spec (hecho) y en este plan.                                                                                                                                                    |
| VII. Sin atajos                                  | ✅                          | Nada se oculta para pasar la compilación; lo no cubierto (filtros de búsqueda, botón de reintento) queda explícito como fuera de alcance en `spec.md`, no simulado.                                                                                                          |
| VIII. Estados explícitos y color con significado | ✅                          | FR-007 exige el indicador de conexión explícito; el color de `NotificationStatus` no cambia, el indicador de conexión usa su propia semántica de color (activo/reconectando/interrumpido), sin pisar la paleta de estados de notificación.                                   |

Ningún gate queda bloqueado sin acción — I y III requieren una tarea previa (regenerar contrato,
instalar tooling de pruebas) antes de las tareas de UI propiamente dichas; ambas están en `tasks.md`
como Fase 0 del _implement_, no como excepciones a la constitución.

## Project Structure

### Documentation (this feature)

```text
specs/001-dashboard-tiempo-real/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── subscribe-notifications-consumer.md
└── tasks.md              # Phase 2 output (/speckit-tasks, NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/api/
├── schema.d.ts                 # regenerado desde el api-notificaciones.yaml vigente del backend
├── client.ts                   # sin cambios de forma (apiFetch existente)
└── liveUpdates.ts               # NUEVO: subscribeToNotificationUpdates() sobre fetch-event-source

src/hooks/
├── useNotificationsLiveFeed.ts  # NUEVO: para Listado — parchea ['notifications'] en la cache
└── useNotificationLiveStatus.ts # NUEVO: para Detalle — invalida ['notification', id] al coincidir

src/components/
├── LiveConnectionBadge.tsx      # NUEVO: indicador connecting/open/reconnecting/closed (FR-007)
└── StatusBadge.tsx              # sin cambios

src/pages/
├── Listado.tsx                  # usa useNotificationsLiveFeed + LiveConnectionBadge
└── Detalle.tsx                  # usa useNotificationLiveStatus + LiveConnectionBadge

src/**/*.test.tsx                # junto al código que cubren
src/test/
├── setup.ts                     # jest-dom matchers, config de Testing Library
├── server.ts                    # servidor MSW compartido
└── handlers/
    └── notifications.ts         # handlers REST + handler SSE (text/event-stream)

vitest.config.ts                 # NUEVO (o sección test: en vite.config.ts)
package.json                     # + script "test", "generate:api"
.github/workflows/ci.yml         # + job "test"
```

**Structure Decision**: se mantiene la estructura plana ya existente (`src/api`, `src/components`,
`src/pages`), agregando `src/hooks/` (no existía — hasta ahora no había lógica de estado
suficientemente compleja para justificarlo) y `src/test/` para la infraestructura compartida de
pruebas. Ningún archivo existente cambia de ubicación.

## Complexity Tracking

_Sin violaciones que requieran justificación — ver Constitution Check arriba: los dos gates con
acción previa (I, III) se resuelven como tareas dentro de esta misma historia, no como excepciones._
