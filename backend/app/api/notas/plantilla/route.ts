// ============================================================
//  GET /api/notas/plantilla?asignacionId&bimestreId
//   Descarga la plantilla Excel de ingreso de notas de una asignación
//   (docente+curso+sección) para un bimestre — generada en vivo desde
//   los alumnos activos y competencias vigentes.       (Docente/Admin)
// ============================================================
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseQuery } from '@/lib/request';
import { errorResponse } from '@/lib/response';
import { PlantillaQuery } from '@/modules/notas/nota.schema';
import { NotasPlantillaService } from '@/modules/notas/notas-plantilla.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user }) => {
  try {
    const { asignacionId, bimestreId } = parseQuery(req, PlantillaQuery);
    const { buffer, filename } = await NotasPlantillaService.generar(asignacionId, bimestreId, user);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
