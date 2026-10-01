# Implementation Plan: Enviar notificaciones desde el panel de control

**Branch**: `feature/HU2-XXX-enviar-notificacion-panel` (número de historia pendiente de asignar) | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-enviar-notificacion-panel/spec.md`

## Summary

El panel deja de ser solo de consulta: una pantalla nueva `Nueva notificación` permite enviar por
cualquier canal del catálogo, de forma individual o a varios destinatarios con el mismo mensaje, y
`Detalle` gana la acción de reintentar. Todo es petición y respuesta sobre endpoints que el backend ya
expone (`POST /notifications`, `POST /notifications:sendBatch`, `POST /notifications/{id}:retry`,
`GET /channels`); el feed en vivo por SSE sigue siendo el único canal de tiempo real y es el que hace
aparecer lo enviado en el listado. Enfoque técnico: formularios controlados con validación en
funciones puras (sin librería de formularios), reglas por canal derivadas del catálogo más las
conocidas del contrato, identificadores de idempotencia estables mientras el contenido no cambia, y
envío a varios destinatarios troceado en solicitudes de 200 para no depender de un tope de lote que el
contrato no declara.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19

**Primary Dependencies**: Vite, TanStack Query v5 (`useMutation` para enviar y reintentar), React
Router v7. Ninguna dependencia nueva.

**Storage**: N/A. Los borradores viven solo en estado de componente; no se usa `localStorage` ni
`sessionStorage`, así que ningún borrador puede sobrevivir a un cambio de cliente (FR-014).

**Testing**: Vitest + Testing Library + MSW (ya instalados). Se añaden handlers MSW para los tres
endpoints de escritura y pruebas unitarias de las funciones puras de validación y derivación.

**Target Platform**: navegadores evergreen modernos, servidos por Vite

**Project Type**: aplicación de una sola página (panel operativo interno)

**Performance Goals**: envío a 50 destinatarios con resultado completo en ≤30 s (SC-005); 1000
destinatarios con rechazados localizables en ≤10 s con el filtro (SC-006); validación de errores en el
formulario sin llamar al sistema (SC-004)

**Constraints**: `X-Tenant-Id` sigue siendo un placeholder por header (Principio II); el contrato no
declara un máximo de elementos por lote; no se modifica el backend en esta historia; el envío no debe
invalidar `['notifications']` porque pisaría el feed en vivo (regresión ya corregida en el PR #8)

**Scale/Scope**: 1 pantalla nueva, 1 pantalla modificada (`Detalle`), 1 enlace en `Layout`, 4
endpoints consumidos (3 de escritura y el catálogo de canales ya consumido en `Catálogo`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                                        | Cumple | Nota                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Contrato primero, tipos generados             | ✅     | Los cuatro endpoints y sus tipos ya están en `schema.d.ts`; no se inventa ningún endpoint ni se edita el archivo. La carencia del contrato (máximo por lote no declarado) no se parchea en la interfaz sin más: se trocea de forma conservadora y se registra como pendiente en research.md D6.  |
| II. Tenant provisional                           | ✅     | Se reutiliza `apiFetch` con su `X-Tenant-Id`. Los borradores no se persisten, así que nada de un tenant sobrevive a otro.                                                                                                                                                                        |
| III. Calidad verificada, no declarada            | ✅     | Historia L: incluye pruebas de flujo con MSW (envío individual, duplicado, lote con rechazos, reintento) además de las de componente, y cada pantalla nueva prueba carga, vacío y error del catálogo de canales.                                                                                 |
| IV. Cero comentarios explicativos                | ✅     | Sin comentarios de trade-offs en el código nuevo; el razonamiento vive en research.md y en el PR.                                                                                                                                                                                                |
| V. Trazabilidad en git                           | ✅     | Rama `feature/HU2-XXX-enviar-notificacion-panel` desde `develop`, PR contra `develop`, el usuario mergea. Commits de una línea, en español y sin tildes.                                                                                                                                         |
| VI. Spec-kit proporcional al tamaño              | ✅     | Historia L → flujo completo specify → clarify → plan → tasks, con aprobación explícita del usuario sobre spec (hecha) y este plan.                                                                                                                                                               |
| VII. Sin atajos                                  | ✅     | Lo que no tiene solución definitiva queda como pendiente explícito (research.md D6: máximo por lote; D4: identificador de destinatario derivado). CSV y mensajes distintos por destinatario quedan fuera de alcance, no simulados.                                                               |
| VIII. Estados explícitos y color con significado | ✅     | Catálogo de canales con carga, vacío y error; resultados de envío con estados textuales. Los resultados aceptado, duplicado y rechazado usan un distintivo neutro; el color de acento solo aparece en el `StatusBadge` de la notificación creada. Los errores usan el estilo de error existente. |

Sin gates bloqueados y sin violaciones que justificar. Re-evaluación tras el diseño de Fase 1: se
mantiene igual; el único punto abierto (D6) es una dependencia con el backend, no una excepción a la
constitución.

## Project Structure

### Documentation (this feature)

```text
specs/003-enviar-notificacion-panel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── send-notifications-consumer.md
└── tasks.md              # Phase 2 output (/speckit-tasks, NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/api/
├── client.ts                     # ApiError con status y mensaje del servidor; apiFetch sigue igual para quien ya lo usa
├── catalog.ts                    # sin cambios (getChannels ya existe)
└── notifications.ts              # NUEVO: sendNotification, sendNotificationBatch, retryNotification

