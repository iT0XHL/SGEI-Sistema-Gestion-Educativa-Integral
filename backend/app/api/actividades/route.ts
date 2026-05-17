// ============================================================
//  /api/actividades
//   GET  — lista actividades (Docente, Alumno, Admin)
//   POST — crea actividad
//          · application/json → sin adjunto o url_adjunto externa
//          · multipart/form-data → con adjunto subido a Storage
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, created, errorResponse } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateActividadSchema, ListActividadesQuery } from '@/modules/actividades/actividades.schema';
import { ActividadesService } from '@/modules/actividades/actividades.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user }) => {
  try {
    const q = parseQuery(req, ListActividadesQuery);
    const data = await ActividadesService.list(q, user);
    return ok(data, 'Actividades');
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withAuth(async (req, { user }) => {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('archivo') as File | null;
      if (!file || typeof file === 'string') {
        return errorResponse(new Error('Se requiere el campo "archivo" en el form-data'));
      }

      const MultipartSchema = z.object({
        curso_id: z.string().uuid(),
        seccion_id: z.string().uuid(),
        titulo: z.string().min(3).max(200),
        descripcion: z.string().max(5000).optional(),
        tipo: z.enum(['tarea', 'practica', 'evaluacion', 'proyecto']).optional(),
        fecha_limite: z.string().datetime(),
        puntaje_maximo: z.string().transform(Number),
      });

      const parsed = MultipartSchema.safeParse({
        curso_id: formData.get('curso_id'),
        seccion_id: formData.get('seccion_id'),
        titulo: formData.get('titulo'),
        descripcion: formData.get('descripcion') ?? undefined,
        tipo: formData.get('tipo') ?? undefined,
        fecha_limite: formData.get('fecha_limite'),
        puntaje_maximo: formData.get('puntaje_maximo'),
      });

      if (!parsed.success) return errorResponse(parsed.error);

      const data = await ActividadesService.createWithFile(parsed.data, file, user);
      return created(data, 'Actividad creada con adjunto');
    }

    const input = await parseBody(req, CreateActividadSchema);
    const data = await ActividadesService.create(input, user);
    return created(data, 'Actividad creada');
  } catch (error) {
    return errorResponse(error);
  }
});
