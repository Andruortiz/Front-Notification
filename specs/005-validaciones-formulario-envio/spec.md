# Spec: Validaciones del formulario de envío en el frontend

**Rama**: `feature/validaciones-envio` | **Base**: `develop` | **Backend**: `Notification-uco`

## Objetivo

Detectar en el panel todo lo que el backend rechaza o, peor, acepta y luego falla en el proveedor, para que la persona usuaria lo corrija antes de enviar. El backend sigue siendo la fuente de verdad: estas reglas solo anticipan sus resultados.

## Qué valida el backend (y qué no)

| Regla                                                                | Dónde la aplica el backend                | Consecuencia si se incumple                         |
| -------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Dirección, `externalId`, `recipientId`, `body` no vacíos             | Objetos de valor del dominio              | `400`                                               |
| Asunto + cuerpo ≤ 32.768 caracteres                                  | `NotificationContent`                     | `400`                                               |
| Largo por canal (SMS cuerpo ≤ 160; PUSH asunto ≤ 100 y cuerpo ≤ 900) | `contentSchema` del canal                 | `400`                                               |
| Formato del correo                                                   | **Ninguna**                               | Se acepta y el proveedor lo rechaza después         |
| Teléfono E.164 `^\+[1-9]\d{1,14}$`                                   | Solo el proveedor SMS, al despachar       | Se acepta y termina en `FAILED`                     |
| Asunto del correo                                                    | Solo el proveedor de correo, al despachar | Se acepta y termina en `FAILED` (`missing-subject`) |
| Token push                                                           | **Ninguna** (texto opaco)                 | El proveedor lo rechaza después                     |
| Adjuntos (tipo, extensión, 10 MB, 5 archivos, 25 MB)                 | Servicio de adjuntos                      | `400`                                               |

## Requisitos

- **FR-001 Correo.** Se valida en el panel con motivo específico: sin espacios, un solo `@`, parte local de 1 a 64 caracteres con caracteres y puntos válidos, dominio con al menos un punto, etiquetas de 1 a 63 caracteres sin guiones en los extremos, terminación alfabética (o `xn--`), total ≤ 254. Se normaliza a minúsculas.
- **FR-002 Teléfono.** E.164 idéntico al del backend. Se aceptan espacios, paréntesis, guiones y puntos al escribir y se envía normalizado.
- **FR-003 Token push.** Obligatorio, sin espacios ni caracteres de control, ≤ 4096 caracteres.
- **FR-004 Asunto.** Obligatorio en EMAIL (el proveedor lo exige); opcional en PUSH; oculto en SMS. Sin saltos de línea ni caracteres de control (evita inyección de cabeceras). Máximo 255 en EMAIL (guarda del panel) y el que declare el canal. Se envía sin espacios sobrantes.
- **FR-005 Mensaje.** No vacío, sin caracteres de control (se permiten saltos de línea y tabulaciones), con el límite del canal y, en todo caso, asunto + mensaje ≤ 32.768 caracteres.
- **FR-006 Contadores.** El mensaje muestra siempre `n / límite` (el del canal o 32.768); el asunto, cuando hay límite.
- **FR-007 Momento.** Los errores aparecen al salir del campo y al enviar; un error visible se recalcula al escribir y desaparece al corregirse. El primer campo inválido recibe el foco (canal, dirección, asunto, mensaje).
- **FR-008 Lote.** Cada destinatario inválido muestra su motivo específico; el envío queda bloqueado mientras haya alguno. Máximo 1000 destinatarios.
- **FR-009 Adjuntos.** Reglas de la historia anterior (`004`), aplicadas también al cambiar de canal.
- **FR-010 Una sola fuente.** El cálculo de errores es una función única para envío individual, lote y validación en vivo.

## Decisiones

- **El asunto es obligatorio en EMAIL.** Con el proveedor simulado el backend lo acepta vacío, pero con Brevo el envío termina en `FAILED`; es mejor pedirlo. Para revertirlo basta cambiar `subject: 'required'` a `'optional'` en `KNOWN_RULES.EMAIL` (`src/lib/channelRules.ts`).
- **Máximo 255 en el asunto de EMAIL** es una guarda del panel, no una regla del backend.
- **Dominios internacionales (IDN).** Deben escribirse en formato `xn--`; el panel no los convierte.

## Fallos corregidos durante la verificación

| Fallo                                                    | Efecto                                                               | Corrección                         |
| -------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| El panel validaba el teléfono con `^\+\d{6,15}$`         | Aceptaba `+0…` (que el backend deja en `FAILED`) y rechazaba `+12`   | Misma expresión que el backend     |
| El envío individual validaba la dirección sin normalizar | Un teléfono con espacios fallaba aunque luego se enviara normalizado | Se valida la dirección normalizada |
| Los errores solo se recalculaban al enviar               | Un error corregido seguía visible hasta el siguiente envío           | Recalculo al escribir              |
| El asunto no recibía el foco al fallar                   | El foco saltaba a otro campo o a ninguno                             | Referencia y orden de foco         |
| El correo se validaba con `^[^\s@]+@[^\s@]+\.[^\s@]+$`   | Aceptaba `a@b..c`, `a b@c.com`, `a@-x.com`…                          | Validador estricto con motivos     |

## Pendiente

- Los límites de un canal personalizado que declare `maxLength` en el asunto se respetan; otros formatos de `contentSchema` (patrones, enumeraciones) no se interpretan en el panel.
- El backend no valida el formato del correo ni el token push; conviene decidir si debe hacerlo (se dejó fuera de alcance del frontend).

## Verificación

- `lint`, `typecheck`, `format:check`, `build` y `test` en verde.
- Dos mutaciones comprobadas: con el validador de teléfono anulado fallan 16 pruebas; con el asunto de EMAIL opcional fallan 8.
- Navegador real (Chromium): errores específicos al salir del campo, asunto obligatorio y contadores.
