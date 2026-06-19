# Plan de refactorización del módulo de libretas de notas por alumno – SGEI

## 1. Objetivo general

Refactorizar el módulo de libretas de notas del SGEI para que la secretaría pueda recibir, revisar, consolidar, generar, descargar y publicar libretas individuales por alumno, tomando como base las notas registradas por los docentes y un formato flexible similar a la boleta oficial de progreso del aprendizaje. 

El formato de libreta de notas para que te guies es este C:\Users\user\Downloads\SGEI\resources\boleta-2021.docx

El objetivo no es reemplazar el acta consolidada del SIAGIE, sino separar claramente ambos flujos:
Ten en cuenta lo que ya existe, incluyendo la base de datos, no elimines nada de lo que ya funciona ni lo modifiques, nada de lo que tenga que ver con este requerimiento.

* **SIAGIE / Acta consolidada:** reporte general, final o administrativo.
* **Libreta individual:** informe de progreso por alumno, por bimestre o por periodo académico, descargable en PDF y adaptable a cursos, competencias y estructura curricular.

---

## 2. Diagnóstico del estado actual

Actualmente el sistema permite que los docentes registren notas de sus alumnos y que exista una consulta de libreta por alumno desde backend. Sin embargo, el flujo todavía no está completo para secretaría.

### Problemas principales

1. La secretaría no cuenta con un módulo propio para gestionar libretas individuales.
2. El flujo parece orientado principalmente al consolidado SIAGIE, no a la libreta individual por alumno.
3. No existe una bandeja donde secretaría vea qué docentes ya enviaron notas por bimestre.
4. No hay control claro de cierre de notas por docente, curso, sección y bimestre.
5. No hay un estado formal de libreta: borrador, en revisión, aprobada, publicada o bloqueada.
6. El PDF actual debe volverse más parecido al formato de boleta de notas.
7. El formato debe ser dinámico, porque los cursos y competencias pueden variar.
8. No debe depender de un diseño rígido con cursos quemados en el código.
9. No hay una descarga masiva organizada por grado, sección o bimestre.
10. Falta integrar la libreta con asistencia, conclusiones descriptivas, situación final, deuda/bloqueo y notificaciones.

---

## 3. Diferencia entre acta SIAGIE y libreta individual

El sistema debe separar dos conceptos.

### Acta consolidada SIAGIE

Es un documento administrativo general. Sirve para consolidar información académica de varios alumnos, normalmente por periodo, grado o sección. Puede contener promedios finales, situación final y estructura requerida para exportación o revisión institucional.

### Libreta individual del alumno

Es un informe personalizado para cada estudiante. Debe mostrar su avance académico por áreas, competencias y periodos. También debe incluir datos del alumno, institución, asistencia, conclusiones descriptivas y firmas.

Por eso, aunque ambos usan notas, no deben ser el mismo módulo.

---

## 4. Nuevo flujo propuesto

El módulo debe funcionar así:

```txt id="ykoarb"
Docente registra notas
→ Docente revisa y cierra notas del bimestre
→ Secretaría recibe estado de avance
→ Secretaría valida notas completas
→ Secretaría genera libretas por alumno
→ Secretaría revisa vista previa
→ Secretaría aprueba/publica
→ Alumno descarga su libreta
→ Sistema registra auditoría y notifica
```

---

## 5. Roles involucrados

| Rol        | Función dentro del módulo                                                                  |
| ---------- | ------------------------------------------------------------------------------------------ |
| Docente    | Registra notas por competencia, curso, alumno y bimestre. Luego cierra o envía sus notas.  |
| Secretaría | Revisa avance, valida notas recibidas, genera libretas, descarga PDFs y publica libretas.  |
| Admin      | Configura cursos, competencias, bimestres, plantillas, desbloqueos y permisos.             |
| Alumno     | Visualiza y descarga su libreta publicada, siempre que no tenga bloqueo.                   |
| Sistema    | Consolida datos, valida faltantes, genera PDFs, registra auditoría y envía notificaciones. |

---

## 6. Módulo nuevo para secretaría

Crear una nueva sección en el frontend:

```txt id="1t566f"
/secretaria/libretas
```

Esta pantalla debe ser diferente al módulo SIAGIE. Debe estar pensada para gestión de libretas individuales.

### Funcionalidades principales

