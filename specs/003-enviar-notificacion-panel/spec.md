# Feature Specification: Enviar notificaciones desde el panel de control

**Feature Branch**: `003-enviar-notificacion-panel`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Como usuario quiero mandar cualquier tipo de notificacion desde mi panel de control"

## Clarifications

### Session 2026-09-29

- Q: ¿Qué es un lote en el panel: un mismo mensaje para muchos destinatarios, o mensajes distintos por destinatario? → A: Un mismo canal y mensaje para muchos destinatarios. Los mensajes distintos por destinatario quedan como ampliación futura.
- Q: ¿Cómo indica el operador a quién le llega la notificación: escribiendo la dirección, o eligiendo destinatarios ya guardados? → A: Solo escribe la dirección (correo, teléfono o token); el panel deriva el identificador del destinatario.
- Q: ¿Debe el panel pedir una confirmación antes de enviar, o envía directamente al pulsar el botón? → A: Confirmación solo en el envío a varios destinatarios, con resumen de canal, mensaje y cantidad. El envío individual va directo.
- Q: ¿Cuántos destinatarios como máximo se permiten en un solo envío a varios? → A: 1000 destinatarios por envío.
- Q: ¿El mensaje de una notificación es solo texto plano, o el operador también puede escribir contenido con formato (como HTML en un correo)? → A: Solo texto plano en todos los canales.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enviar una notificación individual por cualquier canal (Priority: P1)

Como operador, quiero completar un formulario en el panel y enviar una notificación por cualquiera de
los canales disponibles (correo, SMS o push), para no depender de otro sistema cuando necesito avisar
a un destinatario.

**Why this priority**: Es el valor central del pedido. Hoy el panel solo permite consultar; sin poder
enviar, el resto de la historia no existe.

**Independent Test**: Abrir el formulario de nueva notificación, elegir un canal, completar los campos
obligatorios y enviar; confirmar que el panel informa que la notificación fue aceptada y que aparece
en el listado.

**Acceptance Scenarios**:

1. **Given** el formulario de nueva notificación, **When** el operador elige un canal, completa
   la dirección del destinatario, el mensaje y la prioridad y envía, **Then** el panel confirma la aceptación con
   el identificador de la notificación y ofrece abrir su detalle.
2. **Given** el formulario, **When** el operador cambia de canal, **Then** el formulario ajusta lo que
   pide y lo que valida según ese canal (por ejemplo, asunto opcional en correo, título opcional en
   push, sin asunto en SMS, límite de longitud del mensaje propio de cada canal).
3. **Given** un canal con límite de longitud de mensaje, **When** el operador escribe más caracteres
   de los permitidos, **Then** el panel lo indica en el momento y no permite enviar, sin truncar el
   texto en silencio.
4. **Given** una dirección con formato inválido para el canal elegido (por ejemplo, un teléfono sin
   código de país en SMS), **When** el operador intenta enviar, **Then** el panel señala el campo y
   explica el formato esperado.
5. **Given** un envío aceptado, **When** el operador vuelve al listado, **Then** la nueva notificación
   aparece con su estado actual sin recargar la página.
6. **Given** un envío rechazado por el sistema, **When** llega la respuesta, **Then** el panel muestra
   el motivo en lenguaje claro y conserva lo que el operador escribió para corregirlo.

---

### User Story 2 - Evitar envíos duplicados (Priority: P1)

Como operador, quiero que un doble clic o un reenvío accidental no cree dos notificaciones iguales,
para no molestar dos veces al destinatario.

**Why this priority**: Una notificación duplicada llega a una persona real y no se puede deshacer; es
parte del envío básico, no una mejora.

**Independent Test**: Enviar el mismo formulario dos veces seguidas y confirmar que solo se crea una
notificación y que el panel informa que la segunda ya existía.

**Acceptance Scenarios**:

1. **Given** un envío en curso, **When** el operador vuelve a pulsar enviar, **Then** el segundo
   intento se ignora mientras el primero no termina.
2. **Given** un formulario ya enviado con éxito, **When** el operador lo envía de nuevo con el mismo
   identificador propio, **Then** el panel informa que la notificación ya existía y no crea otra.
3. **Given** un identificador propio generado automáticamente, **When** el operador prepara una
   notificación nueva, **Then** cada formulario nuevo recibe un identificador distinto sin que el
   operador tenga que inventarlo.

---

### User Story 3 - Enviar el mismo mensaje a muchos destinatarios (Priority: P2)

Como operador, quiero enviar un mismo mensaje por un mismo canal a una lista de destinatarios en una
sola operación, para avisar a muchas personas sin repetir el formulario uno por uno.

