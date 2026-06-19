# Plan de mejora del sistema de notificaciones en tiempo real – SGEI

## 1. Objetivo general

Implementar un sistema de notificaciones funcional, contextual y en tiempo real dentro del SGEI, permitiendo que las acciones relevantes realizadas por administradores, docentes, secretarías y el sistema generen notificaciones automáticas hacia los usuarios correspondientes.

El sistema debe permitir notificaciones de usuario a usuario y de sistema a usuario, mostrando claramente quién realizó la acción, qué acción se realizó, sobre qué entidad ocurrió y qué usuario o grupo debe ser notificado.

---

## 2. Diagnóstico del estado actual

Actualmente el proyecto ya cuenta con un módulo de notificaciones, pero su funcionamiento es limitado. El sistema permite registrar, listar y marcar notificaciones como leídas, pero no existe todavía una lógica completa de eventos, reglas de destinatarios ni comunicación en tiempo real.

### Problemas principales detectados

1. Las notificaciones se crean de forma muy básica.
2. El modelo actual no guarda claramente quién realizó la acción.
3. No se identifica la entidad afectada, como alumno, libreta, tarea, evaluación, docente, pago o boleta.
4. El servicio actual restringe la creación de notificaciones principalmente al rol administrador.
5. No existe una lógica centralizada para decidir a quién se debe notificar según el tipo de acción.
6. No hay un catálogo claro de eventos notificables.
7. No hay actualización en tiempo real en el frontend.
8. No se evidencian reglas específicas por rol: Admin, Secretaria, Docente y Alumno.
9. Las notificaciones no están integradas correctamente con módulos clave como notas, libretas, docentes, actividades, materiales, boletas y pagos.

---

## 3. Nuevo enfoque propuesto

El sistema de notificaciones debe cambiar de una lógica manual a una lógica basada en eventos.

En lugar de que una notificación se cree de forma aislada, cada acción importante del sistema debe emitir un evento. Ese evento debe ser procesado por un servicio de notificaciones que determine:

* quién hizo la acción;
* qué acción realizó;
* qué entidad fue afectada;
* qué usuarios deben recibir la notificación;
* qué mensaje se debe mostrar;
* qué URL debe abrirse al hacer clic;
* si debe mostrarse en tiempo real;
* si también debe quedar guardada para usuarios desconectados.

---

## 4. Roles involucrados

El sistema debe considerar los siguientes roles:

| Rol        | Puede generar notificaciones | Puede recibir notificaciones |
| ---------- | ---------------------------: | ---------------------------: |
| Admin      |                           Sí |                           Sí |
| Secretaria |                           Sí |                           Sí |
| Docente    |                           Sí |                           Sí |
| Alumno     |   Parcialmente, según módulo |                           Sí |
| Sistema    |               Sí, automático |                    No aplica |

---

## 5. Tipos generales de notificaciones

Se recomienda mantener tipos generales, pero complementarlos con eventos específicos.

### Tipos actuales sugeridos

* `sistema`
* `academico`
* `pago`
* `comunicado`

### Nuevos campos recomendados

Además del tipo general, cada notificación debe tener un `evento`, por ejemplo:

* `DOCENTE_CREADO`
* `DOCENTE_ACTUALIZADO`
* `LIBRETA_SUBIDA`
* `NOTA_REGISTRADA`
* `NOTA_ACTUALIZADA`
* `TAREA_CALIFICADA`
* `EVALUACION_CALIFICADA`
* `MATERIAL_PUBLICADO`
* `BOLETA_SUBIDA`
* `BOLETA_REVISADA`
* `PAGO_REGISTRADO`
* `PAGO_OBSERVADO`
* `COMUNICADO_GENERAL`
* `PERIODO_ACTUALIZADO`
* `ASISTENCIA_REGISTRADA`
* `ASISTENCIA_CORREGIDA`

---

## 6. Eventos notificables recomendados

