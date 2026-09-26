# Feature Specification: Ver notificaciones en tiempo real en el panel

**Feature Branch**: `001-dashboard-tiempo-real`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Dashboard en tiempo real: Listado y Detalle de notificaciones se
actualizan solos via SSE en vez de requerir refresh manual. El backend (Notification-uco) ya expone
el feed en tiempo real (GET /notifications:subscribe, historia 006-dashboard-tiempo-real)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver el listado actualizarse solo (Priority: P1)

Como operador con el listado de notificaciones abierto, quiero que el estado de cada notificación se
actualice a medida que cambia en el servidor, sin recargar la página ni repetir la búsqueda, para
poder monitorear el flujo de notificaciones del tenant en tiempo real.

**Why this priority**: Es el valor central de la historia — sin esto, el listado sigue siendo una
foto fija que exige refrescos manuales constantes para detectar incidencias.

**Independent Test**: Con el listado abierto y sin realizar ninguna acción, aceptar una notificación
desde el backend y dejar que progrese por su ciclo de vida; confirmar que cada transición de estado
se refleja en la fila correspondiente sin recargar la página.

**Acceptance Scenarios**:

1. **Given** el listado abierto mostrando una notificación en estado `PENDING`, **When** el backend la
   despacha y pasa a `IN_PROCESS`, **Then** la fila correspondiente refleja el nuevo estado sin que el
   operador recargue la página.
2. **Given** una notificación visible en el listado, **When** su entrega se confirma y pasa a
   `DELIVERED`, **Then** el listado refleja ese cambio en cuestión de segundos.
3. **Given** una notificación nueva se acepta en el backend mientras el listado está abierto, **When**
   pertenece al tenant activo, **Then** aparece en el listado sin que el operador repita la búsqueda.
4. **Given** el listado abierto sin ningún cambio ocurriendo, **When** pasa el tiempo, **Then** la
   conexión en tiempo real permanece activa sin requerir intervención del operador.

---

### User Story 2 - Ver el detalle de una notificación actualizarse solo (Priority: P2)

Como operador con el detalle de una notificación abierto, quiero que su estado se mantenga al día
mientras la pantalla permanece abierta, para seguir el progreso de esa notificación puntual sin
recargar ni volver a consultarla manualmente.

**Why this priority**: Complementa la historia principal — un operador que ya identificó una
notificación problemática en el listado y entró a su detalle necesita seguir su progreso ahí mismo,
sin volver atrás para refrescar.

**Independent Test**: Abrir el detalle de una notificación en estado `RECOVERABLE` y, sin recargar,
provocar en el backend un reintento exitoso; confirmar que el detalle pasa a `DELIVERED` solo.

**Acceptance Scenarios**:

1. **Given** el detalle de una notificación abierto en estado `FAILED`, **When** un reintento manual o
   automático la lleva a `DELIVERED`, **Then** el detalle refleja el nuevo estado sin recargar.
2. **Given** el detalle de una notificación abierto, **When** el operador navega a otra pantalla,
   **Then** el panel deja de escuchar actualizaciones de esa notificación.

---

### User Story 3 - Recuperar la vista tras una desconexión temporal (Priority: P3)

Como operador cuya conexión al panel se interrumpe brevemente (red inestable, laptop suspendida),
quiero que al reconectarse la vista se ponga al día automáticamente, para no perder de vista un
cambio de estado ocurrido mientras estuve desconectado.

**Why this priority**: Es un caso de continuidad importante para confiabilidad, pero de menor
frecuencia e impacto inmediato que ver las actualizaciones en vivo (US1/US2); el panel ya es útil sin
esta historia, solo que con una ventana de riesgo en reconexiones.

**Independent Test**: Con el listado o el detalle abiertos, simular una interrupción de red; mientras
está desconectado, cambiar el estado de una notificación visible; reconectar y confirmar que la vista
queda al día sin que el operador recargue la página.

**Acceptance Scenarios**:

1. **Given** el panel desconectado temporalmente de la actualización en tiempo real, **When** una
   notificación visible cambia de estado durante la desconexión, **Then** al reconectar el panel
   muestra su estado más reciente.
2. **Given** una reconexión exitosa, **When** se completa la resincronización, **Then** el panel
   retoma la recepción de actualizaciones en vivo sin requerir que el operador recargue la página.

---

### Edge Cases

- ¿Qué pasa si el operador tiene el listado abierto en dos pestañas a la vez? Cada pestaña recibe las
  actualizaciones de forma independiente, sin que una afecte a la otra.
