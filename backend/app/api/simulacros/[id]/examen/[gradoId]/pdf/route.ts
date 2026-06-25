// ============================================================
//  GET /api/simulacros/:id/examen/:gradoId/pdf?tipo=cuestionario|balotario
//   Genera el PDF del examen de un grado (Admin).
// ============================================================
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';
import { buildCuestionarioPdf, buildBalotarioPdf } from '@/pdf/simulacro.builder';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req, { params }) => {
  const tipo = new URL(req.url).searchParams.get('tipo') === 'balotario' ? 'balotario' : 'cuestionario';

  const data = await SimulacroService.getExamenPdfData(params.id, params.gradoId);
  const pdf = tipo === 'balotario' ? await buildBalotarioPdf(data) : await buildCuestionarioPdf(data);

  const slug = `${tipo}_${data.grado}`.replace(/[^\w.-]+/g, '_');
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${slug}.pdf"`,
      'Content-Length': String(pdf.length),
    },
  });
});
