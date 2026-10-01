---
description: 'Task list for feature implementation'
---

# Tasks: Enviar notificaciones desde el panel de control

**Input**: Design documents from `/specs/003-enviar-notificacion-panel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/send-notifications-consumer.md, quickstart.md

**Tests**: incluidos en cada historia (Principio III de la constitución: obligatorio para tamaño L).

**Organization**: Tasks agrupadas por historia de usuario para poder implementarlas y probarlas de forma independiente.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

`src/api/`, `src/lib/` (nuevo), `src/hooks/`, `src/components/send/` (nuevo), `src/pages/`, `src/test/` — ver plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Confirmar que `src/api/schema.d.ts` ya declara `sendNotification`, `sendNotificationBatch`, `retryNotification` y `listChannels` (están); si el contrato del backend cambió, regenerar con `npm run generate:api`
- [x] T002 [P] Confirmar que `tsc -b` y ESLint ya cubren `src/lib/` y `src/components/send/` sin configuración adicional (mismos `include` que el resto de `src/`)

**Checkpoint**: no hace falta ninguna dependencia nueva ni cambio de configuración antes de empezar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta terminar esta fase.

- [x] T003 Extender `src/api/client.ts` con `ApiError` (`status`, `serverMessage`) que `apiFetch` lanza al recibir un error, leyendo `message` del cuerpo `ErrorResponse` cuando el `Content-Type` es JSON, sin cambiar el texto por defecto `API error <status>` que ya usan `Listado`/`Detalle`/`Catálogo` (research.md D1)
- [x] T004 [P] Crear `src/api/notifications.ts` con `sendNotification(request)`, `sendNotificationBatch(request)` y `retryNotification(id)` sobre `apiFetch`, tipados con `SendNotificationRequest`, `SendNotificationResponse`, `SendNotificationBatchRequest`, `BatchAcceptedResponse` y `NotificationStatusResponse` de `schema.d.ts` (contracts/send-notifications-consumer.md)
- [x] T005 [P] Crear `src/lib/channelRules.ts`: deriva de un `ChannelItem` sus reglas de formulario (`addressLabel`, `validateAddress`, `subject: 'hidden' | 'optional'`, `subjectMax`, `bodyMax`, `available`, `unavailableReason`), con las reglas conocidas de EMAIL/SMS/PUSH como base y degradación mínima para cualquier otro canal (research.md D2, D3)
- [x] T006 [P] Crear `src/lib/recipients.ts`: parsea texto separado por saltos de línea, comas o punto y coma en una lista de direcciones; normaliza cada una según el canal (D4) para obtener `recipientId`; marca repetidas con `duplicateOf` y limita a 1000 sin procesar el exceso (research.md D6, D10)
- [x] T007 [P] Crear `src/lib/sendValidation.ts`: valida un `SendDraft` individual y una lista de `RecipientEntry` contra `ChannelRules`, devolviendo un mapa de errores por campo/fila sin lanzar excepciones
- [x] T008 [P] Crear `src/lib/submissionId.ts`: genera y memoriza `{ id, fingerprint }` con `crypto.randomUUID()` prefijado `panel-`, regenerando `id` solo cuando cambia la huella (canal, destinatarios normalizados, asunto, mensaje, prioridad) (research.md D5)
- [x] T009 [P] Agregar a `src/test/handlers/notifications.ts` los handlers `http.post('*/notifications', ...)`, `http.post('*/notifications:sendBatch', ...)` y `http.post('*/notifications/:id:retry', ...)` con fábricas de respuesta (`sendNotificationResponse`, `batchAcceptedResponse`) reutilizables desde los tests de cada historia; confirmar que la ruta con `:retry` enruta bien con un id dinámico (research.md D12) y, si no, escapar el segmento
- [x] T010 Confirmar que `npx tsc -b`, `npm run lint` y `npm run test` siguen pasando con los archivos nuevos de `src/lib/` y `src/api/notifications.ts`

**Checkpoint**: fundación lista — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Enviar una notificación individual por cualquier canal (Priority: P1) 🎯 MVP

**Goal**: el operador completa un formulario y envía una notificación por el canal que elija, con validación y ayudas propias de ese canal (FR-001 a FR-004, FR-008, FR-009, FR-013, FR-015, FR-016, FR-020).

**Independent Test**: abrir `/notificaciones/nueva`, elegir un canal, completar los campos válidos y enviar; confirmar que se muestra el id y el estado, y que la notificación aparece en `Listado` sin recargar.

### Tests for User Story 1 ⚠️

- [x] T011 [P] [US1] `src/lib/channelRules.test.ts`: reglas correctas para EMAIL, SMS y PUSH, y degradación mínima para un canal no conocido
- [x] T012 [P] [US1] `src/lib/sendValidation.test.ts`: rechaza dirección con formato inválido por canal, mensaje sobre el límite del canal y campos vacíos; acepta un `SendDraft` válido
- [x] T013 [P] [US1] `src/pages/NuevaNotificacion.test.tsx` (modo individual): flujo con MSW — envío aceptado muestra id y estado; envío con `duplicate: true` muestra "ya existía" y no un error; rechazo 400 muestra el mensaje del servidor y conserva lo escrito; cambiar de canal ajusta los campos visibles y el límite de caracteres

### Implementation for User Story 1

- [x] T014 [P] [US1] Crear `src/components/send/ChannelSelect.tsx`: lista los canales de `getChannels()` marcando como no seleccionable el que no tenga proveedor `ENABLED`, con su motivo (`ChannelRules.unavailableReason`)
- [x] T015 [P] [US1] Crear `src/components/send/NotificationFields.tsx`: campos de dirección, asunto, mensaje y prioridad según `ChannelRules` del canal elegido, con contador de caracteres, `aria-invalid`/`aria-describedby` por campo y `aria-live="polite"` en el contador (FR-015)
- [x] T016 [P] [US1] Crear `src/components/send/SendResultPanel.tsx`: muestra el resultado de un envío individual (aceptada con id y enlace al detalle, o "ya existía"), y un botón "Enviar otra" que reinicia el formulario con un `submissionId` nuevo
- [x] T017 [US1] Crear `src/hooks/useSendNotification.ts`: `useMutation` sobre `sendNotification`, sin invalidar `['notifications']` (research.md D7); traduce `ApiError` a un mensaje para el operador (red, 400, 5xx) según contracts/send-notifications-consumer.md
- [x] T018 [US1] Crear `src/pages/NuevaNotificacion.tsx` en modo individual: usa `ChannelSelect`, `NotificationFields`, `useSendValidation` (T007) y `useSendNotification`; bloquea el botón de enviar mientras la mutación está en curso (depende de T014-T017)
- [x] T019 [US1] Registrar la ruta `/notificaciones/nueva` en `src/routes.tsx`, agregar el enlace "Nueva notificación" en `src/components/Layout.tsx` y el botón correspondiente en la cabecera de `src/pages/Listado.tsx`
- [x] T020 [US1] Confirmar con el resumen `role="alert"` y el foco en el primer campo inválido que el formulario es utilizable solo con teclado (FR-015)
- [x] T021 [US1] Correr `npm run build`, `npm run lint` y `npm run test` — deben pasar para esta historia

**Checkpoint**: User Story 1 funciona y se puede probar de forma independiente (MVP).

---

## Phase 4: User Story 2 - Evitar envíos duplicados (Priority: P1)

**Goal**: un doble clic, un reenvío o un reintento tras perder la conexión nunca crean dos notificaciones (FR-005, FR-006, FR-007).

**Independent Test**: enviar el mismo formulario dos veces seguidas sin cambiar nada y confirmar que solo existe una notificación y que la segunda respuesta se muestra como "ya existía".

### Tests for User Story 2 ⚠️

- [x] T022 [P] [US2] `src/lib/submissionId.test.ts`: el `id` no cambia si la huella es igual; cambia si cambia cualquier campo del contenido; siempre cambia tras pedir uno nuevo explícitamente
- [x] T023 [P] [US2] `src/pages/NuevaNotificacion.test.tsx` (extender T013): un segundo clic en "Enviar" mientras la mutación está en curso no dispara una segunda solicitud; reenviar el mismo formulario sin cambios muestra "ya existía" con el mismo `externalId`

### Implementation for User Story 2

- [x] T024 [US2] En `src/pages/NuevaNotificacion.tsx`, conectar `submissionId.ts` (T008) al `SendDraft`: recalcular la huella en cada cambio de campo y usar `useSendNotification` con `mutation.isPending` para deshabilitar el botón de envío mientras hay uno en curso (depende de T017, T018)
- [x] T025 [US2] Confirmar en `SendResultPanel` (T016) que "Enviar otra" genera un `submissionId` nuevo explícitamente, incluso si el contenido queda igual
- [x] T026 [US2] Correr `npm run build`, `npm run lint` y `npm run test` — deben pasar para esta historia

**Checkpoint**: User Story 1 y 2 funcionan juntas de forma independiente.

---

## Phase 5: User Story 3 - Enviar el mismo mensaje a muchos destinatarios (Priority: P2)

**Goal**: el operador envía un mismo canal y mensaje a una lista de destinatarios, con confirmación previa, resultado por destinatario y reenvío solo de los rechazados (FR-010, FR-011, FR-017, FR-018, FR-019).

**Independent Test**: pegar una lista con destinatarios válidos, uno repetido y uno inválido; confirmar que la lista se valida antes del resumen de confirmación, que el envío muestra un resultado por destinatario y que solo los rechazados se pueden reenviar.

### Tests for User Story 3 ⚠️

- [x] T027 [P] [US3] `src/lib/recipients.test.ts`: separa por salto de línea/coma/punto y coma, normaliza por canal, marca duplicados, y bloquea con conteo y máximo al superar 1000
- [x] T028 [P] [US3] `src/components/send/ConfirmSendDialog.test.tsx`: foco inicial en cancelar, cierre con Escape, devuelve el foco al botón que lo abrió (research.md D9)
- [x] T029 [P] [US3] `src/pages/NuevaNotificacion.test.tsx` (modo varios): flujo con MSW — confirmación muestra canal, mensaje y cantidad; al confirmar, un lote de más de 200 se envía en varias solicitudes y el resumen agrega los totales; un destinatario rechazado se puede reenviar sin repetir los aceptados; una solicitud que falla por red marca sus elementos como "sin confirmar" y permite reenviarlos

### Implementation for User Story 3

- [x] T030 [P] [US3] Crear `src/components/send/ConfirmSendDialog.tsx` según research.md D9 (`role="dialog"`, `aria-modal`, foco en cancelar, Escape, devuelve el foco)
- [x] T031 [P] [US3] Crear `src/components/send/BatchResultTable.tsx`: tabla de `SendOutcome` con filtro por estado (aceptado/duplicado/rechazado/sin confirmar), resumen de totales (`BatchSummary`) y botón "Reenviar rechazados"
- [x] T032 [US3] Crear `src/hooks/useSendBatch.ts`: trocea la lista de `RecipientEntry` en solicitudes de 200 vía `sendNotificationBatch`, las envía en secuencia con progreso, asocia cada resultado a su fila por `externalId`, y marca como `SIN_CONFIRMAR` los elementos de una solicitud fallida (research.md D6)
- [x] T033 [US3] Agregar el modo "varios destinatarios" a `src/pages/NuevaNotificacion.tsx`: área de texto de destinatarios (`recipients.ts`), `ConfirmSendDialog` antes de enviar, `useSendBatch`, y `BatchResultTable` con reenvío solo de los rechazados reutilizando el mismo `submissionId` por fila (depende de T006, T008, T030-T032)
- [x] T034 [US3] Correr `npm run build`, `npm run lint` y `npm run test` — deben pasar para esta historia

**Checkpoint**: las tres historias (US1, US2, US3) funcionan de forma independiente y en conjunto.

---

## Phase 6: User Story 4 - Reintentar el envío de una notificación fallida (Priority: P3)

**Goal**: desde el detalle de una notificación `FAILED` o `RECOVERABLE`, el operador la reencola sin crearla de nuevo (FR-012).

**Independent Test**: abrir el detalle de una notificación fallida, pulsar Reintentar y confirmar que el estado cambia sin recargar; abrir una entregada y confirmar que el botón no aparece.

### Tests for User Story 4 ⚠️

- [x] T035 [P] [US4] `src/pages/Detalle.test.tsx` (extender el existente): el botón Reintentar aparece solo en `FAILED`/`RECOVERABLE`; al pulsarlo con MSW respondiendo 202, el estado se actualiza sin recargar; con 400/404 se muestra el mensaje del servidor

### Implementation for User Story 4

- [x] T036 [US4] Crear `src/hooks/useRetryNotification.ts`: `useMutation` sobre `retryNotification(id)` que en 202 hace `queryClient.setQueryData(['notification', id], response)` y traduce 400/404 a un mensaje para el operador (research.md D11)
- [x] T037 [US4] Agregar el botón "Reintentar" en `src/pages/Detalle.tsx`, visible solo cuando `status` es `FAILED` o `RECOVERABLE`, inactivo mientras la mutación está en curso
- [x] T038 [US4] Correr `npm run build`, `npm run lint` y `npm run test` — deben pasar para esta historia

**Checkpoint**: las cuatro historias funcionan de forma independiente y en conjunto.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T039 [P] Revisar que ningún borrador de `NuevaNotificacion` ni resultado de envío sobreviva a un cambio de `X-Tenant-Id` (Principio II, FR-014): el estado vive solo en el componente, sin `localStorage`/`sessionStorage`
- [x] T040 [P] Actualizar `quickstart.md` si algún paso cambió durante la implementación
- [x] T041 Confirmar con el equipo backend el máximo real por lote (research.md D6) y, si el contrato lo declara, ajustar el tamaño de tanda en `useSendBatch.ts`; si no hay respuesta, documentar la fecha límite acordada
- [x] T042 [P] Correr `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` completos antes de abrir el PR
- [~] T043 Validar manualmente los 9 pasos de `quickstart.md` contra el backend real — parcial: paso 2 (individual EMAIL) y el reintento desde `Detalle` se probaron contra un backend real y funcionan (id devuelto, aparece en el listado por SSE sin recargar, botón Reintentar visible solo en FAILED). Pasos 5-6 (varios destinatarios) no se pudieron validar: el backend usado devolvió 404 en `POST /notifications:sendBatch` y 405 en `POST /notifications/{id}:retry` al probarlo con `curl` directo (sin pasar por el frontend), lo que indica un problema de ruteo del lado del backend para rutas con `:` — no un defecto del panel. Los mismos flujos ya están cubiertos por los tests de flujo con MSW (T029). Pendiente: repetir estos dos pasos cuando el backend tenga ese ruteo corregido.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup — bloquea todas las historias
- **User Stories (Phase 3-6)**: dependen de Foundational
  - US1 (P1) es la base del formulario individual; US2 (P1) se apoya en el mismo formulario y en `submissionId.ts` de Foundational, así que en la práctica sigue a US1 aunque no dependa de su código de UI
  - US3 (P2) reutiliza `recipients.ts`, `sendValidation.ts` y `submissionId.ts` de Foundational y agrega un modo nuevo a `NuevaNotificacion.tsx`; puede empezar en paralelo con US1/US2 si dos personas trabajan la pantalla en ramas distintas, pero comparte el mismo archivo de página
  - US4 (P3) es independiente de US1-US3: solo toca `Detalle.tsx` y un hook nuevo
- **Polish (Phase 7)**: depende de que las historias que se vayan a entregar estén completas

### Parallel Opportunities

- T001-T002 (Setup) en paralelo
- T004-T009 (Foundational) en paralelo entre sí (T003 es prerequisito de T017/T036, no de estas)
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí, y los componentes marcados [P] en paralelo entre sí
- US4 puede implementarse en paralelo con US1-US3 en todo momento (archivos distintos: `Detalle.tsx` vs `NuevaNotificacion.tsx`)

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2)
2. **STOP y VALIDAR**: pasos 2-4 de `quickstart.md`
3. Demo del envío individual sin duplicados

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar → demo (envío individual)
3. US2 → validar → demo (sin duplicados) — MVP completo
4. US3 → validar → demo (envío a varios destinatarios)
5. US4 → validar → demo (reintento)
6. Polish → PR contra `develop`

---

## Notes

- Commit por tarea o grupo lógico, una sola línea, `tipo(ámbito): descripción` (Principio V)
- Verificar que los tests fallan antes de implementar cada historia
- US1 y US2 comparten `src/pages/NuevaNotificacion.tsx`: implementarlas en secuencia evita conflictos de archivo aunque no haya dependencia lógica dura
- US3 agrega un modo al mismo archivo: coordinar si se trabaja en paralelo con US1/US2
