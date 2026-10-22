<!--
Sync Impact Report
Version change: 0.1.0 → 0.2.0
Rationale: BORRADOR, todavía NO RATIFICADO. La historia "dashboard en tiempo real"
(specs/001-dashboard-tiempo-real) resolvió dos de los pendientes declarados en 0.1.0: el pipeline de
CI del frontend (PR #5, GitHub Actions con lint/typecheck/test/build) y la decisión de cliente SSE
(`@microsoft/fetch-event-source`, por el header `X-Tenant-Id` que `EventSource` nativo no puede
enviar). Se actualizan las secciones que documentaban ambos como pendientes.
Modified sections: Restricciones técnicas (cliente SSE ya no pendiente), Flujo de desarrollo (CI ya
existe).
Deferred / TODO que siguen abiertos (Principio VII): umbral de cobertura de pruebas; confirmar si la
regla de cero comentarios se hereda del backend.
-->

# Front-Notification Constitution (borrador 0.2.0)

## Core Principles

### I. Contrato primero, tipos generados
El frontend consume la API de Notification-uco y no inventa endpoints. Los tipos de
`src/api/schema.d.ts` se generan desde `api-notificaciones.yaml` con `openapi-typescript` y nunca se
editan a mano. Un cambio de contrato sin regenerar los tipos debe romper la compilación, no fallar en
silencio en ejecución. Si el contrato no permite tipar algo con precisión (por ejemplo, campos sin
`required`), se corrige el contrato en el backend en lugar de acumular parches en la interfaz.

### II. Tenant provisional, sin autenticación real todavía
Mientras CU-10 siga bloqueado (DEP-01), el tenant viaja en la cabecera `X-Tenant-Id` desde
configuración. No se construye un login real: sería trabajo desechable. Ningún dato ni caché de un
tenant sobrevive a un cambio de tenant, y la interfaz nunca muestra información de un tenant distinto
al activo. Este arreglo es válido solo en desarrollo, nunca en producción.

### III. Calidad verificada, no declarada
Ninguna historia se mergea sin que pasen la compilación de tipos (`tsc -b`), ESLint y las pruebas.
Las pruebas usan Vitest y Testing Library, con MSW para simular la API a partir del contrato. Toda
historia de tamaño M o mayor incluye al menos una prueba de flujo con MSW además de las de
componente. Toda pantalla prueba sus estados de carga, vacío y error. El umbral de cobertura está
**pendiente de decisión** (Principio VII); hasta entonces no se declara cumplido ningún porcentaje.

### IV. Cero comentarios explicativos
El código nuevo no lleva comentarios que expliquen decisiones o trade-offs: los nombres y las pruebas
son la documentación. El razonamiento vive en `specs/<historia>/` o en el cuerpo del PR. *(Se hereda
del backend; pendiente de confirmar para este repositorio.)*

### V. Trazabilidad en git
Rama por historia desde `develop` (`feature/HU2-XXX-descripcion`; `fix/` y `chore/` para lo demás).
Commits de una sola línea con formato `tipo(ámbito): descripción`, en español y sin tildes. Los PRs
van siempre contra `develop`. El usuario revisa y mergea; un asistente de IA nunca hace merge.

### VI. Spec-kit proporcional al tamaño
Toda historia desarrollada con asistencia de IA sigue `/speckit-specify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-implement`, con artefactos en `specs/<historia>/` y aprobación
explícita del usuario sobre spec y plan antes de implementar. Solo se exige el flujo completo a las
historias de tamaño M o mayor. Las de tamaño XS y S se resuelven con una tarea y un PR, tomando la
descripción y los criterios de la historia como spec.

### VII. Sin atajos
Ninguna solución temporal se acepta como definitiva. Lo que no tenga implementación correcta todavía
se documenta como pendiente explícito, con dueño y fecha; nunca se oculta para que la compilación
pase. Un commit "wip" en una rama de feature es válido; en `develop` no.

### VIII. Estados explícitos y color con significado
Cada pantalla muestra de forma explícita qué pasa mientras carga, cuando no hay datos y cuando falla.
Los colores de acento se reservan para el estado de las notificaciones y de los intentos de envío
(`NotificationStatus`, `AttemptResult`); no se usan como decoración. El origen manual o automático
de un intento es metadato y usa un distintivo neutro, sin color.

## Restricciones técnicas

React 19, TypeScript, Vite, TanStack Query para el estado del servidor y React Router. Sin librería
de componentes pesada mientras las pantallas sean pocas. La URL base de la API es configurable por
entorno y nunca está fija en el código. Tipografía Manrope para la interfaz y JetBrains Mono para
identificadores y fechas. Para el panel en vivo, el `EventSource` nativo no permite enviar cabeceras
y el flujo exige `X-Tenant-Id`: se consume con `@microsoft/fetch-event-source` (envuelve `fetch`,
permite headers arbitrarios) en vez de `EventSource` nativo (specs/001-dashboard-tiempo-real).

## Flujo de desarrollo

Los artefactos de spec-kit (`spec.md`, `plan.md`, `tasks.md`) se commitean en la misma rama que el
código que implementan. `tasks.md` incluye siempre una tarea de prueba de flujo para las historias
de tamaño M o mayor. El pipeline de CI (`.github/workflows/ci.yml`) corre `lint`, `typecheck`, `test`
y `build` en cada push/PR contra `develop` y `master`; ningún PR se mergea con ese pipeline en rojo.

## Governance

Esta constitución tiene precedencia sobre cualquier práctica ad hoc. Las enmiendas requieren
actualizar este archivo, incrementar la versión según semver y añadir un Sync Impact Report. Este
documento es un borrador hasta que el usuario lo apruebe y se ratifique con la versión 1.0.0.

**Version**: 0.2.0 (borrador) | **Ratified**: pendiente | **Last Amended**: 2026-09-25
