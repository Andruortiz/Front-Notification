# Phase 0 Research: Ver notificaciones en tiempo real en el panel

## Decisión 1 — Cliente SSE: `@microsoft/fetch-event-source`, no `EventSource` nativo

**Decision**: Consumir `GET /notifications:subscribe` con `@microsoft/fetch-event-source` (v2.0.1),
envolviendo `fetch` para poder mandar headers arbitrarios.

**Rationale**:
- `EventSource` nativo no permite headers personalizados, y el endpoint exige `X-Tenant-Id` (Principio
  II de la constitución: placeholder de tenant mientras CU-10 sigue bloqueado). No hay forma de
  cumplir el contrato con `EventSource` sin mover el tenant a query string, lo cual cambiaría el
  contrato del backend — descartado, ya se decidió con el usuario no tocar el backend.
- La librería reintenta la conexión sola (backoff exponencial) igual que `EventSource`, así que
  FR-004/US3 (resync tras reconexión) no requiere lógica de reintento propia.
- Respeta `document.visibilityState` por default (cierra la conexión con la pestaña oculta y
  reabre al volver a foco) — alineado con FR-006 (no mantener conexiones innecesarias) sin
  código adicional. No se pasa `openWhenHidden: true`.
- Ya viene tipada (`lib/cjs/index.d.ts`), sin necesitar `@types/*` aparte.

**Alternatives considered**:
- **`EventSource` nativo + tenant por query param**: descartado — requeriría un cambio de contrato en
  el backend (aceptar `X-Tenant-Id` también por query) que el usuario decidió no hacer.
- **`fetch` + `ReadableStream` manual**: descartado — reimplementa parseo de `event:`/`data:`/
  comentarios de keep-alive y reintentos con backoff que `fetch-event-source` ya resuelve
  correctamente (incluyendo el caso de mensajes multi-línea `data:`), sin beneficio adicional para
  esta historia.

## Decisión 2 — Regenerar `src/api/schema.d.ts` apuntando al backend en ejecución

**Decision**: Nuevo script `npm run generate:api` que corre
`openapi-typescript http://localhost:8060/openapi/api-notificaciones.yaml -o src/api/schema.d.ts`
(el backend expone ese YAML como recurso estático de Spring Boot). Se ejecuta una vez, a mano, al
iniciar esta historia (con el backend corriendo localmente) y se commitea el resultado — no es un
paso de build ni de CI, igual que hoy.

**Rationale**:
- Evita depender de una ruta de archivo a otro repo local (`../Notification-uco/...`), que no existe
  en otras máquinas ni en CI.
- El backend ya sirve el YAML como archivo estático (`infrastructure/src/main/resources/static/openapi/
  api-notificaciones.yaml`), así que `http://localhost:8060/openapi/api-notificaciones.yaml` es
  válido en cualquier entorno donde el backend corra en ese puerto (coincide con el proxy de
  `vite.config.ts`).
- `openapi-typescript` soporta URLs remotas como input de forma nativa, sin dependencias nuevas.

**Alternatives considered**:
- **Copiar el YAML a este repo** (`openapi/api-notificaciones.yaml` versionado aquí): descartado —
  crea una segunda fuente de verdad que se desincroniza (es exactamente el problema que ya causó el
  bug de tipos resuelto en HU2-070); apuntar al backend en ejecución evita esa duplicación.
- **Publicar el contrato en un registro/paquete npm privado**: fuera de alcance — no existe
  infraestructura para eso hoy, y sería sobre-ingeniería para dos repos que ya conviven en la misma
  máquina de desarrollo.

## Decisión 3 — Integración con TanStack Query: parchear la cache, no reemplazarla

**Decision**: El Listado conserva su `useQuery(['notifications'], ...)` actual (`GET /notifications`)
para la carga inicial y sus estados de loading/error ya probados. Un hook nuevo,
`useNotificationsLiveFeed`, abre la conexión SSE y en cada evento hace
`queryClient.setQueryData(['notifications'], updater)` para insertar/actualizar (`UPSERT`) o quitar
(`REMOVE`) el ítem correspondiente por `notificationId`, en vez de invalidar y refetchear en cada
evento.

Para el Detalle, en cambio, el hook de vivo NO trae los datos — solo dispara
`queryClient.invalidateQueries({ queryKey: ['notification', id] })` cuando llega un evento cuyo
`notification.notificationId` coincide con el id abierto. El Detalle sigue usando
`GET /notifications/{id}` (`NotificationStatusResponse`) como única fuente de verdad para su
render, porque ese shape trae `providerId`/`lastUpdatedAt` que `NotificationHistoryItem` no expone
directamente (habría que derivarlos de `deliveryAttempts`, con riesgo de divergencia sutil frente al
endpoint dedicado).

