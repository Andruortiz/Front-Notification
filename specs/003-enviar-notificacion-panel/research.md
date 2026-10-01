# Research: Enviar notificaciones desde el panel de control

Fecha: 2026-09-29. Cada decisión responde a algo que la spec deja abierto o a un punto donde el
contrato del backend y el panel actual no encajan sin más.

## D1 - Errores de la API: conservar el mensaje del servidor

**Decisión**: `apiFetch` lanza un `ApiError` con `status` y `serverMessage` (el campo `message` de
`ErrorResponse`, si el cuerpo es JSON) además del mensaje actual `API error <status>`.

**Rationale**: hoy `apiFetch` descarta el cuerpo de las respuestas de error. Los endpoints de envío
devuelven el motivo del rechazo en un 400 (canal inexistente o deshabilitado, contenido fuera del
esquema del canal, reintento no admitido) y FR-013 exige mostrarlo en lenguaje claro. Mantener el
texto `API error <status>` en `message` evita romper `Listado`, `Detalle` y `Catálogo`, que muestran
`String(error)`.

**Alternativas**: un segundo cliente solo para escritura (duplica la cabecera de tenant y la base de
la URL); cambiar el mensaje del error existente (rompe pruebas y pantallas sin necesidad).

**Mensajes al operador**: 400 muestra el mensaje del servidor si existe; un fallo de red
(`TypeError` de `fetch`) muestra que no hay conexión y que conviene verificar en el listado antes de
reintentar; 404 en reintento indica que la notificación ya no existe; cualquier 5xx muestra un aviso
genérico. Nunca se muestra el código HTTP solo.

## D2 - Reglas por canal

**Decisión**: `channelRules.ts` combina dos fuentes: las reglas que el contrato documenta para los
canales conocidos (EMAIL, SMS, PUSH) y el `contentSchema` del catálogo cuando el canal lo declara.
Para un canal que ninguna fuente describe, el formulario se degrada a lo mínimo: dirección y mensaje
obligatorios, asunto opcional, sin límite de longitud propio.

| Canal | Dirección                                                         | Asunto                                  | Mensaje                              |
| ----- | ----------------------------------------------------------------- | --------------------------------------- | ------------------------------------ |
| EMAIL | correo electrónico                                                | opcional                                | límite del `contentSchema` si existe |
| SMS   | internacional: `+`, código de país y número (ej. `+573001234567`) | no se pide (se ignora)                  | 160 caracteres                       |
| PUSH  | token opaco, solo se exige que no esté vacío                      | opcional, hasta 100 caracteres (título) | 900 caracteres                       |

**Rationale**: el contrato documenta estas reglas en la descripción de `SendNotificationRequest`,
pero no las expone de forma tipada; `contentSchema` es JSON Schema como texto y puede ser nulo. El
backend sigue siendo la fuente de verdad y rechaza con 400: las reglas del panel existen para que el
operador vea el error antes de enviar (SC-004), no para reemplazar la validación del servidor.

**Cuando `contentSchema` no se puede interpretar**: se ignora en silencio para el formulario y el
canal se valida solo con las reglas conocidas; el 400 del servidor cubre el resto.

**Alternativas**: leer siempre el `contentSchema` (no es fiable: puede ser nulo); fijar todo en el
panel (se rompe con canales registrados dinámicamente). La combinación cubre ambos casos.

**Pendiente con dueño**: el contrato debería exponer estas reglas de forma tipada (Principio I).
Dueño: equipo backend de Notification-uco. Fecha: por definir por el usuario.

## D3 - Qué canales se ofrecen (FR-002)

**Decisión**: se ofrecen los canales de `GET /channels`. Un canal es seleccionable si tiene al menos
un proveedor `ENABLED`; los demás se muestran deshabilitados con el motivo de `statusReason` para que
el operador entienda por qué no puede usarlos. Sin ningún canal seleccionable, el formulario
lo indica y no permite enviar.

**Rationale**: un canal cuyos proveedores están todos `DISABLED` o `MISSING_ADAPTER` aceptaría la
notificación y la dejaría fallar; mejor no ofrecerlo. Mostrarlo deshabilitado evita la confusión de
un canal que "desaparece".