| Evento                  | Actor                           | Destinatarios                                     | Cuándo se dispara                            | Ejemplo de notificación                                             |
| ----------------------- | ------------------------------- | ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `DOCENTE_CREADO`        | Admin                           | Secretarías, administradores y docente creado     | Cuando se registra un nuevo docente          | “Admin Andre registró al docente Juan Pérez en el sistema.”         |
| `DOCENTE_ACTUALIZADO`   | Admin / Secretaria              | Administradores y secretarías                     | Cuando se modifica información de un docente | “Secretaría María actualizó los datos del docente Juan Pérez.”      |
| `ALUMNO_CREADO`         | Admin / Secretaria              | Administradores, secretarías y alumno creado      | Cuando se registra un nuevo alumno           | “Secretaría María registró al alumno Carlos Ramos.”                 |
| `ALUMNO_ACTUALIZADO`    | Admin / Secretaria              | Administradores, secretarías y alumno afectado    | Cuando se modifican datos de un alumno       | “Admin Andre actualizó los datos del alumno Carlos Ramos.”          |
| `LIBRETA_SUBIDA`        | Docente / Secretaria / Admin    | Alumno relacionado, secretarías y administradores | Cuando se sube una libreta                   | “Docente Juan Pérez subió la libreta del alumno Carlos Ramos.”      |
| `NOTA_REGISTRADA`       | Docente                         | Alumno correspondiente                            | Cuando se registra una nota por primera vez  | “Docente Juan Pérez calificó tu evaluación de Matemática.”          |
| `NOTA_ACTUALIZADA`      | Docente / Admin                 | Alumno correspondiente y secretaría si aplica     | Cuando se corrige o modifica una nota        | “Docente Juan Pérez actualizó tu nota de la tarea de Comunicación.” |
| `TAREA_CALIFICADA`      | Docente                         | Alumno correspondiente                            | Cuando se califica una tarea                 | “Docente Juan Pérez calificó tu tarea de Ciencia y Tecnología.”     |
| `EVALUACION_CALIFICADA` | Docente                         | Alumno correspondiente                            | Cuando se califica una evaluación            | “Docente Juan Pérez calificó tu evaluación bimestral.”              |
| `MATERIAL_PUBLICADO`    | Docente                         | Alumnos del curso/sección                         | Cuando se publica material académico         | “Docente Juan Pérez publicó nuevo material para Matemática.”        |
| `ACTIVIDAD_PUBLICADA`   | Docente                         | Alumnos del curso/sección                         | Cuando se crea una actividad o tarea         | “Docente Juan Pérez publicó una nueva actividad.”                   |
| `BOLETA_SUBIDA`         | Alumno / Apoderado / Secretaria | Secretaría y administradores                      | Cuando se sube una boleta o comprobante      | “El alumno Carlos Ramos subió una boleta para revisión.”            |
| `BOLETA_REVISADA`       | Secretaria / Admin              | Alumno correspondiente                            | Cuando se aprueba u observa una boleta       | “Secretaría María revisó tu boleta de pago.”                        |
| `PAGO_REGISTRADO`       | Secretaria / Admin              | Alumno correspondiente                            | Cuando se registra un pago                   | “Se registró un nuevo pago en tu cuenta.”                           |
| `PAGO_OBSERVADO`        | Secretaria / Admin              | Alumno correspondiente                            | Cuando se observa un pago                    | “Tu pago fue observado. Revisa el detalle.”                         |
| `ASISTENCIA_REGISTRADA` | Docente                         | Alumno correspondiente                            | Cuando se registra asistencia relevante      | “Docente Juan Pérez registró tu asistencia.”                        |
| `ASISTENCIA_CORREGIDA`  | Docente / Admin                 | Alumno correspondiente                            | Cuando se corrige una asistencia             | “Se actualizó tu asistencia del día indicado.”                      |
| `COMUNICADO_GENERAL`    | Admin / Secretaria              | Todos o grupo específico                          | Cuando se envía un comunicado                | “La administración publicó un nuevo comunicado.”                    |
| `PERIODO_ACTUALIZADO`   | Admin                           | Docentes, secretarías y alumnos                   | Cuando se cambia el periodo académico        | “Se actualizó el periodo académico activo.”                         |

---

## 7. Reglas de destinatarios

El sistema debe tener una capa encargada de resolver destinatarios según el evento.

### Reglas generales

1. El usuario que realiza la acción no debe recibir su propia notificación, salvo que sea necesario.
2. Los alumnos solo deben recibir notificaciones relacionadas con ellos, sus cursos, sus pagos, sus notas, sus tareas o su sección.
3. Los docentes deben recibir notificaciones relacionadas con sus cursos, alumnos asignados o cambios administrativos que los afecten.
4. Las secretarías deben recibir notificaciones administrativas y académicas relevantes.
5. Los administradores deben recibir notificaciones de acciones importantes del sistema, especialmente modificaciones, registros y eventos críticos.
6. Las notificaciones masivas deben evitar duplicados.
7. Cada evento debe tener destinatarios explícitos y justificables.

### Ejemplos de reglas

#### Cuando un docente califica una tarea

Destinatario:

* alumno dueño de la tarea.

No destinatarios:

* todos los alumnos;
* todos los docentes;
* todos los administradores, salvo que sea una corrección especial.

#### Cuando se sube una libreta

Destinatarios:

* alumno relacionado;
* secretaría;
* administrador, si el evento requiere supervisión.

#### Cuando un administrador registra un docente

Destinatarios:

