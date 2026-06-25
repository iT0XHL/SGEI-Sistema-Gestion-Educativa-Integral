// ============================================================
//  prisma/fix-names.ts — Rellena nombres faltantes en docentes
//  y alumnos extrayendo de usuario_login (email).
//  Ejecutar: npx ts-node prisma/fix-names.ts
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function extractNamesFromEmail(email: string): { nombres: string; apellidoPaterno: string; apellidoMaterno: string } {
  // Remover dominio (@sgei.edu.pe, @calasanz.edu.pe, etc)
  const namePart = email.split('@')[0] || '';

  // Dividir por puntos: "luis.santos" → ["luis", "santos"]
  const parts = namePart.split('.').filter(p => p.trim());

  if (parts.length === 0) {
    return { nombres: 'Usuario', apellidoPaterno: 'Registrado', apellidoMaterno: 'Sin Datos' };
  }

  if (parts.length === 1) {
    return { nombres: capitalize(parts[0]), apellidoPaterno: 'Sin', apellidoMaterno: 'Datos' };
  }

  if (parts.length === 2) {
    return { nombres: capitalize(parts[0]), apellidoPaterno: capitalize(parts[1]), apellidoMaterno: '' };
  }

  // 3+ partes: primero = nombre, resto = apellidos
  return {
    nombres: capitalize(parts[0]),
    apellidoPaterno: capitalize(parts[1]),
    apellidoMaterno: parts.slice(2).map(capitalize).join(' '),
  };
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function main() {
  console.log('🔧 Iniciando relleno de nombres faltantes...\n');

  // Procesar Docentes
  console.log('📚 Procesando docentes...');
  const docentesSinNombres = await prisma.docente.findMany({
    where: {
      OR: [
        { nombres: null },
        { nombres: '' },
        { apellido_paterno: null },
        { apellido_paterno: '' },
        { apellido_materno: null },
        { apellido_materno: '' },
      ],
    },
    select: {
      id: true,
      dni: true,
      perfil: { select: { credencial: { select: { usuario_login: true } } } },
    },
  });

  let docentesActualizados = 0;
  for (const docente of docentesSinNombres) {
    const email = docente.perfil?.credencial.usuario_login;
    if (!email) continue;

    const { nombres, apellidoPaterno, apellidoMaterno } = extractNamesFromEmail(email);

    await prisma.docente.update({
      where: { id: docente.id },
      data: {
        nombres: nombres || '',
        apellido_paterno: apellidoPaterno || '',
        apellido_materno: apellidoMaterno || '',
      },
    });
    docentesActualizados++;
    console.log(`  ✓ Docente ${email} → ${nombres} ${apellidoPaterno} ${apellidoMaterno}`);
  }
  console.log(`✅ ${docentesActualizados} docentes actualizados\n`);

  // Procesar Alumnos
  console.log('👨‍🎓 Procesando alumnos...');
  const alumnosSinNombres = await prisma.alumno.findMany({
    where: {
      OR: [
        { nombres: null },
        { nombres: '' },
        { apellido_paterno: null },
        { apellido_paterno: '' },
        { apellido_materno: null },
        { apellido_materno: '' },
      ],
    },
    select: {
      id: true,
      dni: true,
      perfil: { select: { credencial: { select: { usuario_login: true } } } },
    },
  });

  let alumnosActualizados = 0;
  for (const alumno of alumnosSinNombres) {
    const email = alumno.perfil?.credencial.usuario_login;
    if (!email) continue;

    const { nombres, apellidoPaterno, apellidoMaterno } = extractNamesFromEmail(email);

    await prisma.alumno.update({
      where: { id: alumno.id },
      data: {
        nombres: nombres || '',
        apellido_paterno: apellidoPaterno || '',
        apellido_materno: apellidoMaterno || '',
      },
    });
    alumnosActualizados++;
    console.log(`  ✓ Alumno ${email} → ${nombres} ${apellidoPaterno} ${apellidoMaterno}`);
  }
  console.log(`✅ ${alumnosActualizados} alumnos actualizados\n`);

  console.log('🎉 ¡Relleno de nombres completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
