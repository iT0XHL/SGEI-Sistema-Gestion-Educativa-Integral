# Usuarios de prueba (Seed)

El archivo [`SQL/02-seed.sql`](../SQL/02-seed.sql) inserta **4 perfiles base + 7 docentes + 12 alumnos** junto con la estructura académica completa (periodos, cursos, competencias, notas, pagos).

---

## Credenciales

### Administrador y Secretaría

| Rol          | Email                          | Contraseña |
|--------------|--------------------------------|------------|
| Admin        | `director@sgei.edu.pe`         | `demo1234` |
| Secretaria   | `secretaria@sgei.edu.pe`       | `demo1234` |

### Docentes (7 usuarios)

| Nombre                 | Email                          | Contraseña | Especialidad         |
|------------------------|--------------------------------|------------|----------------------|
| Ana García Vega        | `ana.garcia@sgei.edu.pe`       | `demo1234` | Matemática           |
| José Ramos Ccopa       | `jose.ramos@sgei.edu.pe`       | `demo1234` | Comunicación         |
| María Lupaca Ferro     | `maria.lupaca@sgei.edu.pe`     | `demo1234` | Ciencias Sociales    |
| Luis Quispe Apaza      | `luis.quispe@sgei.edu.pe`      | `demo1234` | C. y Tecnología      |
| Sandra Flores Lima     | `sandra.flores@sgei.edu.pe`    | `demo1234` | Inglés               |
| Marco Benítez Soto     | `marco.benitez@sgei.edu.pe`    | `demo1234` | Ed. Física           |
| Carmen Huanca Rios     | `carmen.huanca@sgei.edu.pe`    | `demo1234` | Arte y Cultura       |

### Alumnos (12 usuarios - TODOS con credencial)

| Nombre                   | Email                              | DNI      | Grado | Sección |
|--------------------------|-----------------------------------|----------|-------|---------|
| Carlos Mendoza Ramos     | carlos.mendoza@sgei.edu.pe        | 87654321 | 3°    | A       |
| Adriana Castillo Puma    | adriana.castillo@sgei.edu.pe      | 87654322 | 3°    | A       |
| Benjamín Cruz Torres     | benjamin.cruz@sgei.edu.pe         | 87654323 | 3°    | A       |
| Diana Flores Ccari       | diana.flores@sgei.edu.pe          | 87654324 | 3°    | A       |
| Eduardo Quispe Lima      | eduardo.quispe@sgei.edu.pe        | 87654325 | 3°    | A       |
| Fernanda Mamani Condori  | fernanda.mamani@sgei.edu.pe       | 87654326 | 3°    | A       |
| Gabriel Herrera Apaza    | gabriel.herrera@sgei.edu.pe       | 87654327 | 3°    | A       |
| Hilda Lazo Vilca         | hilda.lazo@sgei.edu.pe            | 87654328 | 3°    | A       |
| Iván Paredes Salas       | ivan.paredes@sgei.edu.pe          | 87654329 | 3°    | A       |
| Juliana Ramos Pacori     | juliana.ramos@sgei.edu.pe         | 87654330 | 3°    | A       |
| Kevin Salinas Huanca     | kevin.salinas@sgei.edu.pe         | 87654331 | 3°    | A       |
| Luciana Vargas Cano      | luciana.vargas@sgei.edu.pe        | 87654332 | 3°    | A       |

> **Todos tienen contraseña:** `demo1234`

---

## Estructura Académica Completa

### Niveles y Grados

| Nivel       | Grado            | Orden |
|-------------|------------------|-------|
| Secundaria  | 3° Secundaria    | 3     |

### Período Académico

| Año  | Nombre                 | Fecha Inicio | Fecha Fin  | Estado  |
|------|------------------------|--------------|------------|---------|
| 2025 | Año Lectivo 2025       | 2025-03-01   | 2025-12-15 | Activo  |

### Sección

| Grado       | Nombre | Turno | Cupo | Docente Tutor     |
|-------------|--------|-------|------|-------------------|
| 3° Secundaria | A   | Mañana| 30   | Ana García Vega   |

---

## Cursos y Competencias

Se insertan **8 cursos** con **4 competencias** para Matemática (muestra para pruebas):

| ID | Curso                      | Código | Horas | Docente           |
|----|----------------------------|--------|-------|-------------------|
| 1  | Matemática                 | C01    | 5     | Ana García        |
| 2  | Comunicación               | C02    | 5     | José Ramos        |
| 3  | Ciencias Sociales          | C03    | 4     | María Lupaca      |
| 4  | Ciencia y Tecnología       | C04    | 5     | Luis Quispe       |
| 5  | Inglés                     | C05    | 3     | Sandra Flores     |
| 6  | Ed. Física                 | C06    | 2     | Marco Benítez     |
| 7  | Arte y Cultura             | C07    | 2     | Carmen Huanca     |
| 8  | Ed. para el Trabajo        | C08    | 3     | Ana García (2da)  |

**Competencias (ejemplo Matemática):**
1. Resuelve problemas de cantidad
2. Resuelve problemas de regularidad, equivalencia y cambio
3. Resuelve problemas de gestión de datos
4. Resuelve problemas de forma, movimiento y localización

---

## Bimestres