* secretarías;
* administradores;
* docente creado, como mensaje de bienvenida o activación.

#### Cuando se publica material académico

Destinatarios:

* alumnos del curso;
* alumnos de la sección correspondiente.

---

## 8. Cambios recomendados en la base de datos

El modelo actual de notificación puede mantenerse, pero debe ampliarse para soportar eventos reales.

### Campos actuales que deben conservarse

* `id`
* `usuario_destino_id`
* `tipo`
* `titulo`
* `cuerpo`
* `url_accion`
* `leida`
* `fecha_lectura`
* `created_at`

### Campos nuevos recomendados

| Campo                   | Tipo sugerido      | Descripción                                                                  |
| ----------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `actor_id`              | UUID nullable      | Usuario que realizó la acción                                                |
| `actor_rol`             | texto / enum       | Rol del usuario que generó la acción                                         |
| `actor_nombre_snapshot` | texto              | Nombre del actor al momento de crear la notificación                         |
| `evento`                | texto / enum       | Código del evento notificable                                                |
| `entidad_tipo`          | texto              | Tipo de entidad afectada: alumno, docente, nota, libreta, pago, boleta, etc. |
| `entidad_id`            | UUID nullable      | ID de la entidad afectada                                                    |
| `prioridad`             | texto / enum       | baja, normal, alta, urgente                                                  |
| `metadata`              | JSONB              | Información adicional del evento                                             |
| `canal`                 | texto / enum       | app, sistema, futuro email, futuro push                                      |
| `idempotency_key`       | texto nullable     | Evita notificaciones duplicadas                                              |
| `expires_at`            | timestamp nullable | Fecha opcional de expiración                                                 |

---

## 9. Índices recomendados

Para mejorar el rendimiento, se recomienda agregar índices como:

```sql
CREATE INDEX idx_notificacion_destino_leida_created
ON financial_schema.notificaciones(usuario_destino_id, leida, created_at DESC);

CREATE INDEX idx_notificacion_evento
ON financial_schema.notificaciones(evento);

CREATE INDEX idx_notificacion_actor
ON financial_schema.notificaciones(actor_id);

CREATE INDEX idx_notificacion_entidad
ON financial_schema.notificaciones(entidad_tipo, entidad_id);
```

---

## 10. Servicio de notificaciones propuesto

El módulo `notificaciones` debe convertirse en un servicio centralizado que pueda ser usado por otros módulos.

### Métodos recomendados

```ts
crearParaUsuario(input)
crearParaMultiplesUsuarios(input, destinatarios)
notificarEvento(evento, actor, entidad, contexto)
resolverDestinatarios(evento, contexto)
publicarTiempoReal(notificacion)
marcarLeida(id, usuario)
marcarTodasLeidas(usuario)
contarNoLeidas(usuario)
listar(usuario, filtros)
```

### Responsabilidad del servicio

El servicio debe encargarse de:

1. validar el evento;
2. construir el mensaje;
3. resolver destinatarios;
4. evitar duplicados;
5. guardar la notificación;
6. emitirla en tiempo real;
7. devolver la notificación creada al frontend si corresponde.

---

## 11. Catálogo de eventos

Se recomienda crear un archivo central:

```txt
backend/modules/notificaciones/notificacion.events.ts
```

Este archivo debe definir los eventos válidos del sistema.

Ejemplo conceptual:

```ts
export const NotificationEvents = {
  DOCENTE_CREADO: 'DOCENTE_CREADO',
  LIBRETA_SUBIDA: 'LIBRETA_SUBIDA',
  NOTA_REGISTRADA: 'NOTA_REGISTRADA',
  NOTA_ACTUALIZADA: 'NOTA_ACTUALIZADA',
  TAREA_CALIFICADA: 'TAREA_CALIFICADA',
  EVALUACION_CALIFICADA: 'EVALUACION_CALIFICADA',
  MATERIAL_PUBLICADO: 'MATERIAL_PUBLICADO',
  BOLETA_SUBIDA: 'BOLETA_SUBIDA',
  BOLETA_REVISADA: 'BOLETA_REVISADA',
  PAGO_REGISTRADO: 'PAGO_REGISTRADO',
  COMUNICADO_GENERAL: 'COMUNICADO_GENERAL'
} as const;
```

---

## 12. Resolver de destinatarios

Se recomienda crear un archivo:

```txt
backend/modules/notificaciones/notificacion-recipient-resolver.ts
```

Este archivo debe recibir el evento y el contexto, y devolver los usuarios que deben ser notificados.

Ejemplo conceptual:

```ts
resolverDestinatarios({
  evento: 'NOTA_REGISTRADA',
  actor,
  contexto: {
    alumnoId,
    cursoId,
    evaluacionId
  }
})
```

