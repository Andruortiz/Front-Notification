# Spec: Paginación del listado y ventana para adjuntar archivos

**Rama**: `feature/paginacion-y-adjuntos` | **Base**: `develop` | **Backend**: `Notification-uco` (HU2-092 adjuntos, HU2-070 búsqueda)

## Alcance

1. Listado de notificaciones paginado con `limit`/`offset`/`hasNext`.
2. Ventana (diálogo modal) para elegir los archivos adjuntos, con subida verificada para archivos grandes.
3. Alineación del cliente con el contrato real del backend (esquema regenerado, autenticación).

## Requisitos

### Paginación

- **FR-001** El listado pide `GET /notifications?limit=&offset=`; el tamaño por defecto es 50 y las opciones son 10, 25, 50, 100 y 200 (máximo del backend).
- **FR-002** Página y tamaño viven en la URL (`?page=&size=`): conservan la posición al volver desde el detalle. Valores inválidos caen al valor por defecto.
- **FR-003** Controles Anterior / Siguiente / Por página; Anterior se deshabilita en la página 1 y Siguiente cuando `hasNext` es falso. Cambiar el tamaño vuelve a la página 1.
- **FR-004** Una página sin resultados (p. ej. tras borrados) muestra un aviso y permite volver a la primera. Sin notificaciones muestra el estado vacío y oculta la paginación.
- **FR-005** El feed en vivo actualiza en el sitio cualquier página cargada, pero solo inserta notificaciones nuevas en la primera, ordenadas por `acceptedAt` y recortadas al tamaño de página. Las filas del snapshot más antiguas que la página no la desplazan. Al reconectar, la primera página se reinicia con el snapshot y las demás se vuelven a consultar.

### Ventana de adjuntos

- **FR-006** El botón "Adjuntar archivos" abre un diálogo modal con selector, arrastrar y soltar, lista de archivos, límites visibles y confirmación; Escape, el fondo y Cancelar descartan la selección; el foco queda atrapado y vuelve al botón al cerrar.
- **FR-007** Cada archivo se valida al elegirlo: nombre sin separadores ni caracteres de control, extensión no prohibida, tipo admitido (PDF, PNG, JPG, TXT, CSV, DOCX, XLSX), no vacío, hasta 10 MB; el conjunto admite hasta 5 archivos y 25 MB; no se repite un archivo. Los motivos de rechazo se muestran por archivo.
- **FR-008** Los límites del canal (`contentSchema.properties.attachments`: `maxItems`, tipos y `sizeBytes.maximum`) se aplican en el diálogo. Un canal que no los declara deshabilita el botón y lo explica; cambiar a un canal sin soporte con archivos elegidos bloquea el envío con un mensaje.
- **FR-009** Hasta 1 MB el archivo va en `attachments[].content` (Base64). De 1 MB + 1 byte a 10 MB se sube: `POST /attachment-uploads` → `PUT uploadUrl` (sin cabeceras del panel) → `POST :complete` → sondeo de `state` hasta `CLEAN` (60 s) → `attachments[].url = uploadUrl`. `INFECTED` muestra el motivo (`MALWARE`, `CONTENT_TYPE_MISMATCH`).
- **FR-010** Un archivo ya subido y verificado se reutiliza en reintentos y en el envío a varios destinatarios durante 10 minutos (la `uploadUrl` vence a los 15).

### Contrato y autenticación

- **FR-011** `src/api/schema.d.ts` se regenera con `npm run generate:api`; no se mantienen tipos de adjuntos a mano.
- **FR-012** Las llamadas HTTP y el SSE envían `Authorization: Bearer ${VITE_AUTH_TOKEN}` cuando está definido (el backend toma el tenant solo del token desde HU2-096).

## Fallos corregidos durante la verificación

| Fallo                                                                  | Efecto                                                      | Corrección                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| El cuerpo enviaba `attachment`/`attachmentUploadId`/`contentBase64`    | El backend descartaba o rechazaba el adjunto                | `attachments[]` con `content` o `url` y `sizeBytes` |
| El sondeo leía `status` con `CLEAN`/`REJECTED`                         | Siempre agotaba los 60 s                                    | Lee `state` con `PENDING_SCAN`/`CLEAN`/`INFECTED`   |
| Sin `Authorization`                                                    | Todas las llamadas daban 401 contra el backend actual       | `authHeaders()`                                     |
| `hasErrors` contaba claves con valor `undefined`                       | Aviso "Corregí los campos" falso al elegir canal o adjuntar | `Object.values(errors).some(Boolean)`               |
| Foco y Escape se perdían tras pulsar una zona no enfocable del diálogo | Teclado inaccesible                                         | Escucha a nivel de documento y panel enfocable      |
| Ningún canal declara adjuntos por defecto en el backend                | El formulario ofrecía adjuntar y el envío fallaba           | Habilitación según el `contentSchema` del canal     |

## Riesgos y pendientes

- La subida directa (`PUT`) desde el navegador exige CORS en el almacenamiento (MinIO/S3) para el origen del panel; no se pudo comprobar sin Docker.
- La integración real con el backend, MinIO y ClamAV queda para un entorno con Docker; las pruebas usan MSW.
- `VITE_AUTH_TOKEN` es una solución de desarrollo: la obtención real del token queda para la historia de autenticación del front.
- Con adjuntos y varios destinatarios se envía una notificación por destinatario (el lote JSON repetiría el contenido Base64 por cada elemento).

## Verificación

- `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build` y `npm test` en verde.
- Navegador real (Chromium) con la API simulada: paginación y botón Atrás, diálogo, foco, carga y payload de `POST /notifications`, sin errores de consola.
