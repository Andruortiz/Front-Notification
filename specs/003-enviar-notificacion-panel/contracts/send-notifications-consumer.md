# Contrato consumido: envío y reintento de notificaciones

Este panel no expone interfaces propias. Este documento fija cómo consume los endpoints del backend
descritos en `src/api/schema.d.ts` (generado desde `api-notificaciones.yaml`). Todas las llamadas
pasan por `apiFetch`, que añade `X-Tenant-Id` y la base `/api`.

## POST /notifications - envío individual

Cuerpo (`SendNotificationRequest`), construido desde el formulario:

| Campo | Origen |
| ----- | ------ |
| `externalId` | `panel-<uuid>` estable mientras la huella del contenido no cambie (research D5) |
| `channelType` | canal elegido |
| `recipientId` | dirección normalizada (research D4) |
| `recipientAddress` | dirección normalizada |
| `subject` | asunto, o ausente si el canal no lo usa o está vacío |
| `body` | mensaje en texto plano, sin recortar ni alterar |
| `priority` | prioridad elegida |

| Respuesta | El panel |
| --------- | -------- |
| 202 con `duplicate: false` | muestra "Notificación aceptada" con id, estado inicial y enlace al detalle |
| 202 con `duplicate: true` | muestra "Ya existía" con el id de la notificación original; no es un error |
| 400 `ErrorResponse` | muestra `message`, conserva lo escrito y no cambia el id |
| fallo de red | avisa que no se sabe si se envió, pide verificar en el listado y conserva el id |
| 5xx | aviso genérico, conserva lo escrito y el id |

## POST /notifications:sendBatch - envío a varios destinatarios

Cuerpo (`SendNotificationBatchRequest`): `items` con un `SendNotificationRequest` por destinatario,
todos con el mismo `channelType`, `subject`, `body` y `priority`; `externalId` de cada uno es
`panel-<uuid>-<posición>`. `batchId` no se envía: lo genera el sistema.

El panel divide la lista en solicitudes de 200 elementos, en secuencia (research D6).

| Resultado por elemento (`BatchItemResult`) | El panel |
| ------------------------------------------ | -------- |
| `ACCEPTED` | fila "Aceptada" con el id de la notificación |
| `DUPLICATE` | fila "Ya existía" con el id |
| `REJECTED` | fila "Rechazada" con `rejectionReason` |
| solicitud fallida por red o 5xx | filas "Sin confirmar" para cada elemento de esa solicitud |

Los elementos se asocian a su fila por `externalId`. Un elemento inválido no bloquea a los demás y las
solicitudes siguientes continúan aunque una haya fallado, salvo que el operador cancele.

## POST /notifications/{id}:retry - reintento manual

Sin cuerpo. El `id` va con `encodeURIComponent`.

| Respuesta | El panel |
| --------- | -------- |
| 202 `NotificationStatusResponse` | actualiza `['notification', id]` con la respuesta |
| 400 | muestra `message` (por ejemplo, el estado no admite reintento) |
| 404 | indica que la notificación ya no existe para este cliente |

## GET /channels - canales disponibles

Ya consumido por `Catálogo` mediante `getChannels()`. El formulario usa `items[].channelType`,
`items[].contentSchema` y `items[].providers[].status` para decidir qué canales ofrece y qué límites
aplica (research D2 y D3).

## Reglas transversales

- Ninguna de estas llamadas invalida `['notifications']`; el listado se actualiza por el feed SSE
  (research D7).
- Ninguna respuesta ni borrador se guarda en almacenamiento del navegador.
- El panel nunca muestra códigos HTTP solos ni cuerpos de error sin procesar.