## D4 - Identificador del destinatario derivado de la dirección (FR-016)

**Decisión**: `recipientId` es la dirección normalizada: sin espacios en los extremos y en minúsculas
para correo; sin espacios, guiones ni paréntesis para teléfono; sin cambios para token de push.

**Rationale**: la spec pide que el operador escriba solo la dirección y que la misma dirección
produzca siempre el mismo identificador. Usar la dirección normalizada hace legible la columna
"Destinatario" del listado, que ya muestra `recipientId`, y permite buscar por él.

**Alternativas**: un hash de la dirección (oculta el dato personal, pero el listado dejaría de decir
a quién se envió); un identificador aleatorio (rompe la estabilidad y las preferencias futuras).

**Riesgo declarado**: el contrato describe `recipientId` como "estable entre canales", pero con esta
derivación una misma persona tiene un identificador distinto por canal. Es coherente con la spec
(preferencias por destinatario están fuera de alcance) y se revisará cuando entren preferencias.

## D5 - Identificador de idempotencia estable (FR-005, FR-006, FR-007)

**Decisión**: `externalId` se genera con `crypto.randomUUID()` con prefijo `panel-` y se reutiliza
mientras la huella del contenido no cambie (canal, destinatarios normalizados, asunto, mensaje,
prioridad). Si cambia cualquier campo, se genera uno nuevo. "Enviar otra" y "Reenviar rechazados"
siempre generan uno nuevo. En el envío a varios, el `externalId` de cada elemento es
`<identificador>-<posición>`.

**Rationale**: cubre los tres comportamientos que la spec pide sin que el operador toque nada:
un doble envío o un reintento tras perder la conexión llega con el mismo id y el sistema responde
`duplicate` (se presenta como "ya existía"); editar el contenido después de un fallo no hereda un id
que haría descartar el cambio en silencio; y un formulario nuevo nunca reutiliza un id.

**Por qué no un id por montaje del formulario**: si el operador cambia el mensaje tras un fallo de
red y reenvía, el sistema respondería `duplicate` con el contenido anterior. La huella lo evita.

**Alternativas**: un id nuevo en cada clic (permite duplicados); un id que el operador escribe
(fricción, contradice FR-006).

## D6 - Envío a varios destinatarios y tope del lote (FR-018)

**Decisión**: hasta 1000 destinatarios por operación (decisión de producto, spec). El panel los envía
en solicitudes de 200 elementos, en secuencia, con contador de progreso, y agrega los resultados.
Un destinatario cuya solicitud falla por red o error del servidor queda como `SIN_CONFIRMAR` y se
puede reenviar con el mismo identificador, sin riesgo de duplicar (D5).

**Rationale**: `POST /notifications:sendBatch` no declara un máximo de elementos. Enviar 1000 en una
sola llamada arriesga un rechazo o un tiempo de espera del que el panel no puede distinguir qué se
procesó. 200 coincide con el máximo de página que ya usa el sistema y mantiene cada llamada dentro de
un orden de magnitud probado. Secuencial, no en paralelo, para no saturar el despacho.

**Pendiente con dueño**: confirmar con el backend el máximo real por lote y declararlo en el
contrato. Si soporta 1000, el troceo se reduce a una constante. Dueño: equipo backend de
Notification-uco. Fecha: por definir por el usuario antes de implementar.

**Alternativas**: una sola llamada de 1000 (riesgo de tope desconocido); paralelo (sin ganancia
relevante y pierde el orden de los resultados).

## D7 - Relación con el feed en vivo (FR-009)

**Decisión**: tras enviar, el panel no invalida ni refetchea `['notifications']`; confía en el feed
SSE para que la notificación aparezca en el listado. `Detalle` recibe el estado inicial del envío
con `setQueryData(['notification', id])`.

**Rationale**: el PR #8 quitó los refetch automáticos del listado porque pisaban el feed en vivo. Una
invalidación aquí reintroduciría esa regresión. La suscripción reproduce la foto vigente al
conectar, así que una notificación creada con el listado cerrado también aparece al abrirlo.

## D8 - Formularios sin librería

