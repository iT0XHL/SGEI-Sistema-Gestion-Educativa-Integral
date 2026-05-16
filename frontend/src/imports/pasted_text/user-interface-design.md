El diseño de la interfaz sigue principios de usabilidad y accesibilidad que funciona tanto en web como en celular. Se definen vistas específicas para Alumno, Docente, Secretaria y Administrador.

6.1. Vistas del Usuario Final
Las vistas del usuario final comprenden los portales de Alumno de Familia, Docente, Coordinación y Dirección. Comparten una barra de navegación superior con el nombre del usuario, su rol y un botón de cierre de sesión.

6.1.1. Pantalla Principal — Portal del Alumno
La pantalla principal muestra un resumen personalizado del periodo académico activo. Para el Alumno incluye: accesos rápidos a cursos activos, últimas notas registradas, próximas actividades y estado de asistencia del mes. Para el Padre incluye adicionalmente el estado de cuenta (pago al día / deuda pendiente con monto).

Encabezado: nombre del alumno, grado y sección, ciclo académico activo.
Tarjetas de cursos: acceso rápido a materiales, actividades y notas por área.
Sección de subida de vouchers de pago por mensualidad.
Notificaciones: avisos del docente o de Secretaría (fechas de pago, actividades próximas). Esto debe verse únicamente desde la campana de notificaciones.
Descarga de PDF de la libreta desde el inicio con ayuda de un botón.(Deberá estar bloqueado en caso de deudas pendientes)
Nota adicional: Se conservará únicamente esto para la pestaña de inicio. Adicionalmente, debe verse las secciones de Cursos, Libreta digital, asistencias y Pagos desde el menú lateral.
6.1.2. Detalle del Curso
Al seleccionar un curso, el alumno accede a tres pestañas: Materiales, Actividades y Notas.
Pestaña Materiales: lista de PDFs y enlaces externos ordenados por fecha. Botón de descarga para cada recurso.
Pestaña Actividades: listado de tareas asignadas por el docente con fecha límite, estado (pendiente / entregado / calificado) y nota obtenida.
Pestaña Notas: tabla de calificaciones por bimestre y competencia, con promedio calculado automáticamente y equivalencia en escala literal (AD/A/B/C).
Estas tres pestañas están relacionadas con el portal docente de Subida de Tareas y Calificaciones, dado que el alumno podrá subir sus tareas en cualquier formato dependiendo de la publicación del docente.

6.1.3 Sección de Reporte de asistencias.
Se mostrará una tabla que contiene los cursos del alumno, su sección, y porcentajes de asistencias, tardanzas y faltas. Esta sección será accesible desde el panel desplegable.
6.1.3. Pantalla Principal — Portal del Docente
La pantalla principal muestra un resumen personalizado del periodo académico activo. Para el Docente incluye: accesos rápidos a cursos activos, tarjetas de total de actividades o tareas de alumnos por revisar por curso.
Encabezado: nombre del docente.
Tarjetas de cursos: acceso rápido al curso para subir materiales, tareas y calificaciones. En el panel de la visualización de los cursos se aplica un menú desplegable que filtra por el grado y/o sección del curso que enseña el docente.
6.1.4. Portal del Docente — Registro de Asistencia
A través de la barra lateral, el docente accede al registro de asistencia. Se mostrarán los cursos dictados y al seleccionar una sección y fecha, visualiza el listado de alumnos con controles rápidos para marcar Presente, Falta o Tardanza. El registro se guarda en tiempo real con confirmación visual.

Vista de lista de alumnos con foto (si está disponible), nombre completo.
Botones de acceso rápido: P (Presente) / F (Falta) / T (Tardanza) por alumno.
Indicador de progreso: cuántos alumnos han sido marcados vs. el total de la sección.
Acceso al historial de asistencia del mes con opción de corrección justificada.
6.1.5. Portal del Docente — Subida de Tareas y Calificaciones
El docente accede al curso correspondiente donde tendrá la opción de subir o adjuntar materiales de curso e incluso tareas. Se le da la opción de poner fecha límite y del mismo modo, podrá colocar la calificación de la tarea en un rango de 0 - 20. 
Botón de subir materiales: Se mostrará una vista donde el docente podrá adjuntar archivos PDF, docx, xlsx, e incluso links o URLs para apoyar al alumno en el curso.
Botón de subir Actividad/Tarea: Se mostrará una vista donde el docente podrá colocar detalles de la tarea como el título, instrucciones e incluso algún documento de guía o para desarrollar. Además de colocar el puntaje de dicha tarea con una fecha límite para recibir respuestas.
Pestaña Calificaciones: El docente podrá ver la lista de alumnos con las tareas adjuntadas y podrá poner la calificación correspondiente dentro del rango 0 - 20. Al final, el sistema debe mostrar el promedio de las notas colocadas rellenando las tareas sin entregar con nota 0.
6.1.6. Portal del Docente — Ingreso de Notas
El docente selecciona el área, grado y sección, luego el bimestre a registrar. El sistema muestra la malla curricular del nivel (Primaria o Secundaria) con las competencias del CNEB correspondientes al área. El docente ingresa la nota vigesimal final por competencia y alumno.