Resultado esperado:

```ts
[
  {
    usuarioDestinoId: 'perfil_usuario_del_alumno'
  }
]
```

---

## 13. Integración con módulos existentes

Las notificaciones no deben generarse solo desde el módulo de notificaciones. Deben dispararse desde los módulos donde ocurren las acciones importantes.

### Módulos donde se debe integrar

| Módulo        | Evento sugerido                                       |
| ------------- | ----------------------------------------------------- |
| `docentes`    | docente creado, docente actualizado                   |
| `alumnos`     | alumno creado, alumno actualizado                     |
| `notas`       | nota registrada, nota actualizada                     |
| `libretas`    | libreta subida                                        |
| `actividades` | actividad creada, tarea asignada, tarea calificada    |
| `materiales`  | material publicado                                    |
| `boletas`     | boleta subida, boleta revisada                        |
| `pagos`       | pago registrado, pago observado                       |
| `asistencias` | asistencia registrada, asistencia corregida           |
| `periodo`     | periodo académico actualizado                         |
| `users`       | usuario creado, usuario activado, usuario desactivado |

### Regla importante

Las notificaciones deben enviarse después de que la acción principal haya sido guardada correctamente.

Ejemplo:

1. El docente califica una evaluación.
2. Se guarda la nota en la base de datos.
3. Si el guardado fue exitoso, se dispara el evento `EVALUACION_CALIFICADA`.
4. El servicio resuelve el alumno destinatario.
5. Se guarda la notificación.
6. Se envía en tiempo real al frontend del alumno.

---

## 14. Tiempo real

Para este proyecto se recomienda implementar tiempo real con Server-Sent Events, también conocido como SSE.

### Motivo

SSE es suficiente para este caso porque las notificaciones viajan principalmente del servidor hacia el cliente. No se necesita necesariamente un WebSocket completo para enviar mensajes bidireccionales.

### Flujo recomendado

1. El usuario inicia sesión.
2. El frontend abre una conexión SSE con el backend.
3. El backend mantiene la conexión abierta.
4. Cuando se crea una notificación para ese usuario, el backend la envía por el canal SSE.
5. El frontend actualiza el contador de no leídas.
6. El frontend muestra un toast o alerta visual.
7. La notificación también queda guardada en la base de datos.

---

## 15. Endpoint propuesto para tiempo real

Crear endpoint:

```txt
backend/app/api/notificaciones/stream/route.ts
```

Función:

* validar sesión del usuario;
* abrir conexión `text/event-stream`;
* escuchar eventos de notificación;
* enviar solo las notificaciones del usuario autenticado;
* cerrar conexión si el usuario se desconecta.

---

## 16. Estrategia técnica recomendada

### Opción principal

Usar:

* PostgreSQL;
* `LISTEN / NOTIFY`;
* endpoint SSE en el backend;
* `EventSource` en el frontend.

### Flujo técnico

1. El backend crea una notificación en la tabla.
2. El backend emite un evento interno.
3. PostgreSQL publica el evento con `NOTIFY`.
4. El endpoint SSE escucha el canal.
5. El frontend recibe la notificación en tiempo real.
6. React Query actualiza la cache.
7. El componente visual muestra la notificación.

### Opción alternativa

Si el despliegue no permite conexiones persistentes, usar:

* polling cada 15 o 30 segundos;
* Supabase Realtime;
* Redis Pub/Sub;
* Pusher;
* Socket.IO.

---

## 17. Cambios recomendados en frontend

El frontend debe tener una experiencia clara de notificaciones.

### Componentes sugeridos

```txt
frontend/src/components/notifications/NotificationBell.tsx
frontend/src/components/notifications/NotificationDropdown.tsx
frontend/src/components/notifications/NotificationItem.tsx
frontend/src/components/notifications/NotificationToast.tsx
frontend/src/pages/NotificationsPage.tsx
frontend/src/hooks/useRealtimeNotifications.ts
frontend/src/lib/api/notificaciones.ts
```

### Funcionalidades mínimas

1. Campana de notificaciones visible en el layout principal.
2. Contador de notificaciones no leídas.
3. Dropdown con las últimas notificaciones.
4. Página completa de notificaciones.
5. Botón para marcar una como leída.
6. Botón para marcar todas como leídas.
7. Toast en tiempo real cuando llega una nueva notificación.
8. Redirección al detalle usando `url_accion`.
9. Filtros por tipo: académico, pago, sistema, comunicado.
10. Diferenciación visual entre leídas y no leídas.

---

## 18. Formato de mensajes

Las notificaciones deben ser claras, cortas y útiles.

### Estructura recomendada

```txt
Título: [Actor] + [acción principal]
Cuerpo: [detalle contextual]
URL: ruta hacia el recurso afectado
```