**Why this priority**: Amplía el alcance a "cualquier notificación", pero el panel ya es útil con el
envío individual.

**Independent Test**: Escribir un mensaje, elegir un canal, indicar una lista de destinatarios con
una dirección inválida, enviar y confirmar que se muestra el resultado de cada destinatario y que la
inválida no bloquea a las demás.

**Acceptance Scenarios**:

1. **Given** un mensaje, un canal y varios destinatarios válidos, **When** el operador envía,
   **Then** el panel muestra un resultado por destinatario (aceptado, duplicado o rechazado) y un
   resumen con totales.
2. **Given** una lista con un destinatario inválido, **When** se envía, **Then** ese destinatario
   aparece como rechazado con su motivo y los demás se procesan con normalidad.
3. **Given** un envío con rechazos, **When** el operador revisa el resultado, **Then** puede corregir
   solo los destinatarios rechazados y reenviarlos sin repetir los aceptados.
4. **Given** una lista con la misma dirección repetida, **When** el operador prepara el envío,
   **Then** el panel lo señala y envía una sola vez a esa dirección.
5. **Given** un mensaje, un canal y una lista de destinatarios listos, **When** el operador pulsa
   enviar, **Then** el panel muestra un resumen con el canal, el mensaje y la cantidad de
   destinatarios y solo envía si el operador lo confirma; si cancela, vuelve al formulario sin
   perder nada.

---

### User Story 4 - Reintentar el envío de una notificación fallida (Priority: P3)

Como operador, quiero reintentar desde el detalle una notificación que falló, para recuperarla sin
crearla de nuevo.

**Why this priority**: Completa el ciclo de envío, pero solo aplica después de un fallo.

**Independent Test**: Abrir el detalle de una notificación en estado fallido, pulsar reintentar y
confirmar que el estado cambia a pendiente; abrir una entregada y confirmar que la acción no aparece.

**Acceptance Scenarios**:

1. **Given** el detalle de una notificación fallida o recuperable, **When** el operador pulsa
   reintentar, **Then** el panel confirma que se reencoló y el estado se actualiza sin recargar.
2. **Given** el detalle de una notificación en cualquier otro estado, **When** se abre, **Then** la
   acción de reintentar no está disponible.

---

### Edge Cases

- El catálogo no tiene canales disponibles: el formulario informa que no se puede enviar y por qué.
- Un canal deja de estar disponible entre que se abre el formulario y se envía: el panel informa el
  rechazo y permite elegir otro canal sin perder el resto de los datos.
- Se pierde la conexión al enviar: el panel no confirma un envío que no sabe si ocurrió y permite
  verificar en el listado antes de reintentar, para no duplicar.
- Mensaje con saltos de línea, emojis o caracteres especiales: se conserva tal cual y el conteo de
  caracteres respeta lo que cuenta el canal.
- Lista con más de 1000 destinatarios: el panel indica el máximo y el exceso antes de enviar y no
  procesa la lista a medias.
- Una notificación duplicada (mismo identificador propio) se presenta como tal, no como error.
- El operador cambia de cliente activo con un formulario a medias: el borrador no se conserva ni se
  envía a nombre del otro cliente.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El panel MUST permitir crear y enviar una notificación individual desde un formulario.
- **FR-002**: El formulario MUST ofrecer los canales que el sistema tenga disponibles en cada
  momento, sin una lista fija en el panel.
- **FR-003**: El formulario MUST adaptar los campos, las ayudas y las validaciones al canal elegido
  (asunto o título opcionales, formato de la dirección, longitud máxima del mensaje).
- **FR-004**: El panel MUST validar los datos antes de enviar y señalar cada campo con error junto al
  campo, sin perder lo ya escrito.
- **FR-005**: El panel MUST impedir el envío doble de un mismo formulario mientras hay un envío en
  curso.
- **FR-006**: Cada notificación MUST llevar un identificador propio para idempotencia, generado
  automáticamente y visible para el operador.
- **FR-007**: El panel MUST presentar una notificación duplicada como un resultado distinto de un
  error, indicando que ya existía.
- **FR-008**: Tras un envío aceptado, el panel MUST mostrar el identificador y el estado inicial, y
  permitir ir al detalle.
- **FR-009**: Las notificaciones enviadas MUST aparecer en el listado y actualizar su estado sin
  recargar, como el resto de las notificaciones.
- **FR-010**: El panel MUST permitir enviar un mismo canal y mensaje a una lista de destinatarios en
  una sola operación y mostrar el resultado de cada destinatario y un resumen con totales.
- **FR-011**: Un destinatario inválido de un lote MUST NOT impedir que se procesen los demás.
- **FR-012**: El panel MUST permitir reintentar una notificación fallida o recuperable desde su
  detalle, y no ofrecer la acción en ningún otro estado.