1. Ver listado de grados y secciones.
2. Filtrar por periodo académico.
3. Filtrar por bimestre.
4. Ver alumnos de una sección.
5. Ver estado de notas por alumno.
6. Ver estado de envío por docente.
7. Detectar alumnos con notas incompletas.
8. Detectar competencias sin calificar.
9. Generar libreta individual.
10. Ver vista previa de libreta.
11. Descargar PDF individual.
12. Descargar ZIP con todas las libretas de una sección.
13. Publicar libretas para alumnos.
14. Bloquear o impedir publicación si hay deuda o bloqueo administrativo.
15. Registrar auditoría de descarga, generación y publicación.

---

## 7. Bandeja de recepción de notas para secretaría

La secretaría necesita una vista tipo “panel de recepción”.

### Filtros

* Año académico.
* Bimestre.
* Nivel.
* Grado.
* Sección.
* Curso.
* Docente.
* Estado.

### Estados sugeridos

```txt id="2wf15w"
Pendiente
Parcial
Completo
Observado
Cerrado por docente
Validado por secretaría
Publicado
```

### Ejemplo de tabla

| Docente    | Curso                | Grado | Sección | Bimestre   | Alumnos | Notas esperadas | Notas registradas | Estado    |
| ---------- | -------------------- | ----- | ------- | ---------- | ------: | --------------: | ----------------: | --------- |
| Juan Pérez | Matemática           | 5°    | A       | Bimestre I |      25 |             100 |               100 | Completo  |
| Rosa Díaz  | Comunicación         | 5°    | A       | Bimestre I |      25 |              75 |                60 | Parcial   |
| Luis Ramos | Ciencia y Tecnología | 5°    | A       | Bimestre I |      25 |              75 |                 0 | Pendiente |

---

## 8. Cierre de notas por docente

El docente no solo debe registrar notas, también debe poder “enviar” o “cerrar” sus notas del bimestre.

### Flujo del docente

1. Selecciona curso, grado, sección y bimestre.
2. Registra notas por competencia.
3. El sistema valida notas faltantes.
4. El docente corrige observaciones.
5. El docente presiona “Enviar notas a secretaría”.
6. El sistema bloquea la edición normal.
7. Secretaría recibe el estado como “cerrado por docente”.

### Si luego hay correcciones

Las correcciones deben pasar por un flujo controlado:

```txt id="vxggbu"
Solicitud de corrección
→ Motivo obligatorio
→ Desbloqueo por Admin o Secretaría
→ Modificación
→ Auditoría
→ Nueva validación
→ Nueva publicación de libreta
```

---

## 9. Validaciones antes de generar libretas

Antes de generar una libreta, el sistema debe validar lo siguiente:

1. El alumno pertenece al periodo, grado y sección seleccionados.
2. El bimestre existe y está activo o cerrado.
3. El alumno tiene notas registradas en las competencias esperadas.
4. Las notas están dentro del rango permitido.
5. Las notas tienen conversión literal correcta.
6. No faltan cursos obligatorios.
7. No faltan competencias del plan curricular.
8. La asistencia del alumno está registrada.
9. La conclusión descriptiva del periodo está registrada si aplica.
10. El alumno no tiene bloqueo administrativo o financiero.
11. La plantilla de libreta está activa.
12. El formato puede adaptarse a la cantidad real de cursos y competencias.

---

## 10. Modelo de datos recomendado

El sistema puede seguir usando una vista o materialized view para consultar notas, pero para una libreta formal conviene guardar una versión generada como snapshot.

Esto permite que una libreta publicada no cambie accidentalmente si luego se modifica una nota.

### Tabla: `libreta`

```txt id="0xctyb"
id
alumno_id
periodo_id
bimestre_id
plantilla_id
estado
version
generada_por
aprobada_por
publicada_por
fecha_generacion
fecha_aprobacion
fecha_publicacion
pdf_url
pdf_hash
bloqueada
motivo_bloqueo
created_at
updated_at
```

### Estados de libreta

```txt id="ff7upg"
BORRADOR
EN_REVISION
OBSERVADA
APROBADA
PUBLICADA
BLOQUEADA
ANULADA
```

### Tabla: `libreta_detalle`

```txt id="1clh6o"
id
libreta_id
curso_id
curso_nombre_snapshot
competencia_id
competencia_nombre_snapshot
tipo_competencia
bimestre_numero
nota_vigesimal
nota_literal
calificativo_area
orden_curso
orden_competencia
observacion
```

### Tabla: `libreta_conclusion`

```txt id="szgjwa"
id
libreta_id
bimestre_id
conclusion_descriptiva
registrado_por
created_at
updated_at
```