src/lib/
├── recipients.ts                 # NUEVO: normalizar direcciones, derivar recipientId, parsear y deduplicar la lista
├── channelRules.ts               # NUEVO: reglas por canal (formato de dirección, límites, campos) desde el catálogo
├── sendValidation.ts             # NUEVO: validación pura del formulario individual y del envío a varios
└── submissionId.ts               # NUEVO: id de idempotencia estable mientras el contenido no cambia

src/hooks/
├── useSendNotification.ts        # NUEVO: mutación de envío individual
├── useSendBatch.ts               # NUEVO: envío troceado con progreso y resultado agregado
└── useRetryNotification.ts       # NUEVO: mutación de reintento que actualiza ['notification', id]

src/components/send/
├── ChannelSelect.tsx             # NUEVO: canales con estado disponible o no disponible
├── NotificationFields.tsx        # NUEVO: asunto, mensaje, prioridad con contador y ayudas por canal
├── ConfirmSendDialog.tsx         # NUEVO: confirmación accesible del envío a varios
├── SendResultPanel.tsx           # NUEVO: resultado del envío individual (aceptada o duplicada)
└── BatchResultTable.tsx          # NUEVO: resultado por destinatario con filtro por estado y resumen

src/pages/
├── NuevaNotificacion.tsx         # NUEVO: individual o varios destinatarios
├── NuevaNotificacion.test.tsx    # NUEVO: pruebas de flujo con MSW
├── Detalle.tsx                   # + acción Reintentar solo en FAILED y RECOVERABLE
└── Listado.tsx                   # + botón "Nueva notificación"

src/routes.tsx                    # + /notificaciones/nueva
src/components/Layout.tsx         # + enlace "Nueva notificación"

src/test/handlers/notifications.ts  # + POST /notifications, :sendBatch y :retry
src/lib/*.test.ts                   # pruebas unitarias junto al código
```

**Structure Decision**: se conserva la estructura plana existente (`src/api`, `src/components`,
`src/hooks`, `src/pages`) y se añaden dos carpetas: `src/lib/` para la lógica pura sin React
(validación, derivación de identificadores, parseo de destinatarios), que es lo más costoso de
equivocar y lo más barato de probar, y `src/components/send/` para agrupar las piezas del formulario
como ya se hizo con `src/components/catalog/`. Ningún archivo existente cambia de ubicación.

## Complexity Tracking

_Sin violaciones que requieran justificación. No se añaden dependencias: la validación es de pocos
campos y no justifica una librería de formularios (ver research.md D8)._