- **FR-013**: Los errores de envío MUST mostrarse con un motivo comprensible para el operador, no con
  códigos internos.
- **FR-014**: Todo envío MUST hacerse a nombre del cliente activo y ningún borrador ni resultado
  MUST sobrevivir a un cambio de cliente.
- **FR-015**: Los formularios MUST ser utilizables con teclado y anunciar sus errores a tecnologías
  de asistencia.
- **FR-016**: El operador MUST indicar al destinatario solo con su dirección (correo, teléfono o
  token de dispositivo). El panel MUST derivar de ella el identificador del destinatario, de forma
  que la misma dirección produzca siempre el mismo identificador.
- **FR-017**: El envío a varios destinatarios MUST pedir una confirmación previa con el canal, el
  mensaje y la cantidad de destinatarios. El envío individual MUST NOT pedir confirmación.
- **FR-018**: Un envío a varios destinatarios MUST admitir hasta 1000 destinatarios. El panel MUST
  mostrar el límite y el conteo actual antes de enviar, y MUST NOT enviar parcialmente una lista que
  lo excede.
- **FR-019**: El mensaje MUST ser texto plano en todos los canales, conservando saltos de línea y
  caracteres especiales tal como se escriben. El panel MUST NOT ofrecer formato enriquecido ni
  interpretar el contenido como marcado.
- **FR-020**: El resultado de un envío a varios destinatarios MUST poder filtrarse por estado
  (aceptado, duplicado, rechazado) para ubicar los rechazados sin recorrer toda la lista.

### Key Entities

- **Notificación a enviar**: lo que el operador prepara. Incluye canal, dirección del destinatario
  (de la que se deriva su identificador), asunto o título opcional, mensaje, prioridad e identificador propio.
- **Canal**: medio de entrega disponible (correo, SMS, push u otros que se registren). Define qué
  campos aplican, el formato de la dirección y la longitud máxima del mensaje.
- **Resultado de envío**: respuesta a un envío. Puede ser aceptada, duplicada o rechazada, con el
  identificador de la notificación cuando existe y el motivo cuando se rechaza.
- **Lote**: un canal y un mensaje comunes con una lista de destinatarios, enviados juntos. Produce
  un resultado por destinatario y un resumen con totales.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un operador nuevo envía su primera notificación por cualquier canal en menos de 2
  minutos, sin ayuda.
- **SC-002**: El 100% de los envíos aceptados aparece en el listado en menos de 5 segundos, sin
  recargar.
- **SC-003**: Ningún doble clic ni reenvío del mismo formulario produce dos notificaciones.
- **SC-004**: El 95% de los errores de validación se detecta en el formulario, antes de contactar al
  sistema.
- **SC-005**: Un envío a 50 destinatarios se realiza y muestra su resultado completo en una sola
  pantalla, en menos de 30 segundos.
- **SC-006**: Con un envío de 1000 destinatarios, el operador ubica los rechazados en menos de 10
  segundos usando el filtro de estado.
- **SC-007**: Ante un rechazo, el operador corrige y reenvía sin reescribir los campos que ya estaban
  bien.

## Assumptions

- "Cualquier tipo de notificación" se entiende como cualquier canal registrado en el catálogo (hoy
  correo, SMS y push), más el envío individual, por lote y el reintento manual.
- El lote de esta historia es un mismo mensaje para muchos destinatarios. Enviar mensajes distintos
  por destinatario (por ejemplo desde un CSV con una fila por mensaje) es una ampliación futura y no
  requiere cambios en el sistema de envío.
- El tope de 1000 destinatarios es una decisión de producto del panel. El contrato del sistema no
  declara un máximo por lote, así que hay que confirmar en planificación que el sistema lo soporta o
  dividir el envío internamente.
- El correo con formato (HTML) queda fuera de alcance y puede tratarse como una historia aparte.
- El envío usa los mismos casos de uso que ya expone el sistema (envío individual, lote y reintento);
  no se pide crear capacidades nuevas en el backend.
- El tiempo real del panel se mantiene con el mecanismo actual de actualización en vivo; enviar es
  una acción puntual de petición y respuesta.
- La identificación del cliente sigue el arreglo provisional vigente (tenant por configuración); no
  se construye un inicio de sesión.
- Adjuntar archivos queda fuera de esta historia y se cubre en `002-adjuntar-archivo-notificacion`.
  Programar envíos, plantillas y preferencias de destinatario quedan fuera de alcance.
- Quien usa el panel es un operador autorizado del cliente activo; los permisos por rol no se
  distinguen todavía.
