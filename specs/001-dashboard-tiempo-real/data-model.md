# Phase 1 Data Model: Ver notificaciones en tiempo real en el panel

Esta historia no agrega entidades de dominio nuevas — el servidor ya modela todo lo necesario
(`NotificationHistoryItem`, `NotificationStatus`, `DeliveryAttempt`, ver `schema.d.ts` regenerado).
Lo que agrega son dos tipos puramente de UI/estado del cliente.

## `NotificationLiveUpdate` (consumido, no generado a mano)

Viene de `components['schemas']['NotificationLiveUpdate']` en el `schema.d.ts` regenerado:

| Campo          | Tipo                             | Notas                                              |
|----------------|-----------------------------------|-----------------------------------------------------|
| `action`       | `'UPSERT' \| 'REMOVE'`            | UPSERT: mostrar/actualizar. REMOVE: quitar de vista. |
| `notification` | `NotificationHistoryItem`         | Mismo shape que un ítem de `NotificationSearchResponse.items`. |

## `LiveConnectionState` (nuevo, solo cliente)

```ts
type LiveConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';
```

- `connecting`: primer intento de conexión, sin datos todavía recibidos en esta conexión.
- `open`: conexión activa (`onopen` disparado, sin error desde entonces).
- `reconnecting`: `fetch-event-source` está reintentando tras un error/cierre (no es un estado final,
  la librería reintenta sola).
- `closed`: la pantalla se desmontó y cerró la conexión intencionalmente (no es un error).

No hay un estado de error terminal expuesto a la UI — `fetch-event-source` reintenta indefinidamente
por diseño (Decisión 1); FR-007 solo exige mostrar *que* está reconectando, no ofrecer una acción de
"reintentar" manual.

## Transiciones de estado que consume esta historia

Reutiliza `NotificationStatus` ya existente (`PENDING → IN_PROCESS → DELIVERED`, o con
`RECOVERABLE`/`FAILED`/`DISCARDED` en el camino) — ver `schema.d.ts`. Esta historia no define
transiciones nuevas, solo las refleja en vivo en Listado y Detalle a medida que llegan.

## Relación con la cache de TanStack Query

- `['notifications']` (Listado): `NotificationSearchResponse` — `useNotificationsLiveFeed` escribe
  sobre `items` por `notificationId` (upsert/remove), preservando `limit`/`offset`/`hasNext` de la
  última respuesta HTTP real (el feed en vivo no pagina, ver contrato).
- `['notification', id]` (Detalle): `NotificationStatusResponse` sin cambios de shape —
  `useNotificationLiveStatus` solo invalida esta key cuando el id coincide, sin escribirla
  directamente.