Tabla de ingreso: columnas por competencia del CNEB, filas por alumno.
Validación en tiempo real: alerta si la nota ingresada está fuera del rango (0–20).
Indicador de estado: celda verde (nota ingresada) / gris (pendiente).
Botón de cierre de calificaciones: una vez confirmado, el docente no puede modificar sin autorización del administrador.
Vista previa de la libreta: el docente puede visualizar cómo quedará la libreta antes de confirmar el cierre.

6.1.7. Libreta Digital y Descarga PDF
El alumno accede a la sección Libretas y selecciona el bimestre. El sistema muestra la libreta completa del alumno con todas las áreas, competencias, notas vigesimales y su equivalencia en escala literal. Un botón Descargar PDF genera el documento oficial listo para imprimir. La descarga queda bloqueada si existe deuda pendiente en el mes en curso.

Libreta organizada por áreas curriculares según el nivel (Primaria/Secundaria).
Conversión automática de nota vigesimal a escala literal: AD (18–20), A (14–17), B (11–13), C (00–10).
Generación de PDF con encabezado institucional, datos del alumno, grado, sección y firma del docente.
Historial de libretas por bimestre y año académico.

6.2. Vistas del Usuario Administrador 
Se realizan las siguientes acciones que estarán divididas en diferentes secciones accesibles a través del panel:
Sección Cuentas: crear cuentas de usuario para docentes, secretaría, para garantizar que solo personal autorizado acceda al sistema, haciéndolo de manera interna mostrando una única vez las credenciales.
Sección Bloqueo de Documentos: Implementación de una barrera lógica en la descarga de documentos oficiales (libretas de notas en PDF). El sistema condiciona el acceso a estos archivos a la inexistencia de deudas pendientes, actuando como un mecanismo de control preventivo que fomenta la puntualidad en los pagos.
Sección Asistencia Docente: Gestionar la asistencia de los docentes desde el sistema para controlar la puntualidad del personal.
Sección Horarios: Creación de horarios escolares con asignación de curso, rango de horas y docente, incorporando validaciones automáticas que impiden conflictos. El sistema evita que un docente sea asignado a más de un curso en el mismo horario y bloquea rangos de tiempo ya ocupados por un grado y sección, garantizando que no existan cruces ni superposición de clases.

6.3. Vista del Usuario Secretariado

El usuario de la secretaría podrá realizar las acciones de la tesorería
6.3.1. Gestión de Secretaria y Optimización de procesos SIAGIE
Este módulo automatiza el ciclo de vida administrativo del estudiante, desde su incorporación hasta la certificación oficial, garantizando la integridad de la data y la interoperabilidad con las plataformas del Estado.

Centralización de la Conciliación Bancaria (Validación de Vouchers): 
El sistema integra un flujo inteligente para la gestión de ingresos, permitiendo a la Secretaría auditar la recaudación sin necesidad de intermediarios financieros: 
Captura y Notificación: El apoderado registra el comprobante mediante captura fotográfica. El sistema alerta instantáneamente al panel de Secretaría para su verificación administrativa, permitiendo ver el voucher subido.

Actualización de Ledger en Tiempo Real: Al confirmar la validez del depósito, la secretaría cambia el estado de cuenta del alumno de Pendiente a «Pagado»

Gestión Automática de Cartera y Morosidad:
Aplicación algorítmica de moras y recargos basada en las políticas configuradas. El sistema genera reportes consolidados de deuda por unidad familiar, permitiendo a la Secretaría realizar una cobranza dirigida y eficiente basada en datos actualizados. 

 Interoperabilidad Dinámica con SIAGIE: Reduce drásticamente la carga operativa mediante la generación de archivos de carga masiva con la estructura oficial del MINEDU.
Motor de Conversión Escalar: El sistema ejecuta una transcodificación automática de calificaciones de la escala vigesimal (0-20) a la escala literal (AD, A, B, C), eliminando errores humanos en el reporte oficial.


Auditoría Previa a la Exportación: Interfaz de validación que detecta inconsistencias o vacíos de información antes de la generación del archivo final, asegurando envíos exitosos al portal ministerial.