### Tabla: `libreta_asistencia_resumen`

```txt id="p9v4b9"
id
libreta_id
bimestre_id
inasistencias_justificadas
inasistencias_injustificadas
tardanzas_justificadas
tardanzas_injustificadas
```

### Tabla: `libreta_revision`

```txt id="g55u5a"
id
libreta_id
estado_anterior
estado_nuevo
observacion
usuario_id
created_at
```

### Tabla: `plantilla_libreta`

```txt id="feqtyb"
id
nombre
descripcion
version
ruta_archivo
formato
activa
config_json
created_at
updated_at
```

---

## 11. Uso de plantilla flexible

El formato de libreta debe ser moldeable. No debe estar amarrado a una cantidad fija de cursos o competencias.

La plantilla debe permitir:

1. Encabezado institucional.
2. Datos de DRE, UGEL, institución, código modular, nivel, grado y sección.
3. Datos del estudiante.
4. Tabla dinámica de áreas curriculares.
5. Competencias por área.
6. Calificativos por periodo.
7. Calificativo final del área.
8. Conclusiones descriptivas por periodo.
9. Resumen de asistencia.
10. Firmas del tutor y director.
11. Saltos de página automáticos.
12. Ajuste de tamaño de fuente si hay muchas competencias.
13. Repetición de encabezado si la tabla ocupa varias páginas.

---

## 12. Generación de PDF

El generador de PDF debe evolucionar para soportar el formato oficial de libreta.

### Recomendación

Crear un builder más completo:

```txt id="l2kjzf"
backend/pdf/libreta-individual.builder.ts
```

Debe recibir una estructura ya consolidada:

```ts id="w94jfx"
{
  institucion,
  alumno,
  periodo,
  bimestre,
  cursos: [
    {
      area,
      competencias: [
        {
          nombre,
          calificativosPorPeriodo,
          calificativoFinal
        }
      ],
      calificativoFinalArea
    }
  ],
  conclusiones,
  asistencia,
  firmas
}
```

### Reglas del PDF

1. No hardcodear cursos.
2. Ordenar áreas y competencias según configuración académica.
3. Mostrar periodos 1, 2, 3 y 4 si la libreta es anual.
4. Mostrar solo el bimestre seleccionado si la libreta es bimestral.
5. Permitir formato anual o por bimestre.
6. Dividir automáticamente en varias páginas.
7. Mantener encabezados visibles.
8. Generar nombre de archivo claro.

Ejemplo:

```txt id="z1ssgh"
libreta_2026_5A_Bimestre1_Carlos_Ramos.pdf
```

---

## 13. Vista previa antes de publicar

Secretaría debe poder revisar la libreta antes de publicarla.

### Acciones disponibles

* Ver datos del alumno.
* Ver notas por curso.
* Ver competencias.
* Ver conclusión descriptiva.
* Ver asistencia.
* Ver observaciones.
* Previsualizar PDF.
* Descargar borrador.
* Aprobar libreta.
* Observar libreta.
* Publicar libreta.

---

## 14. Publicación para alumnos

Una libreta generada no debe estar disponible automáticamente para el alumno.

Debe pasar por estado:

```txt id="puwrzc"
BORRADOR
→ EN_REVISION
→ APROBADA
→ PUBLICADA
```

El alumno solo debe ver libretas en estado `PUBLICADA`.

Si el alumno tiene deuda o bloqueo, el sistema puede mostrar:

```txt id="fzvagq"
Tu libreta está bloqueada por deuda pendiente o bloqueo administrativo.
```

---

## 15. Descarga individual y masiva

### Descarga individual

Secretaría debe poder descargar la libreta de un alumno específico.

Ruta sugerida:

```txt id="y711kp"
/api/libretas/:alumnoId/pdf?bimestreId=...
```

### Descarga masiva

Agregar endpoint para descargar todas las libretas de una sección:

```txt id="ms0x24"
/api/libretas/exportar-lote?periodoId=...&bimestreId=...&seccionId=...
```

Resultado:

```txt id="vr5mfq"
libretas_2026_5A_Bimestre1.zip
```

Dentro del ZIP:

```txt id="ikn8zp"
01_Carlos_Ramos.pdf
02_Maria_Torres.pdf
03_Juan_Quispe.pdf
```

---

## 16. Integración con asistencia

La libreta no debe mostrar solo notas.

Debe incluir resumen de asistencia por periodo:

* inasistencias justificadas;
* inasistencias injustificadas;
* tardanzas justificadas;
* tardanzas injustificadas.

Esta información debe venir del módulo de asistencias y consolidarse por alumno y bimestre.

---

## 17. Integración con conclusiones descriptivas

El formato de libreta debe permitir conclusiones descriptivas por periodo.

Crear o reutilizar una entidad donde el tutor, docente o secretaría pueda registrar:

```txt id="wxuj5x"
alumno_id
periodo_id
bimestre_id
conclusion_descriptiva
registrado_por
fecha_registro
```

Debe permitirse que la conclusión sea opcional o requerida según configuración.

---

## 18. Integración con cursos y competencias

El módulo debe tomar la estructura desde la configuración académica del sistema.

No se debe construir la libreta con cursos fijos como:

```txt id="zfgh43"
Matemática
Comunicación
Ciencia y Tecnología
```

Debe obtenerlos desde:

* periodo académico;
* nivel;
* grado;
* sección;
* cursos activos;
* competencias asociadas;
* orden curricular;
* tipo de competencia.

Así el sistema será escalable si se agregan nuevos cursos, competencias o planes curriculares.

---

## 19. Integración con notas

Las notas docentes deben alimentar el módulo de libretas.

### Reglas

1. Cada nota debe pertenecer a un alumno, competencia, bimestre y docente.
2. La libreta debe agrupar notas por área curricular.
3. La libreta debe mostrar competencias debajo de cada área.
4. La libreta debe mostrar calificativo por periodo.
5. El sistema debe calcular o mostrar el calificativo final del área.
6. Si falta una nota, debe mostrarse como pendiente en secretaría, no como cero.
7. Si la nota está cerrada, solo debe modificarse con permiso especial.
8. Cada modificación debe quedar auditada.

---

## 20. Cálculo de calificativos

Debe definirse una regla clara para calcular el calificativo de área.

Opciones posibles:

1. Promedio simple de competencias.
2. Promedio ponderado por competencia.
3. Último nivel de logro del bimestre.
4. Regla configurable por curso.
5. Registro manual validado por secretaría.

Recomendación inicial:

* usar promedio simple o regla existente para comenzar;
* guardar la regla usada en metadata;
* permitir cambiar la fórmula después sin romper libretas ya publicadas.

---

## 21. Notificaciones relacionadas

El módulo debe integrarse con el sistema de notificaciones.

### Eventos sugeridos

```txt id="rgalf6"
NOTAS_ENVIADAS_A_SECRETARIA
NOTAS_OBSERVADAS_POR_SECRETARIA
LIBRETA_GENERADA
LIBRETA_OBSERVADA
LIBRETA_APROBADA
LIBRETA_PUBLICADA
LIBRETA_BLOQUEADA
LIBRETA_DESBLOQUEADA
LIBRETA_DESCARGADA
```

### Ejemplos

Cuando un docente envía notas:

```txt id="wk3gh7"
Secretaría recibe: El docente Juan Pérez envió las notas de Matemática del Bimestre I.
```

Cuando secretaría publica una libreta:

```txt id="k7kxlg"
Alumno recibe: Tu libreta del Bimestre I ya está disponible.
```

Cuando una libreta es observada:

```txt id="rlrhrp"
Docente recibe: Secretaría observó las notas de Matemática del Bimestre I.
```

---

## 22. Auditoría

La generación, descarga, aprobación y publicación de libretas debe quedar auditada.

Eventos de auditoría sugeridos:

```txt id="hc1u7k"
READ_SENSITIVE: descarga o visualización de libreta
CREATE: generación de libreta
UPDATE: cambio de estado de libreta
PUBLISH: publicación para alumno
REJECT/OBSERVE: observación de libreta
```

Datos mínimos:

* usuario;
* rol;
* alumno afectado;
* periodo;
* bimestre;
* IP;
* navegador;
* fecha;
* acción;
* estado anterior;
* estado nuevo.

---

## 23. Seguridad y permisos

### Alumno

Puede:

* ver sus libretas publicadas;
* descargar su propia libreta;
* ver bloqueo si corresponde.

No puede:

* ver libretas de otros alumnos;
* ver borradores;
* ver libretas observadas;
* modificar notas.

### Docente

Puede:

* registrar notas;
* enviar notas a secretaría;
* ver observaciones de sus cursos;
* corregir si tiene desbloqueo.

No puede:

* descargar libretas masivas;
* publicar libretas;
* ver libretas de alumnos fuera de sus secciones asignadas.

