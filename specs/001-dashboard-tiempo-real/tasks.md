---
description: "Task list for feature implementation"
---

# Tasks: Ver notificaciones en tiempo real en el panel

**Input**: Design documents from `/specs/001-dashboard-tiempo-real/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/subscribe-notifications-consumer.md, quickstart.md

**Tests**: incluidos en cada historia (Principio III de la constitución: obligatorio para tamaño M+).

**Organization**: Tasks agrupadas por historia de usuario para poder implementarlas y probarlas de forma independiente.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

`src/api/`, `src/hooks/` (nuevo), `src/components/`, `src/pages/`, `src/test/` (nuevo) — ver plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Con el backend `Notification-uco` corriendo en `localhost:8060`, correr `npx openapi-typescript http://localhost:8060/openapi/api-notificaciones.yaml -o src/api/schema.d.ts` y commitear el resultado (research.md Decisión 2)
- [ ] T002 Agregar el script `"generate:api": "openapi-typescript http://localhost:8060/openapi/api-notificaciones.yaml -o src/api/schema.d.ts"` a `package.json`
- [ ] T003 Instalar dependencia de runtime `@microsoft/fetch-event-source` en `package.json`
- [ ] T004 [P] Instalar dependencias de desarrollo: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`
- [ ] T005 [P] Configurar Vitest (sección `test` en `vite.config.ts` o `vitest.config.ts` nuevo: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`) y agregar el script `"test": "vitest run"` a `package.json`
- [ ] T006 [P] Agregar el job `test` (`npm run test`) a `.github/workflows/ci.yml`, en paralelo a `lint`/`typecheck`, y agregarlo como dependencia de `build`

**Checkpoint**: `npx tsc -b` compila con el schema regenerado; `npm run test` corre (aunque sin specs todavía) sin errores de configuración.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta terminar esta fase.

- [ ] T007 Crear `src/api/liveUpdates.ts` con `subscribeToNotificationUpdates(filters, handlers, signal)` envolviendo `fetchEventSource` (contracts/subscribe-notifications-consumer.md): agrega `X-Tenant-Id`, construye query params desde `filters` omitiendo `undefined`, traduce `onopen`/`onmessage`/`onerror`/`onclose` a `onOpen`/`onUpdate`/`onStateChange`
- [ ] T008 [P] Crear `src/components/LiveConnectionBadge.tsx` (`connecting | open | reconnecting | closed` → texto + color, sin pisar la paleta de `NotificationStatus`, Principio VIII)
- [ ] T009 [P] Crear `src/test/setup.ts` (importa `@testing-library/jest-dom`, limpia MSW/Testing Library entre tests)
- [ ] T010 [P] Crear `src/test/server.ts` (servidor MSW compartido, `setupServer(...handlers)`, `beforeAll(listen)`/`afterEach(resetHandlers)`/`afterAll(close)` en `src/test/setup.ts`)
- [ ] T011 [P] Crear `src/test/handlers/notifications.ts`: handlers REST para `GET /notifications` y `GET /notifications/:id` (respuestas fijas de prueba), más un handler para `GET /notifications:subscribe` que responde `text/event-stream` con un `ReadableStream` controlable desde el test (para emitir eventos `update` a demanda)
- [ ] T012 Confirmar que `npx tsc -b`, `npm run lint` y `npm run test` (sin specs de historia todavía) siguen pasando con la estructura nueva

**Checkpoint**: fundación lista — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - El listado se actualiza solo (Priority: P1) 🎯 MVP

**Goal**: cada fila del listado refleja su estado más reciente sin recargar ni repetir la búsqueda (FR-001, FR-003, FR-005).

**Independent Test**: con el listado montado (test), emitir un evento `UPSERT` con un `notificationId` ya presente y confirmar que la fila se actualiza en el mismo lugar, sin duplicarse; emitir uno con un `notificationId` nuevo y confirmar que aparece.

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] `src/hooks/useNotificationsLiveFeed.test.ts`: dado un `UPSERT` de un id existente en `['notifications']`, el hook actualiza esa fila in-place; dado un `UPSERT` de un id nuevo, lo agrega; dado un `REMOVE`, lo quita
- [ ] T014 [P] [US1] `src/pages/Listado.test.tsx`: flujo con MSW — carga inicial vía `GET /notifications`, luego el handler SSE emite un `update`, y la fila correspondiente cambia de estado en pantalla sin una segunda request a `GET /notifications`

### Implementation for User Story 1

- [ ] T015 [US1] Crear `src/hooks/useNotificationsLiveFeed.ts`: abre la conexión con `subscribeToNotificationUpdates` (sin filtros), en `onUpdate` hace `queryClient.setQueryData(['notifications'], ...)` upsert/remove por `notificationId` dentro de `items`; expone `connectionState`
- [ ] T016 [US1] Integrar `useNotificationsLiveFeed` en `src/pages/Listado.tsx` y renderizar `<LiveConnectionBadge />` en el `page-header`
- [ ] T017 [US1] Confirmar que el `useEffect` del hook aborta la conexión (`AbortController`) al desmontar `Listado`
- [ ] T018 [US1] Correr `npm run build`, `npm run lint` y `npm run test` — deben pasar para esta historia

**Checkpoint**: User Story 1 funciona y se puede probar de forma independiente (MVP).

---

