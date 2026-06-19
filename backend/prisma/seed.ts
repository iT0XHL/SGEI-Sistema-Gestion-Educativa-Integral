// ============================================================
//  prisma/seed.ts — Datos mínimos para probar la API en local.
//  Crea una cuenta Admin inicial. Idempotente: no duplica.
//  Ejecutar:  npm run db:seed
// ============================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const ADMIN_LOGIN = 'director@sgei.edu.pe';
  const ADMIN_PASSWORD = 'demo1234';

  const existing = await prisma.credencial.findUnique({
    where: { usuario_login: ADMIN_LOGIN },
  });
  if (existing) {
    console.log(`✔ La cuenta Admin ya existe: ${ADMIN_LOGIN}`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const cred = await prisma.credencial.create({
    data: { usuario_login: ADMIN_LOGIN, password_hash: passwordHash },
  });
  await prisma.perfilUsuario.create({
    data: {
      credencial_id: cred.id,
      rol: 'Admin',
      entidad_tipo: 'admin',
      entidad_id: cred.id, // Admin sin tabla de entidad: placeholder estable.
    },
  });

  console.log('✔ Cuenta Admin creada para pruebas:');
  console.log(`   usuario:    ${ADMIN_LOGIN}`);
  console.log(`   contraseña: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Error en el seed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