### Secretaría

Puede:

* ver recepción de notas;
* validar por bimestre;
* generar libretas;
* observar libretas;
* aprobar o publicar según permisos definidos;
* descargar PDFs individuales y masivos.

### Admin

Puede:

* configurar plantilla;
* configurar cursos y competencias;
* desbloquear correcciones;
* administrar reglas de cálculo;
* revisar auditoría.

---

## 24. Bloqueo por deuda o estado administrativo

El sistema debe mantener la regla de bloqueo de libreta por deuda o bloqueo administrativo.

Pero debe diferenciar:

* bloqueo para alumno;
* bloqueo para descarga pública;
* descarga interna de secretaría;
* descarga administrativa por auditoría.

Ejemplo:

| Caso                                      | Resultado               |
| ----------------------------------------- | ----------------------- |
| Alumno con deuda intenta descargar        | Bloqueado               |
| Secretaría descarga para revisión interna | Permitido con auditoría |
| Admin descarga por control                | Permitido con auditoría |
| Alumno sin deuda y libreta publicada      | Permitido               |

---

## 25. Pantallas frontend sugeridas

### Secretaría – Libretas

```txt id="7wocuu"
/secretaria/libretas
```

Debe mostrar:

* filtros;
* resumen de avance;
* tabla por grado/sección;
* estado por docente;
* estado por alumno;
* acciones de generación y descarga.

### Secretaría – Detalle de sección

```txt id="6jitv6"
/secretaria/libretas/secciones/:seccionId
```

Debe mostrar:

* alumnos de la sección;
* porcentaje de notas completas;
* libretas generadas;
* estado de publicación;
* botón de descarga individual;
* botón de descarga masiva.

### Secretaría – Vista previa de libreta

```txt id="zqvecx"
/secretaria/libretas/:alumnoId
```

Debe mostrar:

* formato visual de la libreta;
* datos del estudiante;
* cursos y competencias;
* notas por periodo;
* asistencia;
* conclusiones;
* botones de aprobar, observar, publicar y descargar.

### Alumno – Mi libreta

```txt id="m568zi"
/alumno/libreta
```

Debe mostrar:

* selector de bimestre;
* libreta publicada;
* descarga PDF;
* estado de bloqueo;
* mensaje si aún no está publicada.

---

## 26. Endpoints recomendados

### Consulta

```txt id="gtp3f0"
GET /api/libretas
GET /api/libretas/:alumnoId
GET /api/libretas/:alumnoId/pdf
GET /api/libretas/estado-recepcion
GET /api/libretas/secciones/:seccionId/resumen
```

### Generación

```txt id="3u4iej"
POST /api/libretas/generar
POST /api/libretas/generar-lote
```

### Revisión

```txt id="rl6c80"
PATCH /api/libretas/:id/aprobar
PATCH /api/libretas/:id/observar
PATCH /api/libretas/:id/publicar
PATCH /api/libretas/:id/anular
```

### Exportación

```txt id="g8ukr8"
GET /api/libretas/:id/pdf
GET /api/libretas/exportar-lote
```

### Docente

```txt id="cpqls6"
POST /api/notas/enviar-a-secretaria
GET /api/notas/estado-envio
```

---

## 27. Archivos backend a crear o modificar

```txt id="3zixs5"
backend/modules/libretas/libreta.repository.ts
backend/modules/libretas/libreta.service.ts
backend/modules/libretas/libreta.schema.ts
backend/modules/libretas/libreta-recipient-resolver.ts
backend/modules/libretas/libreta-calculator.ts
backend/modules/libretas/libreta-validator.ts
backend/modules/libretas/libreta-template.service.ts
backend/modules/libretas/libreta-export.service.ts
backend/pdf/libreta-individual.builder.ts
backend/pdf/libreta-template.builder.ts
backend/app/api/libretas/route.ts
backend/app/api/libretas/[alumnoId]/route.ts
backend/app/api/libretas/[alumnoId]/pdf/route.ts
backend/app/api/libretas/generar/route.ts
backend/app/api/libretas/generar-lote/route.ts
backend/app/api/libretas/exportar-lote/route.ts
backend/app/api/libretas/estado-recepcion/route.ts
backend/app/api/libretas/[id]/publicar/route.ts
backend/app/api/libretas/[id]/observar/route.ts
backend/app/api/libretas/[id]/aprobar/route.ts
```

---

## 28. Archivos frontend a crear o modificar