**Rationale**:
- `setQueryData` incremental evita una ráfaga de refetches HTTP cuando llegan varios eventos
  seguidos (edge case ya identificado: "una notificación cambia de estado más de una vez en un lapso
  muy corto") — la UI se actualiza desde el propio payload del evento, sin ida y vuelta a
  `GET /notifications`.
- El endpoint de suscripción no filtra por `notificationId` (solo `recipientId`/`channelType`/
  `status`/rango de fechas), así que el Detalle no puede pedir "solo esta notificación" al backend;
  igual recibe el feed completo del tenant y filtra client-side por id, pero reutiliza el endpoint ya
  probado (`getNotificationStatus`) para el shape de datos en vez de reconstruirlo a mano.
- Reutilizar la cache existente de React Query (en vez de un estado paralelo) evita divergencia entre
  "lo que muestra la pantalla" y "lo que React Query cree que tiene cacheado".

**Alternatives considered**:
- **Estado local propio (`useState`/`useReducer` con un `Map`) en vez de la cache de React Query**:
  descartado para el Listado — funcionaría, pero duplica una fuente de verdad que React Query ya
  administra (loading/error/data), y complica reutilizar esos mismos datos si otra pantalla los
  necesitara más adelante.
- **Hacer que Detalle consuma directamente `NotificationHistoryItem` del feed**: descartado por el
  riesgo de divergencia de shape mencionado arriba; el costo de un refetch adicional puntual al
  endpoint dedicado es aceptable frente a ese riesgo.

## Decisión 4 — Resync en reconexión: confiar en la "foto vigente" que ya reenvía el backend

**Decision**: `useNotificationsLiveFeed` limpia su vista de `['notifications']` a una lista vacía solo
cuando el estado pasa a `open` **después** de haber pasado por `reconnecting` (una reconexión real,
no la conexión inicial) — justo antes de que lleguen los eventos `UPSERT` de la ráfaga que el backend
ya reenvía en esa conexión nueva (ver `specs/006-dashboard-tiempo-real` del backend: "una reconexión
... siempre reproduce la foto vigente"). La conexión inicial NO limpia nada, para no generar un
parpadeo de "sin datos" en la primera carga (la carga inicial ya la resuelve el `useQuery` existente
de `GET /notifications`). No se implementa ningún mecanismo de resync propio más allá de eso.

**Rationale**:
- El contrato del backend ya resuelve FR-004/US3 por diseño — cualquier reconexión (inicial o tras una
  caída) siempre entrega primero la foto completa vigente como una ráfaga de `UPSERT`. Duplicar esa
  lógica en el frontend sería redundante.
- Limpiar en `onopen` evita que una fila que dejó de cumplir los filtros durante la desconexión quede
  "pegada" en pantalla (el backend no manda un `REMOVE` explícito para lo que ya no está en la foto
  vigente, solo dice qué SÍ está vigente).

**Alternatives considered**:
- **No limpiar en `onopen`, confiar solo en los `REMOVE` explícitos**: descartado — el contrato del
  backend no garantiza un `REMOVE` para cada fila que ya no aplica tras una reconexión, solo para
  cambios ocurridos con la conexión abierta.

## Decisión 5 — Indicador de conexión: local a cada pantalla, no global en el nav

**Decision**: `useNotificationsLiveFeed`/`useNotificationLiveStatus` exponen un
`connectionState: 'connecting' | 'open' | 'reconnecting' | 'closed'`, mostrado con un componente
`LiveConnectionBadge` en el encabezado de Listado y de Detalle — no en `Layout.tsx`.

**Rationale**:
- Cada pantalla abre su propia conexión (se cierra al desmontar, FR-006); un indicador global en el
  nav implicaría una conexión compartida entre pantallas o un estado global sin dueño claro, que esta
  historia no necesita — el alcance es "esta pantalla está al día", no "el panel en general".

**Alternatives considered**:
- **Contexto global `LiveConnectionProvider` compartido entre pantallas**: descartado por ahora —
  sobre-ingeniería para dos pantallas que ya manejan su propio ciclo de vida de conexión; se
  reconsidera si una tercera pantalla necesita el mismo feed.

## Decisión 6 — Pruebas: bootstrap de Vitest + Testing Library + MSW (no existe hoy)

**Decision**: Esta historia agrega el tooling de pruebas que la constitución exige (Principio III)
pero que el proyecto todavía no tiene instalado: `vitest`, `@testing-library/react`,
`@testing-library/jest-dom`, `jsdom`, `msw` (v2). Se agrega `vitest.config.ts` (o sección `test` en
`vite.config.ts`), un script `npm run test`, y se suma al pipeline de CI (`.github/workflows/ci.yml`,
job nuevo `test`).

**Rationale**:
- La constitución (Principio III) exige pruebas para toda historia y, en particular, al menos una
  prueba de flujo con MSW para historias de tamaño M o mayor — esta lo es. No instalar el tooling
  ahora dejaría la historia sin cumplir su propia gobernanza.
- MSW v2 intercepta a nivel de red (incluye `fetch`) y soporta responder con un body `ReadableStream`,
  suficiente para simular `text/event-stream` en las pruebas de `useNotificationsLiveFeed` sin
  necesitar un servidor SSE real en el entorno de pruebas.

**Alternatives considered**:
- **Dejar el tooling de pruebas para una historia aparte, implementar esta sin pruebas**: descartado
  — viola el Principio VII (sin atajos) y el III explícitamente.