### Ejemplos

#### Nota registrada

```txt
Título: Docente Juan Pérez calificó tu evaluación
Cuerpo: Se registró tu nota de Matemática correspondiente al Bimestre I.
URL: /alumno/notas
```

#### Libreta subida

```txt
Título: Nueva libreta disponible
Cuerpo: Docente Juan Pérez subió tu libreta del Bimestre I.
URL: /alumno/libretas
```

#### Docente creado

```txt
Título: Nuevo docente registrado
Cuerpo: Admin Andre registró al docente Juan Pérez en el sistema.
URL: /admin/docentes
```

#### Boleta revisada

```txt
Título: Tu boleta fue revisada
Cuerpo: Secretaría María revisó la boleta que subiste. Ingresa para ver el estado.
URL: /alumno/pagos
```

---

## 19. Seguridad y permisos

El sistema debe cumplir estas reglas:

1. Un usuario solo puede ver sus propias notificaciones.
2. Un usuario no debe poder crear notificaciones arbitrarias hacia otros usuarios desde el frontend.
3. Las notificaciones automáticas deben generarse desde el backend.
4. El endpoint manual de creación debe reservarse solo para comunicados de administrador o secretaría.
5. El frontend nunca debe decidir por sí solo los destinatarios reales.
6. Los destinatarios deben resolverse en backend.
7. La información sensible debe limitarse según el rol del usuario.
8. No se deben exponer notas, pagos o datos privados en notificaciones dirigidas a usuarios no autorizados.

---

## 20. Prevención de duplicados

Para evitar notificaciones repetidas, se recomienda usar un campo `idempotency_key`.

Ejemplo:

```txt
NOTA_REGISTRADA:notaId:alumnoId
LIBRETA_SUBIDA:libretaId:alumnoId
DOCENTE_CREADO:docenteId:secretariaId
```

Antes de crear una notificación, el sistema debe validar si ya existe una con la misma clave.

---

## 21. Preferencias futuras de usuario

En una segunda fase, se puede agregar una tabla de preferencias.

Ejemplo:

```txt
usuario_id
recibir_notas
recibir_pagos
recibir_comunicados
recibir_sistema
recibir_toast
recibir_email
```

Esto permitiría que cada usuario personalice qué notificaciones desea recibir.

---

## 22. Fases de implementación

### Fase 1: Reestructuración del modelo

* Ampliar tabla de notificaciones.
* Agregar campos de actor, evento, entidad, metadata y prioridad.
* Actualizar Prisma schema.
* Crear migración.
* Actualizar repositorio y schemas de validación.

### Fase 2: Servicio centralizado de eventos

* Crear catálogo de eventos.
* Crear resolver de destinatarios.
* Crear builder de mensajes.
* Crear método `notificarEvento`.
* Mantener compatibilidad con el listado actual de notificaciones.

### Fase 3: Integración con módulos clave

Integrar notificaciones automáticas en:

1. docentes;
2. alumnos;
3. notas;
4. libretas;
5. actividades;
6. materiales;
7. boletas;
8. pagos;
9. asistencias;
10. periodos.

### Fase 4: Tiempo real

* Crear endpoint SSE.
* Implementar canal de eventos.
* Usar PostgreSQL `LISTEN / NOTIFY` o un bus interno.
* Crear hook `useRealtimeNotifications`.
* Actualizar React Query cache.
* Mostrar toast en frontend.

### Fase 5: Interfaz de usuario

* Crear campana de notificaciones.
* Crear dropdown.
* Crear página de historial.
* Agregar filtros.
* Agregar botón de marcar como leído.
* Agregar botón de marcar todas como leídas.
* Mejorar estilos de notificaciones por tipo y prioridad.

### Fase 6: Pruebas

* Probar notificaciones por rol.
* Probar notificaciones masivas.
* Probar usuario conectado y desconectado.
* Probar actualización en tiempo real.
* Probar permisos.
* Probar duplicados.
* Probar errores de conexión SSE.
* Probar fallback con polling.

---

## 23. Criterios de aceptación

El sistema se considerará funcional cuando cumpla lo siguiente:

1. Cuando el administrador registre un docente, las secretarías y administradores reciben una notificación.
2. Cuando el docente califique una tarea, el alumno correspondiente recibe una notificación.
3. Cuando el docente califique una evaluación, el alumno correspondiente recibe una notificación.
4. Cuando se suba una libreta, el alumno relacionado recibe una notificación.
5. Cuando se publique material, los alumnos del curso o sección reciben una notificación.
6. Cuando una secretaría revise una boleta, el alumno recibe una notificación.
7. Las notificaciones aparecen sin recargar la página.
8. El contador de no leídas se actualiza en tiempo real.
9. El usuario no puede ver notificaciones de otros usuarios.
10. El sistema evita duplicados.
11. Las notificaciones quedan guardadas aunque el usuario esté desconectado.
12. Al hacer clic en una notificación, el usuario es llevado a la pantalla correspondiente.

