# Quickstart: validar el panel en tiempo real

## Prerrequisitos

- Backend `Notification-uco` corriendo localmente en `http://localhost:8060` (`docker-compose up` +
  la app Spring Boot), con RabbitMQ y Mongo levantados — el feed en vivo depende del consumidor
  fanout descrito en `Notification-uco/specs/006-dashboard-tiempo-real/research.md`.
- `npm run generate:api` corrido al menos una vez contra ese backend (ver `research.md`, Decisión 2),
  para que `src/api/schema.d.ts` tenga `NotificationSearchResponse`/`NotificationLiveUpdate`.
- `npm install` (trae `@microsoft/fetch-event-source`, `vitest`, `@testing-library/react`, `msw`).

## Escenario 1 — Listado se actualiza solo (US1)

1. `npm run dev`, abrir `/` (Listado).
2. En otra terminal, aceptar una notificación: `POST /notifications` contra el backend (ver README
   del backend para el payload mínimo).
3. Confirmar en la UI, sin recargar: la fila aparece en el listado en ≤5s (SC-001).
4. Dejar que el backend la despache/entregue (o forzar un fallo) y confirmar que el estado de esa
   misma fila cambia in-place, sin duplicarse (FR-003).

## Escenario 2 — Detalle se actualiza solo (US2)

1. Desde el listado, entrar al detalle de una notificación en `FAILED` o `RECOVERABLE`.
2. Disparar un reintento (`POST /notifications/{id}:retry` contra el backend, a mano por ahora — el
   botón de reintento en UI es una historia aparte).
3. Confirmar que el detalle pasa a `DELIVERED` (o al estado que corresponda) sin recargar la página.

## Escenario 3 — Resync tras reconexión (US3)

1. Con el listado abierto, cortar la red del navegador (DevTools → Network → Offline) unos segundos.
2. Cambiar el estado de una notificación visible desde el backend mientras está "offline".
3. Restaurar la red y confirmar que el listado queda al día en ≤5s sin recargar (SC-002), y que el
   indicador de conexión pasó por `reconnecting` y volvió a `open`.

## Pruebas automatizadas

```bash
npm run test        # Vitest + Testing Library, handlers MSW en src/test/handlers
npm run lint
npm run typecheck
npm run build
```

`useNotificationsLiveFeed.test.ts` y `useNotificationLiveStatus.test.ts` simulan el stream SSE con un
handler MSW que responde `text/event-stream` (ver Decisión 6 de `research.md`) — no requieren el
backend real corriendo.
