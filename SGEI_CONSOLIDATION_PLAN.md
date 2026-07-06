# SGEI — Plan de Consolidación de Base de Datos y Código

## Objetivo
Unificar los scripts SQL, corregir inconsistencias en horarios/cursos/docentes/tutores/simulacros, y dejar la BD 100% consistente para que cualquier persona clone el repo, ejecute `docker compose up -d` y obtenga un sistema funcional desde cero. **Tolerancia cero a fallos** — el colega clonará y probará antes del despliegue.

---

## Fase 1 — Análisis exhaustivo (scripts del colega vs. SQL/ actual)

1. Recibir carpeta con scripts del colega
2. Inventariar AMBAS carpetas (colega vs. actual) comparando cada archivo:
   - **Esquemas/DDL**: ¿misma estructura de tablas? ¿columnas faltantes o extras?
   - **Funciones/Triggers/Vistas**: ¿las mismas? ¿falta alguna?
   - **Datos de horarios**: docentes por área, cursos por nivel, asignaciones, horario_descanso, horario_completo
   - **Datos de personas**: alumnos, docentes, admin, secretarias — ¿mismos UUIDs? ¿mismos DNIs?
   - **Tutores**: ¿existen registros de tutoría? ¿cursos de tutoría?
   - **Simulacros**: ¿banco de preguntas (`simulacro_banco`)? ¿simulacros activos? ¿preguntas creadas? ¿relaciones simulacro-pregunta?
   - **Cursos por nivel**: ¿secundaria tiene todos los cursos? ¿primaria?
   - **Competencias**: ¿cursos tienen sus competencias asociadas? ¿pesos correctos?
   - **Configuraciones**: periodos, bimestres, niveles, grados, secciones
3. Identificar:
   - Data que existe en colega y falta en actual
   - Data que existe en actual y falta en colega
   - Conflictos (mismos registros con valores distintos)
   - Scripts que se sobreescriben o neutralizan entre sí
   - Dependencias rotas (FKs que apuntan a IDs inexistentes)

## Fase 2 — Consolidación de `SQL/`

Cada script se evalúa individualmente:

**Tipo A — Estructurales (se conservan, se renombran sin números):**
| Actual | Final | Contenido |
|--------|-------|-----------|
| `00-setup.sql` | `setup.sql` | Esquemas + roles + dominios ENUM |
| `sgei_ddl_v2.1_auditado (1).sql` | `ddl.sql` | DDL completo: tablas, FKs, vistas, funciones, triggers |
| `01_notificaciones_eventos.sql` | `notificaciones.sql` | Funciones/triggers de notificaciones |
| `03-libretas-migration.sql` | `libretas.sql` | Vistas + funciones de libretas |
| `04-fix-audit-trigger.sql` | `auditoria.sql` | Trigger de auditoría sobre credencial |
| `05-simulacro-banco.sql` | `simulacro_banco.sql` | Banco de preguntas + tablas de simulacro |
| `26-debe-cambiar-password.sql` | `migracion_password.sql` | Columna debe_cambiar_password |
| `27-indices-compuestos.sql` | `indices.sql` | Índices compuestos faltantes |

**Tipo B — Datos (se fusionan en `seed.sql`):**
- `02-seed.sql` — data inicial (cuentas demo, IE, periodos)
- `06-grados-niveles.sql` → `25-limpieza-cursos-genericos.sql`
- Todos los scripts de inserción de horarios, docentes, alumnos, cursos, competencias, asignaciones, tutores, simulacros
- Se consolidan en `seed.sql` con orden lógico: IE → periodos → niveles → grados → secciones → cursos → competencias → alumnos → docentes → asignaciones → horarios → tutores → simulacros → notas demo → pagos demo

**Tipo C — Se eliminan solo si su contenido está íntegramente cubierto en seed.sql:**
- Los ~20 scripts de datos originales, UNO POR UNO, verificando que no tengan lógica estructural mezclada

## Fase 3 — Correcciones de código

4. **SIAGIE builder** (`backend/excel/siagie.builder.ts`):
   - Verificar cursos dinámicos por grado/sección (ya reescrito)
   - Probar exportación con datos reales de primaria y secundaria
5. **Libreta builder** (`backend/word/libreta.docx.builder.ts`):
   - Verificar cursos y competencias correctos por grado
   - Probar generación para alumno de primaria y secundaria
6. **Horarios**:
   - Verificar `GET /api/horarios` para alumno, docente
   - Confirmar que horarios cargados desde seed se reflejan correctamente
7. **Simulacros**:
   - Verificar `GET /api/simulacro/preguntas` y endpoints relacionados
   - Confirmar que banco de preguntas y simulacros activos funcionan

## Fase 4 — Pruebas integrales (desde cero)

8. `docker compose down -v` (eliminar BD + volumen)
9. `docker compose up -d` (ejecutar scripts consolidados)
10. Verificar logs del contenedor db (scripts ejecutados sin error)
11. Pruebas:
    - Login de cada rol (Admin, Secretaria, Docente, Alumno) con `demo1234`
    - Dashboard de cada portal carga sin errores
    - Horarios visibles para alumno y docente
    - Cursos por nivel/grado correctos
    - Tutores asignados
    - Simulacros: banco de preguntas visible, simulacro activo
    - Registro de notas (docente)
    - Generación de libretas (secretaría)
    - Exportación SIAGIE (.xlsx)
    - Flujo de pagos completo
12. Cualquier error → corregir seed o código y repetir desde paso 8

## Fase 5 — Entrega

13. Backend build exitoso (`npm run build`)
14. Frontend build exitoso (`pnpm build`)
15. Commit final con `SQL/` limpio + `docker-compose.yml` actualizado
16. El colega clona el repo, corre `docker compose up -d`, verifica

---

## Archivos finales en `SQL/`

```
setup.sql                  (esquemas + roles + ENUMs)
ddl.sql                    (tablas + FKs + vistas + funciones + triggers)
notificaciones.sql         (funciones/triggers de notificaciones)
libretas.sql               (vistas + funciones de libretas)
auditoria.sql              (trigger de auditoría sobre credencial)
simulacro_banco.sql        (banco de preguntas + tablas de simulacro)
seed.sql                   (TODOS los datos: IE, periodos, niveles, grados,
                            secciones, cursos, competencias, alumnos, docentes,
                            asignaciones, horarios, tutores, simulacros,
                            notas demo, pagos demo)
migracion_password.sql     (columna debe_cambiar_password)
indices.sql                (índices compuestos)
```

En `docker-compose.yml` los source files se mapean con prefijo numérico en el contenedor para orden de ejecución. El repositorio queda limpio, sin números en los nombres.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Perder data estructural al fusionar seeds | Revisar script por script; separar Tipo A (estructura) de Tipo B (datos) |
| UUIDs distintos entre scripts | Usar las UUIDs fijas del DDL actual como fuente de verdad |
| ON CONFLICT DO NOTHING ocultando errores | Reemplazar por inserts directos sin cláusulas de salto silencioso |
| Seed enorme difícil de debuggear | Separar con comentarios y bloques lógicos claros |
| Romper algo que sí funciona | No tocar backend/frontend sin probar; pruebas desde cero obligatorias |

## Tiempo estimado

2h - 3h (análisis + consolidación + pruebas). Sin apuros — mejor una hora más que un error en producción.