## Phase 4: User Story 2 - El detalle se actualiza solo (Priority: P2)

**Goal**: el detalle de una notificación abierta refleja su estado más reciente mientras la pantalla está montada (FR-002).

**Independent Test**: con el detalle de un id abierto (test), emitir un evento con ese mismo `notificationId` y confirmar que se dispara un refetch de `['notification', id]`; emitir uno con otro id y confirmar que NO se dispara.

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] `src/hooks/useNotificationLiveStatus.test.ts`: invalida `['notification', id]` solo cuando `notification.notificationId === id`; ignora cualquier otro evento
- [ ] T020 [P] [US2] `src/pages/Detalle.test.tsx`: flujo con MSW — carga inicial vía `GET /notifications/{id}`, el handler SSE emite un evento para ese mismo id con `status: 'DELIVERED'`, y el detalle se re-renderiza con el nuevo estado sin recargar

### Implementation for User Story 2

- [ ] T021 [US2] Crear `src/hooks/useNotificationLiveStatus.ts`: se suscribe sin filtros, en `onUpdate` compara `notification.notificationId` contra el `id` recibido y, si coincide, llama `queryClient.invalidateQueries({ queryKey: ['notification', id] })`; expone `connectionState`
- [ ] T022 [US2] Integrar `useNotificationLiveStatus(id)` en `src/pages/Detalle.tsx` y renderizar `<LiveConnectionBadge />` junto al `StatusBadge` existente
- [ ] T023 [US2] Confirmar que el hook cierra la conexión anterior y abre una nueva si `id` cambia, y aborta al desmontar
- [ ] T024 [US2] Correr `npm run build`, `npm run lint` y `npm run test` — deben pasar para esta historia

**Checkpoint**: User Story 1 y 2 funcionan juntas de forma independiente.

---

## Phase 5: User Story 3 - Recuperar la vista tras una desconexión (Priority: P3)

**Goal**: al reconectar, la vista queda al día sin intervención del operador (FR-004).

**Independent Test**: simular en el test que `onopen` se dispara una segunda vez (reconexión) después de que el listado ya tenía filas de una conexión anterior, seguido de una nueva ráfaga `UPSERT` distinta; confirmar que la vista final refleja solo la nueva ráfaga, sin filas viejas remanentes.

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] `src/hooks/useNotificationsLiveFeed.test.ts` (extender T013): tras un segundo `onopen` seguido de una ráfaga `UPSERT` que no incluye un id previamente visible, ese id deja de estar en `['notifications']`
- [ ] T026 [P] [US3] `src/components/LiveConnectionBadge.test.tsx`: renderiza el texto/color correcto para cada `connectionState`, incluida la transición `open → reconnecting → open`

### Implementation for User Story 3

- [ ] T027 [US3] En `useNotificationsLiveFeed` y `useNotificationLiveStatus`, limpiar el estado relevante en cada `onOpen` (antes de aplicar la ráfaga siguiente) por research.md Decisión 4
- [ ] T028 [US3] Confirmar que `connectionState` transiciona `connecting → open`, y ante un error de red, `open → reconnecting → open` (delegado a `fetch-event-source`, solo se traduce su callback)
- [ ] T029 [US3] Validar manualmente el Escenario 3 de `quickstart.md` (cortar red en DevTools, cambiar estado en backend, reconectar)

**Checkpoint**: las tres historias funcionan de forma independiente y en conjunto.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Revisar `src/api/liveUpdates.ts`: ninguna conexión sobrevive a un cambio de `X-Tenant-Id` (Principio II) — cerrar y reabrir si el tenant configurado cambia
- [ ] T031 [P] Actualizar `quickstart.md` si algún paso cambió durante la implementación
- [ ] T032 Actualizar los TODOs de `.specify/memory/constitution.md`: la decisión de cliente SSE (Restricciones técnicas) y el pipeline de CI (Flujo de desarrollo) ya no están pendientes — proponer al usuario una enmienda menor de versión si aprueba ratificarlo
- [ ] T033 [P] Correr `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` completos antes de abrir el PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — requiere el backend corriendo localmente solo para T001
- **Foundational (Phase 2)**: depende de Setup — bloquea todas las historias
- **User Stories (Phase 3-5)**: dependen de Foundational; US1 es la única con dependencia dura (US2 y US3 reutilizan `liveUpdates.ts` y `LiveConnectionBadge` de Foundational, no de US1)
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas

### Parallel Opportunities

- T003-T006 (Setup) en paralelo
- T008-T011 (Foundational) en paralelo entre sí (T007 es prerequisito de T015/T021, no de estos)
- Tests marcados [P] dentro de cada historia, en paralelo entre sí
- US2 puede implementarse en paralelo con US1 una vez completa Foundational (ambas dependen solo de `liveUpdates.ts`, no una de la otra)

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 → Phase 2 → Phase 3 (US1)
2. **STOP y VALIDAR**: Escenario 1 de `quickstart.md`
3. Demo del listado en tiempo real

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar → demo (MVP)
3. US2 → validar → demo
4. US3 → validar → demo
5. Polish → PR contra `develop`

---

## Notes

- Commit por tarea o grupo lógico, una sola línea, `tipo(ámbito): descripción` (Principio V)
- Verificar que los tests fallan antes de implementar cada historia
- No hay dependencias cruzadas que rompan la independencia de US1/US2/US3