---

## 24. Archivos sugeridos a crear o modificar

### Backend

```txt
backend/modules/notificaciones/notificacion.repository.ts
backend/modules/notificaciones/notificacion.schema.ts
backend/modules/notificaciones/notificacion.service.ts
backend/modules/notificaciones/notificacion.events.ts
backend/modules/notificaciones/notificacion-recipient-resolver.ts
backend/modules/notificaciones/notificacion-message-builder.ts
backend/app/api/notificaciones/route.ts
backend/app/api/notificaciones/contar/route.ts
backend/app/api/notificaciones/leer-todas/route.ts
backend/app/api/notificaciones/[id]/leer/route.ts
backend/app/api/notificaciones/stream/route.ts
backend/prisma/schema.prisma
```

### Módulos a integrar

```txt
backend/modules/docentes/docentes.service.ts
backend/modules/alumnos/alumnos.service.ts
backend/modules/notas/nota.service.ts
backend/modules/libretas/libreta.service.ts
backend/modules/actividades
backend/modules/materiales
backend/modules/boletas
backend/modules/pagos
backend/modules/asistencias
backend/modules/periodo
```

### Frontend

```txt
frontend/src/lib/api/notificaciones.ts
frontend/src/hooks/useRealtimeNotifications.ts
frontend/src/components/notifications/NotificationBell.tsx
frontend/src/components/notifications/NotificationDropdown.tsx
frontend/src/components/notifications/NotificationItem.tsx
frontend/src/pages/NotificationsPage.tsx
frontend/src/layouts
```

---

## 25. Recomendación final

La prioridad debe ser convertir el módulo de notificaciones en un sistema basado en eventos. No basta con guardar mensajes en una tabla. Cada acción importante del sistema debe disparar un evento, y el backend debe decidir automáticamente quién debe recibir la notificación.

El orden recomendado es:

1. mejorar el modelo de datos;
2. crear catálogo de eventos;
3. crear resolver de destinatarios;
4. integrar eventos en módulos académicos y administrativos;
5. implementar tiempo real con SSE;
6. mejorar la interfaz del frontend.

Con esto, las notificaciones dejarán de ser un módulo aislado y pasarán a funcionar como una capa transversal del sistema.

## 26. Consideraciones adicionales para el sistema de notificaciones

Además de implementar notificaciones en tiempo real, se deben considerar aspectos funcionales, técnicos y de seguridad para evitar que el sistema genere mensajes incompletos, duplicados, inseguros o molestos para los usuarios.

### 26.1. No todo debe notificarse

El sistema no debe notificar absolutamente todas las acciones. Solo deben notificarse eventos relevantes para el usuario.

Ejemplos que sí deben notificarse:

* nota registrada;
* nota actualizada;
* tarea calificada;
* evaluación calificada;
* libreta generada o disponible;
* material académico publicado;
* actividad publicada;
* pago generado;
* boleta subida;
* boleta aprobada o rechazada;
* docente creado;
* alumno creado;
* usuario activado o desactivado;
* comunicado institucional;
* cambio importante de periodo académico.

Ejemplos que no necesariamente deben notificarse:

* consultas de datos;
* filtros de listados;
* descargas internas administrativas;
* cambios menores sin impacto para el usuario;
* actualizaciones técnicas internas;
* acciones repetidas sin cambio real.

---

### 26.2. Diferenciar auditoría de notificaciones

La auditoría y las notificaciones no cumplen la misma función.

La auditoría sirve para registrar trazabilidad interna del sistema: quién hizo algo, cuándo, desde dónde y sobre qué entidad.

La notificación sirve para informar a un usuario que ocurrió algo relevante para él.

Por eso, una acción puede generar auditoría sin generar notificación, o puede generar ambas.

Ejemplo:

* Un docente registra una nota.
* Auditoría: se guarda que el docente creó o modificó una nota.
* Notificación: el alumno recibe un aviso indicando que su nota fue registrada.

---

### 26.3. Usar los eventos después de confirmar la operación

Las notificaciones deben crearse solo después de que la acción principal se haya completado correctamente.

No se debe notificar antes de guardar una nota, actividad, boleta, pago o docente, porque si ocurre un error, el usuario recibiría una notificación falsa.

Flujo recomendado:

1. Validar permisos.
2. Ejecutar acción principal.
3. Guardar cambios en base de datos.
4. Registrar auditoría si corresponde.
5. Crear evento de notificación.
6. Resolver destinatarios.
7. Guardar notificaciones.
8. Enviar aviso en tiempo real.

