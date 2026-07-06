#!/usr/bin/env bash
# ============================================================
#  test-modulos.sh — Prueba exhaustiva de la API SGEI por
#  módulo y por rol. Lee endpoints contra el backend vivo.
#  No es destructivo: solo GET + login/logout.
# ============================================================
BASE=http://localhost:3001/api
T=/tmp/sgei; mkdir -p "$T"
# Docente: gladys.tello (los docentes del seed original se eliminan en SQL/17)
declare -A EMAIL=( [Admin]=director@sgei.edu.pe [Secretaria]=secretaria@sgei.edu.pe [Docente]=gladys.tello@sgei.edu.pe [Alumno]=benjamin.cruz@sgei.edu.pe )
declare -A EID

login() {
  local role=$1
  local b=$(curl -s -c "$T/$role.cookie" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
     -d "{\"email\":\"${EMAIL[$role]}\",\"password\":\"demo1234\",\"rol\":\"$role\"}")
  echo "$b" > "$T/$role.login.json"
  local ok=$(echo "$b" | grep -o '"success":true')
  EID[$role]=$(echo "$b" | grep -oE '"entidadId":"[^"]+"' | head -1 | sed 's/.*:"//;s/"$//')
  printf "LOGIN %-11s -> %s  entidadId=%s\n" "$role" "${ok:+OK}${ok:-FAIL}" "${EID[$role]}"
}

# hit ROLE METHOD PATH
hit() {
  local role=$1 method=$2 path=$3
  local code=$(curl -s -o "$T/resp.json" -w "%{http_code}" -b "$T/$role.cookie" -X "$method" "$BASE$path")
  local succ=$(grep -o '"success":true' "$T/resp.json" | head -1)
  local ecode=$(grep -oE '"code":"[^"]+"' "$T/resp.json" | head -1 | sed 's/.*:"//;s/"$//')
  local n=$(grep -oE '"id":"' "$T/resp.json" | wc -l | tr -d ' ')
  printf "  %-11s %-5s %-46s %s %-4s %s n=%s\n" "$role" "$method" "$path" "$code" "${succ:+ok}${succ:-..}" "$ecode" "$n"
}

echo "############ 1. AUTH / SESIÓN ############"
for r in Admin Secretaria Docente Alumno; do login "$r"; done
echo "--- /me por rol ---"
for r in Admin Secretaria Docente Alumno; do hit "$r" GET /auth/me; done

echo; echo "############ 2. RBAC (negativos esperados 403) ############"
hit Alumno  GET /usuarios          # 403
hit Docente GET /alumnos           # 403
hit Alumno  GET /admin/estadisticas# 403
hit Docente GET /asistencias          # 403 (asistencia docente: solo Admin)
hit Secretaria GET /asistencias       # 403 (asistencia docente: solo Admin)
hit Alumno  GET /secretaria/resumen   # 403

echo; echo "############ 3. ESTRUCTURA ACADÉMICA (todos los roles) ############"
for p in /institucion /periodos /bimestres /niveles /grados /secciones /cursos /competencias /escala-calificaciones /asignaciones /horarios; do
  for r in Admin Secretaria Docente Alumno; do hit "$r" GET "$p"; done
done

echo; echo "############ 4. GESTIÓN (Admin / Secretaria) ############"
for p in /usuarios /alumnos /docentes /admin/estadisticas; do
  for r in Admin Secretaria; do hit "$r" GET "$p"; done
done

echo; echo "############ 5. SECRETARÍA / PAGOS ############"
for p in /secretaria/resumen /secretaria/pagos /secretaria/vouchers/recientes /pagos /pagos/conceptos /boletas; do
  for r in Admin Secretaria; do hit "$r" GET "$p"; done
done
echo "--- pagos/boletas como Alumno (su propio estado) ---"
hit Alumno GET /pagos
hit Alumno GET /boletas

echo; echo "############ 6. ASISTENCIAS ############"
# Obtener una sección real para las pruebas de asistencia de alumnos.
SECCION_ID=$(curl -s -b "$T/Admin.cookie" "$BASE/secciones" | grep -oE '"id":"[^"]+"' | head -1 | sed 's/.*:"//;s/"$//')
echo "SECCION_ID=$SECCION_ID"
echo "--- asistencia docente (solo Admin) ---"
hit Admin      GET /asistencias                # ok
hit Secretaria GET /asistencias                # 403
hit Docente    GET /asistencias                # 403
echo "--- asistencia alumnos ---"
hit Docente    GET "/asistencias/alumnos?seccionId=$SECCION_ID"  # ok (su sección)
hit Admin      GET "/asistencias/alumnos?seccionId=$SECCION_ID"  # ok (cualquier sección)
hit Alumno     GET /asistencias/alumnos         # ok (solo su propia asistencia)
hit Alumno     GET "/asistencias/resumen?seccionId=$SECCION_ID"  # 403 (alumno no ve resumen)
hit Docente    GET "/asistencias/resumen?seccionId=$SECCION_ID"  # ok/403 según asignación
hit Admin      GET "/asistencias/resumen?seccionId=$SECCION_ID"  # ok

echo; echo "############ 7. NOTIFICACIONES ############"
for r in Admin Secretaria Docente Alumno; do hit "$r" GET /notificaciones; done
for r in Admin Secretaria Docente Alumno; do hit "$r" GET /notificaciones/contar; done

echo; echo "############ 8. SIAGIE / SITUACIÓN FINAL ############"
hit Admin GET /siagie
hit Admin GET /siagie/validar
hit Admin GET /situacion-final
hit Secretaria GET /siagie

echo; echo "DONE. entidadId Docente=${EID[Docente]} Alumno=${EID[Alumno]}"