**Decisión**: estado controlado con `useState` y validación en funciones puras que devuelven un mapa
de errores por campo. Sin `react-hook-form` ni similares.

**Rationale**: son dos formularios de menos de diez campos con reglas dependientes del canal. La
lógica costosa es la validación, que en funciones puras es trivial de probar; una librería añade una
dependencia sin quitar esa parte. La constitución pide no incorporar librerías pesadas mientras las
pantallas sean pocas.

**Accesibilidad (FR-015)**: cada campo con `label`, `aria-invalid` y `aria-describedby` hacia su
error; un resumen con `role="alert"` al fallar la validación y foco en el primer campo inválido; el
contador de caracteres se anuncia con `aria-live="polite"`.

## D9 - Diálogo de confirmación (FR-017)

**Decisión**: un componente propio con `role="dialog"`, `aria-modal`, foco inicial en el botón de
cancelar, cierre con Escape y devolución del foco al botón que lo abrió.

**Rationale**: el elemento `<dialog>` nativo depende de `showModal()`, que jsdom no implementa de
forma fiable, y complicaría las pruebas de flujo. Un componente de 40 líneas cubre el caso sin
dependencia. Se enfoca cancelar por defecto porque el error caro es enviar de más.

## D10 - Destinatarios pegados (Clarifications 1)

**Decisión**: un área de texto donde se pegan direcciones separadas por saltos de línea, comas o
punto y coma. El panel las normaliza, quita repetidas, cuenta y valida cada una contra el canal.
Las inválidas se listan con su línea y bloquean el envío hasta corregirlas o quitarlas.

**Rationale**: es la forma más simple que cumple "mismo mensaje para muchos destinatarios" y el
escenario de direcciones repetidas. La carga desde CSV queda fuera de esta historia: la spec la
descarta como necesidad inicial y añadirla no exige cambiar el envío (Assumptions).

## D11 - Reintento (US4)

**Decisión**: botón `Reintentar` en `Detalle` solo cuando el estado es `FAILED` o `RECOVERABLE`.
Usa `POST /notifications/{id}:retry`; en 202 actualiza `['notification', id]` con la respuesta y el
SSE hace el resto; en 400 o 404 muestra el motivo. El botón queda inactivo mientras la mutación está
en curso.

**Rationale**: el contrato ya restringe el reintento a esos dos estados; el panel solo evita
ofrecer una acción que sabe que será rechazada (FR-012).

## D12 - Pruebas con MSW

**Decisión**: se añaden handlers para `POST */notifications`, `POST */notifications:sendBatch` y
`POST */notifications/:id:retry`, con fábricas de respuesta como las existentes. Las rutas con dos
puntos siguen el patrón que ya funciona para `*/notifications:subscribe`; se verifica en la primera
tarea de pruebas que `:retry` con un id dinámico enruta bien y, si no, se escapa el carácter.

**Pruebas de flujo requeridas por la constitución**: envío individual aceptado; duplicado; rechazo con
mensaje del servidor conservando los datos; lote con un rechazado y reenvío solo de los rechazados;
lote de más de 200 que se trocea; reintento en `FAILED` y ausencia del botón en `DELIVERED`.

**Hallazgo en validación manual (2026-09-29)**: contra un backend real local, `POST /notifications`
respondió 202 correctamente, pero `POST /notifications:sendBatch` devolvió 404 y
`POST /notifications/{id}:retry` devolvió 405, reproducido también con `curl` directo al backend (sin
pasar por el panel) — indica un problema de ruteo del backend con segmentos de ruta que contienen `:`
en esa instancia, no un defecto del cliente. El panel ya construye ambas rutas exactamente como las
declara `schema.d.ts`, y ambos flujos están cubiertos por pruebas de flujo con MSW. Pendiente:
repetir la validación manual de US3 y US4 cuando el backend corrija ese ruteo.

## D13 - Navegación

**Decisión**: ruta `/notificaciones/nueva`, enlace "Nueva notificación" en `Layout` y botón en la
cabecera de `Listado`. React Router prioriza la ruta estática sobre `/notificaciones/:id`, así que no
hay conflicto. `Layout` marca el enlace activo por igualdad exacta de ruta, lo que ya funciona para
esta ruta sin cambios.