| Número | Nombre        | Fecha Inicio | Fecha Fin  | Cerrado |
|--------|---------------|--------------|------------|---------|
| 1      | I Bimestre    | 2025-03-01   | 2025-05-31 | No      |
| 2      | II Bimestre   | 2025-06-01   | 2025-08-31 | No      |

---

## Notas Registradas

Se insertan **24 notas** (2 competencias × 12 alumnos) para el I Bimestre en Matemática:

- **Escala vigesimal:** 0–20
- **Literal mapping:**
  - **AD:** 18–20 (Excelente)
  - **A:** 14–17.99 (Bueno)
  - **B:** 11–13.99 (Satisfactorio)
  - **C:** 0–10.99 (Necesita mejora)

**Ejemplos:**
- Carlos Mendoza: 16, 15 → Promedio 15.5 (A)
- Eduardo Quispe: 20, 19 → Promedio 19.5 (AD — estudiante destacado)
- Gabriel Herrera: 10, 11 → Promedio 10.5 (C — necesita apoyo)

---

## Concepto de Pago y Pagos Mensuales

### Concepto

- **Pensión Mensual:** S/. 350.00

### Pagos (Carlos Mendoza)

| Mes        | Estado     | Vencimiento | Fecha Pago |
|------------|------------|-------------|------------|
| Enero      | Pagado     | 2025-01-31  | 2025-01-05 |
| Febrero    | Pagado     | 2025-02-28  | 2025-02-03 |
| Marzo      | Pagado     | 2025-03-31  | 2025-03-07 |
| Abril      | Pagado     | 2025-04-30  | 2025-04-04 |
| Mayo–Dic   | Pendiente  | Respectiva  | —          |

### Pagos (Otros Alumnos)

Se insertan pagos adicionales con estado variado:
- **Adriana Castillo:** 3 pagados, 1 pendiente
- **Eduardo Quispe:** 4 pagados (alumno cumplidor)
- **Fernanda Mamani:** 2 pendientes (alumno con atraso)

---

## Cómo aplicar el seed

### Opción 1 — Fresh start (recomendado)

Borra los contenedores y el volumen de la BD, luego levanta todo:

```bash
docker rm -f sgei-db sgei-backend sgei-frontend
docker compose down -v
docker compose up --build
```

El seed se ejecuta automáticamente junto al DDL al crearse la base de datos nueva.

### Opción 2 — Sobre una BD ya existente

Si la BD ya existe pero quieres agregar los usuarios de prueba sin resetear:

```bash
docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/02-seed.sql
```

El script usa `ON CONFLICT DO NOTHING` en todos los `INSERT`, por lo que es **idempotente** (se puede ejecutar múltiples veces sin error).

---

## Resumen de datos insertados

| Entidad                | Cantidad | Notas                              |
|------------------------|----------|-----------------------------------|
| **Credenciales**       | 10       | Admin + Sec + 7 Doc + 1 Alu       |
| **Perfiles**           | 10       | Los 4 roles base están presentes  |
| **Docentes**           | 7        | Con especialidades variadas       |
| **Alumnos**            | 12       | En 3° A con datos personales      |
| **Cursos**             | 8        | Cobertura completa del currículo  |
| **Competencias**       | 4        | Para Matemática (extensible)      |
| **Bimestres**          | 2        | I y II (2025)                    |
| **Notas**              | 24       | I Bimestre (12 alumnos × 2 comp)  |
| **Pagos**              | ~22      | Mensual + variedad de estados     |
| **Escala Literal**     | 4        | AD/A/B/C mapeada a vigesimal      |

---

## IDs fijos (para Postman y testing)

Todos los registros usan UUIDs predecibles organizados por "series":

| Serie | Rango                                  | Entidad              |
|-------|----------------------------------------|----------------------|
| 0001  | `...0001-000000000001` a `...0001-000000000010` | Credenciales    |
| 0002  | `...0002-000000000001` a `...0002-000000000010` | Perfiles        |
| 0003  | `...0003-000000000001` a `...0003-000000000007` | Docentes        |
| 0003  | `...0003-100000000001` a `...0003-100000000012` | Alumnos         |
| 0004  | `...0004-000000000001` a `...0004-000000000004` | Estructura acad.|
| 0005  | `...0005-000000000001` a `...0005-000000000008` | Cursos          |
| 0006  | `...0006-000000000001` a `...0006-000000000004` | Competencias    |
| 0007  | `...0007-000000000001` a `...0007-000000000002` | Bimestres       |
| 0008  | `...0008-000000000001`                         | Conceptos pago  |
| 0009  | `...0009-000000000001` a `...0009-000000000008` | Asignaciones    |

---

## Notas técnicas

- El hash de contraseña se genera con `pgcrypto`: `crypt('demo1234', gen_salt('bf', 12))` → formato `$2a$12$...`, compatible con `bcryptjs`.
- El login del alumno valida que el **rol seleccionado en el formulario coincida** con el rol del perfil en la BD.
- **Alumnos sin credencial:** Los alumnos 2–12 no tienen `credencial_id` en el seed; los gestiona Admin/Secretaría.
- Todas las inserciones son **idempotentes** (`ON CONFLICT DO NOTHING`), así que el script es reutilizable.
- Los pagos están mapeados a estados ENUM reales: `Pendiente`, `Pagado`, `Rechazado`, `En_Revision`.

