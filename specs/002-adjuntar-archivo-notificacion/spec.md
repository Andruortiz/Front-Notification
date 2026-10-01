# Feature Specification: Adjuntar archivo a una notificación

**Feature Branch**: `002-adjuntar-archivo-notificacion`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Como sistema cliente, quiero poder adjuntar un archivo a una
notificación, para enviar comprobantes, documentos o imágenes junto con el mensaje de forma segura."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enviar una notificación con un archivo adjunto (Priority: P1)

Como operador, quiero adjuntar un archivo al crear una notificación nueva desde el panel, para
enviar comprobantes, documentos o imágenes junto con el mensaje.

**Why this priority**: Es el valor central del pedido — sin esto no existe la capacidad de adjuntar
nada, sea cual sea el canal.

**Independent Test**: Abrir el formulario de nueva notificación, completar los campos obligatorios,
adjuntar un archivo válido (ej. un PDF de 2MB) y enviar; confirmar que la notificación se crea y que
el archivo queda asociado a ella.

**Acceptance Scenarios**:

1. **Given** el formulario de nueva notificación con canal `EMAIL`, **When** el operador adjunta un
   PDF válido de 2MB y envía, **Then** la notificación se crea, el archivo se entrega al destinatario
   junto con el mensaje, y queda asociado a la notificación.
2. **Given** el formulario de nueva notificación con canal `SMS` o `PUSH`, **When** el operador
   adjunta un archivo válido y envía, **Then** la notificación se crea con el archivo asociado como
   registro interno, pero el sistema NO intenta entregar ese archivo al destinatario por ese canal.
3. **Given** un archivo que excede el tamaño máximo permitido, **When** el operador intenta
   adjuntarlo, **Then** el panel lo rechaza antes de enviar, indicando el motivo (tamaño), sin
   permitir el envío con ese archivo.
4. **Given** un archivo de un tipo no permitido (ej. `.exe`), **When** el operador intenta
   adjuntarlo, **Then** el panel lo rechaza indicando los tipos permitidos.
5. **Given** un archivo de tipo y tamaño válidos cuyo contenido falla una verificación de seguridad
   (ej. el contenido real no coincide con la extensión, o se detecta contenido malicioso), **When**
   el operador intenta enviarlo, **Then** el sistema rechaza el envío y lo informa, sin crear la
   notificación con ese adjunto.
6. **Given** el formulario de nueva notificación, **When** el operador no selecciona ningún archivo,
   **Then** el envío procede sin adjunto, igual que hoy.

---

### User Story 2 - Ver y descargar el adjunto de una notificación (Priority: P2)

Como operador, quiero ver y descargar el archivo adjunto de una notificación desde su Detalle, para
poder verificar el comprobante o documento enviado.

**Why this priority**: Complementa la historia principal — adjuntar un archivo sin poder verificarlo
después no aporta valor operativo.

**Independent Test**: Abrir el Detalle de una notificación que tiene un adjunto y confirmar que se
ve su información con opción de descarga; abrir el Detalle de una notificación sin adjunto y
confirmar que esa sección no aparece.

**Acceptance Scenarios**:

1. **Given** el Detalle de una notificación con adjunto, **When** se abre la pantalla, **Then** se
   muestra el nombre del archivo, su tipo y tamaño, con una acción para descargarlo.
2. **Given** el Detalle de una notificación sin adjunto, **When** se abre la pantalla, **Then** no
   aparece ninguna sección de adjunto.
3. **Given** el Detalle de una notificación con adjunto enviada por `EMAIL`, **When** se abre,
   **Then** se indica que el archivo fue entregado al destinatario junto con el mensaje.
4. **Given** el Detalle de una notificación con adjunto enviada por `SMS` o `PUSH`, **When** se abre,
   **Then** se indica que el archivo es un registro interno y no fue entregado al destinatario por
   ese canal.

---

### User Story 3 - Identificar en el listado qué notificaciones tienen adjunto (Priority: P3)

Como operador con el listado abierto, quiero identificar de un vistazo qué notificaciones tienen un
archivo adjunto, para poder ubicarlas sin entrar a cada Detalle.

**Why this priority**: Mejora la visibilidad, pero el panel ya es útil sin esto una vez cubiertas
US1 y US2.

**Independent Test**: Con notificaciones con y sin adjunto en el listado, confirmar que las que
tienen adjunto muestran un indicador visual distinguible sin abrir el Detalle.

**Acceptance Scenarios**:

1. **Given** el listado con notificaciones, algunas con adjunto, **When** se muestra la tabla,
   **Then** las filas con adjunto muestran un indicador distinto de las que no lo tienen.

---

### Edge Cases

- ¿Qué pasa si la conexión se interrumpe mientras se sube el archivo? El envío se marca como
  fallido de forma visible y el operador puede reintentar sin que quede una notificación a medio
  crear.
- ¿Qué pasa si el operador adjunta un archivo y luego lo quita antes de enviar? El formulario permite
  quitarlo y enviar sin adjunto, o adjuntar otro en su lugar.
- ¿Qué pasa si el archivo adjunto está vacío (0 bytes) o corrupto? Se rechaza igual que un tipo no
  permitido, indicando el motivo.
