# Data Model: Enviar notificaciones desde el panel de control

Todo el estado es de cliente y vive en componentes; no se persiste. Los tipos que vienen del contrato
se importan de `src/api/schema.d.ts`, nunca se redefinen.

## Del contrato (sin cambios)

| Tipo | Uso |
| ---- | --- |
| `SendNotificationRequest` | Cuerpo del envío individual y de cada elemento del lote |
| `SendNotificationResponse` | Resultado del envío individual: `notificationId`, `status`, `duplicate` |
| `SendNotificationBatchRequest` / `BatchAcceptedResponse` / `BatchItemResult` | Envío a varios: un resultado por elemento |
| `NotificationStatusResponse` | Respuesta del reintento y estado en `Detalle` |
| `ChannelItem` / `ChannelProviderItem` | Catálogo de canales y estado de sus proveedores |
| `Priority`, `NotificationStatus`, `ErrorResponse` | Enumeraciones y errores |

## Entidades del panel

### SendDraft (Notificación a enviar)

Lo que el operador prepara. Solo existe mientras el formulario está abierto.

| Campo | Tipo | Regla |
| ----- | ---- | ----- |
| `channelType` | texto | obligatorio; debe ser un canal seleccionable (D3) |
| `recipients` | lista de direcciones | 1 en modo individual; de 1 a 1000 sin repetidas en modo varios |
| `subject` | texto opcional | no se muestra en SMS; hasta 100 en PUSH |
| `body` | texto plano | obligatorio; longitud máxima según el canal (D2); conserva saltos de línea |
| `priority` | `LOW`, `NORMAL` o `HIGH` | por defecto `NORMAL` |

### RecipientEntry

Resultado de procesar cada dirección escrita o pegada.

| Campo | Tipo | Regla |
| ----- | ---- | ----- |
| `address` | texto normalizado | según el canal (D4) |
| `recipientId` | texto | igual a `address` normalizada |
| `error` | texto o nulo | formato inválido para el canal; bloquea el envío |
| `duplicateOf` | posición o nulo | dirección repetida; se envía una sola vez |

### SubmissionId

`{ id: string, fingerprint: string }`. El `id` cambia cuando cambia la huella (canal, destinatarios
normalizados, asunto, mensaje, prioridad) y siempre tras "Enviar otra" o "Reenviar rechazados" (D5).
El `externalId` de un envío individual es `panel-<uuid>`; el de cada elemento de un lote es
`panel-<uuid>-<posición>`.

### SendOutcome (resultado por destinatario)

| Campo | Tipo | Regla |
| ----- | ---- | ----- |
| `address` | texto | destinatario al que corresponde |
| `outcome` | `ACCEPTED`, `DUPLICATE`, `REJECTED` o `SIN_CONFIRMAR` | los tres primeros vienen del contrato; `SIN_CONFIRMAR` es solo del panel |
| `notificationId` | uuid o nulo | nulo si `REJECTED` o `SIN_CONFIRMAR` |
| `reason` | texto o nulo | motivo del rechazo o del fallo de la solicitud |

`SIN_CONFIRMAR` marca a quien iba en una solicitud que falló por red o error del servidor: no se sabe
si se procesó. Se puede reenviar con el mismo `SubmissionId` sin riesgo de duplicar.

### BatchSummary

Totales derivados de la lista de `SendOutcome`: aceptadas, duplicadas, rechazadas, sin confirmar y
total. No se almacena; se calcula al renderizar.

### ChannelRules

Derivado de `ChannelItem` (D2). No se persiste.

| Campo | Tipo | Regla |
| ----- | ---- | ----- |
| `addressLabel` | texto | etiqueta y ejemplo de la dirección del canal |
| `validateAddress` | función | formato de la dirección |
| `subject` | `hidden`, `optional` | SMS lo oculta |
| `subjectMax`, `bodyMax` | número o nulo | nulo si el canal no declara límite |
| `available` | booleano | al menos un proveedor `ENABLED` (D3) |
| `unavailableReason` | texto o nulo | `statusReason` del proveedor |

## Transiciones de estado del formulario

```text
EDITANDO ──enviar (individual)──▶ ENVIANDO ──202──▶ RESULTADO (aceptada | duplicada)
   ▲                                  │
   │                                  └─400──▶ EDITANDO (con errores, datos conservados)
   │                                  └─red──▶ EDITANDO (aviso "verifica en el listado", mismo id)
   │
   └──enviar (varios)──▶ CONFIRMANDO ──cancelar──▶ EDITANDO
                              │
                              └─confirmar──▶ ENVIANDO (n de N) ──▶ RESULTADO (tabla por destinatario)
                                                                        │
                        EDITANDO ◀── "Reenviar rechazados" / "Enviar otra"
```

Las notificaciones creadas siguen el ciclo de `NotificationStatus` que ya maneja el panel
(`PENDING` → `IN_PROCESS` → `DELIVERED`, `RECOVERABLE`, `FAILED`, `DISCARDED`); esta historia no lo
modifica. El reintento solo aplica desde `FAILED` o `RECOVERABLE`.