---

### 26.4. Transacciones

Cuando sea posible, la acción principal, la auditoría y la creación de notificaciones deben ejecutarse dentro de una transacción.

Esto evita casos inconsistentes como:

* nota guardada pero sin notificación;
* notificación creada pero nota no guardada;
* pago actualizado pero boleta sin estado final;
* docente creado pero sin aviso a secretaría o administrador.

Ejemplo ideal:

```ts
await prisma.$transaction(async (tx) => {
  const resultado = await guardarAccionPrincipal(tx);
  await registrarAuditoria(tx);
  await crearNotificaciones(tx);
  return resultado;
});
```

---

### 26.5. Resolver destinatarios desde relaciones reales

Los destinatarios no deben definirse manualmente desde el frontend.

El backend debe resolverlos según las relaciones del sistema:

* alumno dueño de la nota;
* alumno dueño del pago;
* alumnos de una sección;
* docente asignado a una sección;
* administradores activos;
* secretarías activas;
* usuario creado o modificado;
* responsable de revisión;
* usuarios relacionados con una actividad, material o libreta.

Ejemplo:

Si el docente publica una actividad para una sección, el frontend no debe enviar la lista de alumnos. El backend debe buscar todos los alumnos activos de esa sección y crear una notificación para cada uno.

---

### 26.6. Evitar notificaciones duplicadas

El sistema debe tener una estrategia de idempotencia para evitar que se creen notificaciones repetidas.

Ejemplos de claves únicas:

```txt
NOTA_REGISTRADA:notaId:alumnoId
NOTA_ACTUALIZADA:notaId:alumnoId:version
TAREA_CALIFICADA:entregaId:alumnoId
MATERIAL_PUBLICADO:materialId:alumnoId
ACTIVIDAD_PUBLICADA:actividadId:alumnoId
BOLETA_REVISADA:boletaId:alumnoId
DOCENTE_CREADO:docenteId:perfilDestinoId
PAGO_GENERADO:pagoId:alumnoId
```

Esto es importante especialmente cuando se usan reintentos, formularios que se envían dos veces o procesos batch.

---

### 26.7. Notificaciones masivas controladas

Algunas acciones pueden generar muchas notificaciones, por ejemplo:

* publicar una actividad para una sección;
* publicar material para un curso;
* enviar comunicado general;
* actualizar periodo académico;
* generar pagos masivos.

En esos casos, el sistema debe crear notificaciones en lote y evitar bloquear la respuesta del endpoint.

Opciones:

* usar `createMany`;
* procesar en lotes;
* evitar duplicados;
* limitar destinatarios por rol, sección o curso;
* registrar un resumen del evento.

---

### 26.8. Manejo de usuario conectado y desconectado

El sistema debe funcionar en ambos casos.

Si el usuario está conectado:

* recibe la notificación en tiempo real;
* se actualiza el contador;
* aparece un toast;
* se actualiza la bandeja.

Si el usuario está desconectado:

* la notificación queda guardada en la base de datos;
* al iniciar sesión, se cargan las notificaciones no leídas;
* el contador se muestra correctamente.

---

### 26.9. Fallback si falla el tiempo real

El tiempo real no debe ser la única forma de recibir notificaciones.

Si SSE, WebSocket o el canal en vivo falla, el frontend debe seguir consultando las notificaciones cada cierto tiempo.

Estrategia recomendada:

* tiempo real con SSE como canal principal;
* polling cada 30 o 60 segundos como respaldo;
* recarga manual al abrir el dropdown de notificaciones;
* recarga automática al volver a enfocar la pestaña.

---

### 26.10. Prioridades de notificación

No todas las notificaciones tienen la misma importancia.

Se recomienda manejar niveles de prioridad:

```txt
baja
normal
alta
urgente
```

Ejemplos:

* `normal`: material publicado, tarea calificada.
* `alta`: pago observado, libreta bloqueada, boleta rechazada.
* `urgente`: comunicado institucional importante, bloqueo de cuenta, vencimiento crítico.

---

### 26.11. Estados adicionales

Además de `leida`, se pueden considerar otros estados:

```txt
no_leida
leida
archivada
eliminada_por_usuario
expirada
```

Esto permite que el usuario limpie su bandeja sin borrar físicamente la trazabilidad.

---

### 26.12. Metadata para enriquecer mensajes

Cada notificación debe guardar metadata para poder mostrar información útil sin depender completamente de consultas adicionales.

Ejemplo:

