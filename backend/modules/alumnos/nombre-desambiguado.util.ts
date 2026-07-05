/**
 * Calcula un sufijo visual (últimos 4 dígitos del DNI) para alumnos que
 * comparten exactamente el mismo nombre y apellidos dentro de un mismo
 * listado. No persiste nada en BD — se calcula al vuelo por request,
 * ya que el nombre "real" (usado en actas/SIAGIE) no debe alterarse.
 */
export function desambiguarNombres<
  T extends { id: string; nombres: string; apellido_paterno: string; apellido_materno: string; dni: string },
>(alumnos: T[]): Map<string, string> {
  const grupos = new Map<string, T[]>();
  for (const a of alumnos) {
    const clave = `${a.nombres.trim().toLowerCase()} ${a.apellido_paterno.trim().toLowerCase()} ${a.apellido_materno.trim().toLowerCase()}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(a);
    else grupos.set(clave, [a]);
  }

  const sufijos = new Map<string, string>();
  for (const grupo of grupos.values()) {
    if (grupo.length > 1) {
      for (const a of grupo) sufijos.set(a.id, ` (DNI ${a.dni.slice(-4)})`);
    }
  }
  return sufijos;
}