- ¿Qué pasa si dos operadores envían notificaciones con adjuntos al mismo tiempo? Cada envío se
  procesa de forma independiente; el tamaño/tipo de un adjunto no afecta el envío de otro.
- ¿Qué pasa si el canal es `EMAIL` pero el proveedor de correo subyacente no admite adjuntos o el
  intento de entrega falla? La notificación refleja ese fallo de entrega igual que hoy lo hace para
  errores de envío, sin ocultar que el adjunto no llegó.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El panel DEBE ofrecer una pantalla para crear y enviar una notificación nueva
  (canal, destinatario, asunto/cuerpo, prioridad), que hoy no existe en el panel.
- **FR-002**: Al crear una notificación nueva, el operador DEBE poder adjuntar opcionalmente un
  archivo junto con el mensaje.
- **FR-003**: El panel DEBE validar, antes de enviar, que el archivo adjunto sea de un tipo permitido
  (PDF, JPG, PNG, DOCX, XLSX) y no exceda el tamaño máximo (10MB), rechazándolo con un motivo claro
  si no cumple.
- **FR-004**: El sistema DEBE verificar el contenido real del archivo (no solo su extensión o nombre)
  antes de aceptar el envío, y DEBE rechazar el envío si detecta contenido malicioso o que no
  corresponde al tipo declarado.
- **FR-005**: El sistema DEBE entregar el archivo adjunto al destinatario junto con el mensaje solo
  cuando el canal/proveedor usado sea capaz de transportar archivos (hoy, `EMAIL`); en los demás
  canales el archivo queda asociado a la notificación como registro interno, sin intentar entregarlo
  por ese canal.
- **FR-006**: El Detalle de una notificación con adjunto DEBE mostrar su nombre, tipo y tamaño, con
  una acción para descargarlo.
- **FR-007**: El Detalle DEBE indicar si el adjunto fue efectivamente entregado al destinatario o si
  quedó solo como registro interno, según el canal usado.
- **FR-008**: El Detalle de una notificación sin adjunto NO DEBE mostrar ninguna sección de adjunto.
- **FR-009**: El listado DEBE mostrar un indicador visual en las filas de notificaciones que tienen
  un archivo adjunto.
- **FR-010**: El panel DEBE permitir enviar una notificación sin adjunto, igual que hoy, sin que el
  adjunto sea obligatorio.
- **FR-011**: El sistema DEBE admitir como máximo un archivo adjunto por notificación en esta
  historia.

### Key Entities _(include if feature involves data)_

- **Notificación**: entidad ya existente (historias previas del listado y el detalle); esta historia
  le agrega, opcionalmente, un adjunto asociado.
- **Adjunto**: archivo asociado a una notificación al momento de su creación. Atributos relevantes:
  nombre de archivo, tipo de contenido, tamaño, y si fue efectivamente entregado al destinatario o
  quedó solo como registro interno.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un operador puede crear y enviar una notificación con un archivo adjunto válido en un
  solo flujo dentro del panel, sin pasos manuales fuera de él.
- **SC-002**: El 100% de los archivos que exceden el tamaño máximo, no son de un tipo permitido, o
  fallan la verificación de contenido, se rechazan antes de crear la notificación.
- **SC-003**: Un operador puede confirmar, sin salir del panel, si el adjunto de una notificación fue
  entregado al destinatario o quedó solo como registro interno.
- **SC-004**: Un operador identifica qué notificaciones del listado tienen adjunto sin abrir el
  Detalle de cada una.

## Assumptions

- El backend (`Notification-uco`) expone o expondrá un mecanismo para recibir el archivo junto con
  la creación de la notificación (ej. `multipart/form-data` o una URL de carga previa); si aún no
  existe, es una dependencia externa a esta historia que debe coordinarse con el equipo de backend,
  y el contrato (`src/api/schema.d.ts`) se regenera como parte de la implementación, igual que en
  `001-dashboard-tiempo-real`.
- La verificación de seguridad del contenido del archivo (tipo real, escaneo de malware) y una
  posible compresión antes del envío son responsabilidad del backend/proveedor; el panel valida tipo
  y tamaño del lado del cliente antes de subir, y refleja el resultado (aceptado/rechazado) que
  determine el backend.
- Hoy solo el canal `EMAIL` es capaz de transportar un archivo real al destinatario; `SMS` y `PUSH`
  conservan el adjunto como registro interno. Si en el futuro se agregan proveedores capaces de
  llevar adjuntos en otros canales, esta regla se extiende a esos canales sin cambiar el diseño.
- Se permite un solo archivo adjunto por notificación en esta historia; múltiples adjuntos por
  notificación quedan fuera de alcance.
- Tipos permitidos: PDF, JPG, PNG, DOCX, XLSX; tamaño máximo 10MB por archivo. Son límites por
  defecto para esta historia, ajustables a futuro.
- El operador que usa el nuevo formulario de "nueva notificación" actúa como sustituto manual de un
  sistema cliente real (para pruebas/soporte); no reemplaza la integración directa de sistemas
  cliente con la API, que sigue existiendo fuera de este panel.
- El campo `externalId`, requerido por el contrato de envío, se genera automáticamente en el panel
  si el operador no provee uno propio.
