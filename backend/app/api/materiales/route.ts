// ============================================================
//  /api/materiales
//   GET  — lista materiales con filtros (Docente, Alumno, Admin)
//   POST — crear material
//          · Content-Type: application/json → URL externa (enlace/video)
//          · Content-Type: multipart/form-data → archivo (PDF/imagen/otro)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, created, errorResponse } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateMaterialSchema, ListMaterialesQuery } from '@/modules/materiales/materiales.schema';
import { MaterialesService } from '@/modules/materiales/materiales.service';
import { TIPOS_CON_ARCHIVO } from '@/modules/materiales/materiales.types';
import { z } from 'zod';
import type { TipoMaterial } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user }) => {
  try {
    const q = parseQuery(req, ListMaterialesQuery);
    const data = await MaterialesService.list(q, user);
    return ok(data, 'Materiales');
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withAuth(async (req, { user }) => {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      // Subida de archivo.
      const formData = await req.formData();
      const file = formData.get('archivo') as File | null;
      if (!file || typeof file === 'string') {
        return errorResponse(
          new Error('Se requiere el campo "archivo" en el form-data'),
        );
      }

      const FileUploadSchema = z.object({
        curso_id: z.string().uuid(),
        seccion_id: z.string().uuid(),
        titulo: z.string().min(3).max(200),
        descripcion: z.string().max(2000).optional(),
        tipo: z.enum(['PDF', 'imagen', 'otro']),
        visible: z
          .string()
          .optional()
          .transform((v) => v !== 'false'),
      });

      const raw = {
        curso_id: formData.get('curso_id'),
        seccion_id: formData.get('seccion_id'),
        titulo: formData.get('titulo'),
        descripcion: formData.get('descripcion') ?? undefined,
        tipo: formData.get('tipo'),
        visible: formData.get('visible') ?? 'true',
      };

      const parsed = FileUploadSchema.safeParse(raw);
      if (!parsed.success) {
        return errorResponse(parsed.error);
      }

      const data = await MaterialesService.createFromFile(parsed.data, file, user);
      return created(data, 'Material subido');
    }

    // JSON con URL externa.
    const input = await parseBody(req, CreateMaterialSchema);

    // Verificar que tipos de archivo no vengan con URL externa.
    if (TIPOS_CON_ARCHIVO.includes(input.tipo as TipoMaterial)) {
      return errorResponse(
        Object.assign(new Error('Para tipos PDF/imagen/otro usa multipart/form-data para subir el archivo.'), {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        }),
      );
    }

    const data = await MaterialesService.createFromUrl(input, user);
    return created(data, 'Material creado');
  } catch (error) {
    return errorResponse(error);
  }
});