```json
{
  "alumnoId": "...",
  "alumnoNombre": "Carlos Ramos",
  "docenteId": "...",
  "docenteNombre": "Juan Pérez",
  "cursoNombre": "Matemática",
  "bimestre": "Bimestre I",
  "notaId": "...",
  "actividadId": "..."
}
```

Esto ayuda a construir mensajes claros, filtrar notificaciones y redirigir correctamente.

---

### 26.13. Plantillas de mensajes

No conviene escribir los mensajes manualmente en cada módulo.

Se recomienda crear un builder centralizado de mensajes.

Archivo sugerido:

```txt
backend/modules/notificaciones/notificacion-message-builder.ts
```

Ejemplo:

```ts
buildNotificationMessage(evento, contexto)
```

Este archivo debe devolver:

* título;
* cuerpo;
* tipo;
* prioridad;
* URL de acción;
* metadata.

---

### 26.14. URLs internas, no URLs absolutas

El campo `url_accion` debe aceptar rutas internas del sistema, no solo URLs absolutas.

Ejemplos recomendados:

```txt
/alumno/notas
/alumno/libretas
/alumno/pagos
/admin/docentes
/secretaria/boletas
/docente/actividades
```

Esto es importante porque las notificaciones deben redirigir dentro del sistema, no necesariamente hacia páginas externas.

---

### 26.15. Permisos de redirección

Aunque una notificación tenga una URL, el backend y el frontend deben validar permisos al abrir el recurso.

Ejemplo:

Un alumno no debe poder abrir una notificación de otro alumno cambiando manualmente el ID en la URL.

La notificación solo informa. La autorización real debe seguir estando en los endpoints del módulo correspondiente.

---

### 26.16. No exponer datos sensibles en el mensaje

Las notificaciones no deben mostrar información sensible completa.

Ejemplos:

Incorrecto:

```txt
Tu nota fue 08 y estás desaprobado en Matemática.
```

Mejor:

```txt
Se registró una nueva calificación en Matemática. Ingresa para revisar el detalle.
```

Incorrecto:

```txt
Tu pago de S/ 450 fue rechazado por operación inválida.
```

Mejor:

```txt
Tu boleta fue observada. Ingresa para revisar el detalle.
```

---

### 26.17. Integración con auditoría existente

Las acciones relevantes ya deben quedar auditadas, pero la notificación debe ser una capa adicional.

Se recomienda que el flujo sea:

```txt
Acción del usuario
→ Validación de permisos
→ Guardado en módulo correspondiente
→ Auditoría
→ Evento de notificación
→ Persistencia de notificación
→ Envío en tiempo real
```

No se debe usar la tabla de auditoría como bandeja de notificaciones, porque su finalidad es distinta.

---

### 26.18. Notificaciones generadas por procedimientos SQL

Si algunos procedimientos almacenados ya generan notificaciones, se debe revisar que no entren en conflicto con el nuevo servicio del backend.

El sistema debe evitar dos fuentes distintas creando la misma notificación.

Recomendación:

* centralizar la creación en backend; o
* documentar claramente qué eventos se generan desde SQL;
* agregar idempotency key;
* evitar duplicados entre triggers, stored procedures y servicios backend.

---

### 26.19. Pruebas por escenario

Se deben crear pruebas funcionales por cada flujo importante.

Escenarios mínimos:

1. Admin crea docente.
2. Admin actualiza docente.
3. Docente crea actividad.
4. Docente publica material.
5. Alumno entrega tarea.
6. Docente califica tarea.
7. Docente registra nota.
8. Docente actualiza nota.
9. Alumno sube boleta.
10. Secretaría aprueba boleta.
11. Secretaría rechaza boleta.
12. Admin genera pago.
13. Alumno inicia sesión y ve notificaciones pendientes.
14. Usuario conectado recibe notificación sin recargar.
15. Usuario no puede ver notificaciones de otro usuario.
16. El sistema no duplica notificaciones.

---

### 26.20. Métricas administrativas

En una fase futura, el administrador podría ver métricas de notificaciones:

* total enviadas;
* total no leídas;
* porcentaje de lectura;
* notificaciones por tipo;
* notificaciones por rol;
* eventos más frecuentes;
* errores de envío en tiempo real.

Esto ayuda a validar si el sistema realmente está comunicando información útil.

---

## 27. Resumen de lo que debe pedirse al implementar

El requerimiento no debe ser solo “arreglar notificaciones”.

Debe pedirse lo siguiente:

Refactorizar el módulo de notificaciones para convertirlo en una capa transversal basada en eventos, integrada con los módulos académicos, administrativos y financieros del sistema. El sistema debe permitir notificaciones persistentes y en tiempo real, con actor, evento, entidad afectada, destinatarios resueltos desde backend, prevención de duplicados, reglas por rol, URLs internas, control de permisos y fallback si falla el canal en vivo.