```txt id="083g5e"
frontend/src/lib/api/libretas.api.ts
frontend/src/app/routes.tsx
frontend/src/app/pages/secretaria/SecretariaLibretas.tsx
frontend/src/app/pages/secretaria/SecretariaLibretasSeccion.tsx
frontend/src/app/pages/secretaria/SecretariaLibretaPreview.tsx
frontend/src/app/pages/alumno/AlumnoLibreta.tsx
frontend/src/app/components/libretas/LibretaFilters.tsx
frontend/src/app/components/libretas/LibretaStatusBadge.tsx
frontend/src/app/components/libretas/LibretaPreview.tsx
frontend/src/app/components/libretas/ReceptionProgressTable.tsx
frontend/src/app/components/libretas/StudentReportCard.tsx
frontend/src/types/libreta.ts
```

---

## 29. Fases de implementación

### Fase 1: Diagnóstico y separación de flujos

* Revisar el módulo actual de libretas.
* Revisar el módulo SIAGIE.
* Confirmar qué endpoints ya existen.
* Separar conceptualmente acta consolidada y libreta individual.
* Documentar qué datos ya se obtienen desde notas y qué datos faltan.

### Fase 2: Bandeja de recepción de notas

* Crear resumen por docente, curso, sección y bimestre.
* Mostrar notas esperadas vs registradas.
* Mostrar faltantes.
* Crear estado de cierre por docente.
* Permitir observaciones de secretaría.

### Fase 3: Modelo formal de libreta

* Crear tablas de libreta, detalle, asistencia, conclusiones, revisión y plantilla.
* Mantener snapshot de datos al generar.
* Evitar que libretas publicadas cambien sin nueva versión.

### Fase 4: Generador PDF flexible

* Crear builder de PDF más completo.
* Adaptarlo al formato de boleta de notas.
* Hacer tabla dinámica por cursos y competencias.
* Agregar asistencia, conclusiones y firmas.
* Soportar varias páginas.

### Fase 5: Módulo frontend de secretaría

* Crear `/secretaria/libretas`.
* Crear filtros por periodo, grado, sección y bimestre.
* Crear vista de avance.
* Crear descarga individual.
* Crear descarga masiva.
* Crear vista previa antes de publicar.

### Fase 6: Publicación para alumnos

* Mostrar solo libretas publicadas.
* Respetar bloqueo por deuda.
* Permitir descarga PDF.
* Notificar al alumno cuando su libreta esté disponible.

### Fase 7: Auditoría, notificaciones y pruebas

* Auditar generación, descarga y publicación.
* Enviar notificaciones a secretaría, docentes y alumnos.
* Probar permisos.
* Probar descarga masiva.
* Probar alumnos con deuda.
* Probar cursos variables.
* Probar competencias variables.
* Probar libretas con muchas filas y salto de página.

---

## 30. Criterios de aceptación

El módulo se considerará funcional cuando cumpla lo siguiente:

1. Secretaría puede entrar a un módulo específico de libretas.
2. Secretaría puede filtrar por periodo, grado, sección y bimestre.
3. Secretaría puede ver qué docentes enviaron notas.
4. Secretaría puede detectar notas faltantes.
5. Docente puede enviar o cerrar notas del bimestre.
6. Secretaría puede generar libreta individual por alumno.
7. Secretaría puede ver vista previa antes de publicar.
8. Secretaría puede descargar la libreta de un alumno.
9. Secretaría puede descargar todas las libretas de una sección en ZIP.
10. Alumno solo puede ver su propia libreta publicada.
11. Alumno bloqueado por deuda no puede descargar la libreta.
12. El PDF respeta una estructura similar al formato de boleta de notas.
13. El formato soporta cursos y competencias variables.
14. Las libretas publicadas quedan versionadas.
15. Los cambios quedan auditados.
16. El sistema notifica cuando las libretas están disponibles.
17. El módulo SIAGIE queda separado del módulo de libretas individuales.

---

## 31. Requerimiento resumido para implementación

Refactorizar el módulo de libretas para que deje de ser solo una consulta/PDF básico por alumno y se convierta en un flujo completo de gestión académica. El sistema debe permitir que los docentes registren y envíen notas por bimestre, que secretaría las reciba y valide, que se consolide una libreta individual por alumno, que se genere un PDF flexible basado en una plantilla de boleta de notas, y que luego pueda ser revisada, aprobada, publicada y descargada por el alumno o secretaría según permisos.
