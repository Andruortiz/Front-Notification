# Contrato consumido: `GET /notifications:subscribe`

Este archivo documenta cómo el frontend consume un endpoint que **ya existe** en el backend
(`Notification-uco`, historia `006-dashboard-tiempo-real`) — no define un contrato nuevo. La fuente
de verdad sigue siendo `api-notificaciones.yaml` del backend; este documento es una referencia rápida
para implementar el cliente sin tener que saltar al otro repo.

## Request

```
GET /notifications:subscribe?recipientId=&channelType=&status=&from=&to=
Accept: text/event-stream
X-Tenant-Id: <tenant>
```

- Todos los query params son opcionales. Esta historia (ver Assumptions de `spec.md`) los consume sin
  UI de filtros todavía: Listado se suscribe sin ningún filtro; Detalle tampoco filtra (no existe
  filtro por `notificationId`), filtra client-side por id.
- El header `X-Tenant-Id` es obligatorio (mismo valor que ya usa `apiFetch`, ver
  `src/api/client.ts`).

## Response (stream, nunca termina mientras el cliente no cierre)

Eventos con nombre `update`:

```
event: update
data: {"action":"UPSERT","notification":{"notificationId":"...","status":"DELIVERED",...}}
```

Comentarios de keep-alive cada 15s (sin `event:` ni `data:`, el parser de `fetch-event-source` los
ignora sin disparar `onmessage`):

```
: keep-alive
```

- **Al conectar (primera vez o tras reconexión)**: el backend reproduce primero la foto vigente
  (equivalente a `GET /notifications` sin paginar, tope 200) como una ráfaga de eventos `UPSERT`, y
  luego continúa con cambios en vivo. El cliente no necesita ningún parámetro de reanudación.
- **No hay evento de "fin de la foto inicial"** — el cliente no puede distinguir "esto es parte del
  snapshot inicial" de "esto es un cambio en vivo posterior"; no lo necesita, porque ambos casos se
  resuelven igual (`UPSERT` = mostrar/actualizar esa fila).

## Cliente (este repo)

`src/api/liveUpdates.ts` (nuevo):

```ts
subscribeToNotificationUpdates(
  filters: { recipientId?: string; channelType?: string; status?: NotificationStatus; from?: string; to?: string },
  handlers: {
    onOpen: () => void;
    onUpdate: (update: NotificationLiveUpdate) => void;
    onStateChange: (state: LiveConnectionState) => void;
  },
  signal: AbortSignal,
): void
```

Envuelve `fetchEventSource` de `@microsoft/fetch-event-source`; construye la URL con
`URLSearchParams` a partir de `filters` (omite claves `undefined`), agrega `X-Tenant-Id` igual que
`apiFetch`, y traduce `onopen`/`onmessage`/`onerror`/`onclose` de la librería a los tres callbacks de
arriba. Se cierra pasando un `AbortController` propio, abortado en el cleanup del `useEffect` del hook
que lo use (ver `data-model.md` para el estado que expone cada hook).
