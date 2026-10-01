# Quickstart: validar el envío de notificaciones desde el panel

Guía para comprobar que la historia funciona de punta a punta. No contiene código de implementación:
los detalles están en [data-model.md](data-model.md) y [contracts/](contracts/send-notifications-consumer.md).

## Requisitos

- Node y dependencias instaladas (`npm install`).
- Backend Notification-uco corriendo en `http://localhost:8060` con al menos un canal con proveedor
  `ENABLED` (el proveedor `simulated` sirve).
- `.env` con `VITE_API_BASE_URL` y `VITE_TENANT_ID` (ya presentes en el repositorio).

## Verificación automática

```bash
npm run typecheck
npm run lint
npm test
```

Las pruebas de flujo usan MSW y no necesitan el backend. Deben cubrir:

1. Envío individual aceptado: se muestra id y estado, y hay enlace al detalle.
2. Envío repetido con el mismo contenido: se muestra "Ya existía", no un error.
3. Rechazo 400: se muestra el mensaje del servidor y el formulario conserva lo escrito.
4. Envío a varios con un destinatario inválido: el resultado marca el rechazado y los demás pasan.
5. Reenvío solo de los rechazados tras corregirlos, sin repetir los aceptados.
6. Lista de más de 200 destinatarios: se envía en varias solicitudes y el resumen suma todo.
7. Lista de más de 1000: se bloquea con el conteo y el máximo, sin enviar nada.
8. Reintento en una notificación `FAILED`, y ausencia del botón en una `DELIVERED`.

## Verificación manual con el backend real

```bash
npm run dev
```

1. Abrir `http://localhost:5173/notificaciones/nueva`.
2. **Individual (US1)**: elegir EMAIL, escribir una dirección, mensaje y prioridad, y enviar.
   Esperado: confirmación con id y estado; la notificación aparece en el listado sin recargar.
3. **Cambio de canal**: elegir SMS. Esperado: el asunto desaparece, aparece el contador de 160
   caracteres y una dirección sin `+` se señala antes de enviar.
4. **Duplicado (US2)**: repetir el mismo envío sin tocar nada. Esperado: "Ya existía", no una
   segunda notificación.
5. **Varios (US3)**: cambiar a varios destinatarios, pegar 5 direcciones con una repetida y una
   inválida. Esperado: la repetida se señala, la inválida bloquea el envío hasta corregirla; al
   enviar aparece la confirmación con canal, mensaje y cantidad; tras confirmar, la tabla de
   resultado muestra un estado por destinatario y el filtro por estado funciona.
6. **Límite**: pegar más de 1000 direcciones. Esperado: aviso con el conteo y el máximo, sin envío.
7. **Reintento (US4)**: abrir el detalle de una notificación fallida y pulsar Reintentar.
   Esperado: el estado cambia sin recargar. En una entregada el botón no aparece.
8. **Sin canales disponibles**: con el catálogo vacío o sin proveedores habilitados, el formulario
   lo indica y no permite enviar.
9. **Teclado**: completar y enviar el formulario solo con teclado; los errores se anuncian y el foco
   va al primer campo inválido.

## Criterios de salida

- Los escenarios de aceptación de las cuatro historias de `spec.md` se cumplen.
- SC-005 (50 destinatarios en 30 s) y SC-006 (1000 destinatarios, rechazados en 10 s) se comprueban
  con el backend real o con MSW y un retardo simulado.
- Los pendientes de research.md D2 y D6 tienen fecha asignada por el usuario.