- ¿Qué pasa si una notificación cambia de estado más de una vez en un lapso muy corto? El panel
  refleja el estado vigente, sin quedarse mostrando un estado intermedio ya superado.
- ¿Qué pasa si el operador cierra o cambia de pestaña? El panel deja de intentar recibir
  actualizaciones para esa pantalla en cuanto deja de estar montada.
- ¿Qué pasa si la notificación abierta en Detalle no existe o no pertenece al tenant activo? El panel
  mantiene el estado de error ya definido (histórico), sin abrir una conexión en tiempo real inútil.
- ¿Qué pasa si el feed en tiempo real se interrumpe de forma indefinida (no solo una caída breve)? El
  panel lo indica visiblemente en vez de aparentar estar al día en silencio.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El listado DEBE reflejar cada transición de estado de las notificaciones del tenant
  activo a medida que ocurre, sin que el operador recargue la página ni repita la búsqueda.
- **FR-002**: El detalle de una notificación abierta DEBE reflejar su estado más reciente mientras la
  pantalla permanece montada, sin recargar.
- **FR-003**: Cuando una notificación ya visible en el listado cambia de estado, el panel DEBE
  actualizarla en su lugar (misma fila), no agregar una fila duplicada.
- **FR-004**: Al reconectarse tras una interrupción temporal, el panel DEBE resincronizar
  automáticamente la vista visible (equivalente a repetir la consulta vigente) antes de retomar las
  actualizaciones en vivo, de forma que ningún cambio de estado quede permanentemente oculto.
- **FR-005**: El panel NO DEBE requerir que el operador refresque manualmente ni repita una búsqueda
  para mantener el listado o el detalle al día.
- **FR-006**: El panel DEBE dejar de escuchar actualizaciones en tiempo real de una pantalla en cuanto
  el operador navega fuera de ella, para no mantener conexiones abiertas innecesariamente.
- **FR-007**: El panel DEBE mostrar de forma explícita si la conexión en tiempo real está activa,
  reconectando o interrumpida, para que el operador sepa si la vista puede estar desactualizada.

### Key Entities _(include if feature involves data)_

- **Notificación**: entidad ya existente (historias previas del listado y el detalle); esta historia
  no agrega campos nuevos, solo consume sus cambios de estado en tiempo real además de la consulta
  manual ya existente.
- **Actualización en tiempo real**: evento entregado por el backend que identifica una notificación
  afectada y su estado más reciente; el panel lo usa para actualizar la fila o el detalle
  correspondiente, nunca como una entidad propia que el panel persista.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un operador con el listado o el detalle abiertos ve reflejado un cambio de estado en 5
  segundos o menos desde que ese cambio ocurre en el backend, sin realizar ninguna acción manual.
- **SC-002**: Tras una desconexión temporal de hasta varios minutos, un operador que reconecta ve su
  vista completamente al día en menos de 5 segundos desde que la conexión se restablece.
- **SC-003**: Un operador puede seguir el ciclo de vida completo de una notificación, desde que se
  acepta hasta que se entrega o falla definitivamente, sin un solo refresco manual de página.
- **SC-004**: El indicador de conexión en tiempo real refleja correctamente su estado (activa,
  reconectando, interrumpida) en todo momento observable por el operador.

## Assumptions

- El backend (`Notification-uco`) ya expone el feed en tiempo real (`GET /notifications:subscribe`,
  Server-Sent Events, historia `006-dashboard-tiempo-real`) y ya filtra por tenant — esta historia no
  modifica el backend.
- El contrato consumido (`src/api/schema.d.ts`) está desactualizado respecto al `api-notificaciones.yaml`
  vigente del backend (falta `NotificationSearchResponse` paginado y `NotificationLiveUpdate`) y se
  regenera como parte de esta historia, antes de implementar el consumo del feed.
- El mecanismo técnico concreto para consumir SSE con el header `X-Tenant-Id` (que `EventSource`
  nativo no puede enviar) es una decisión de `/speckit-plan`; ya se acordó con el usuario usar un
  cliente basado en `fetch` en vez de `EventSource` nativo.
- Esta historia consume el feed sin filtros de búsqueda (`recipientId`/`channelType`/`status`/rango de
  fechas) en el listado, igual que la consulta manual actual — agregar UI de filtros es una historia
  aparte.
- El botón de reintento manual (CU-06) no es parte de esta historia.
- `Catalogo.tsx` no participa del feed en tiempo real.
- Los valores de SC-001 y SC-002 (5 segundos) son referencias razonables para una herramienta
  operativa interna, consistentes con las mismas métricas ya definidas en la historia del backend.
