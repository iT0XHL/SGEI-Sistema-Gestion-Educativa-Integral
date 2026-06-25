// ============================================================
//  GET /api/simulacros/activo/carga — Carga del docente (Docente).
//  Árbol Nivel▸Grado▸Sección▸Curso de sus asignaciones del período activo
//  + el simulacro activo (o null) para los dropdowns en cascada.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Docente'], async (_req, { user }) => {
  const data = await SimulacroService.getCargaDocente(user.entidadId);
  return ok(data, 'Carga del docente');
});
