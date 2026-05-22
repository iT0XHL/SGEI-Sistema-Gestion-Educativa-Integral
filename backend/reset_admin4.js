const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const password = 'Admin1234';
  const hash = await bcrypt.hash(password, 12);
  
  console.log('Deleting old admin account...');
  
  // Delete the perfil first (due to FK constraint)
  await prisma.$executeRaw`DELETE FROM auth_schema.perfil_usuario WHERE credencial_id IN (SELECT id FROM auth_schema.credencial WHERE usuario_login = 'director@sgei.edu.pe')`;
  
  // Delete the credencial
  await prisma.$executeRaw`DELETE FROM auth_schema.credencial WHERE usuario_login = 'director@sgei.edu.pe'`;
  
  console.log('Creating new admin account...');
  
  // Insert new credencial  
  const credId = await prisma.$queryRaw`
    INSERT INTO auth_schema.credencial (usuario_login, password_hash)
    VALUES ('director@sgei.edu.pe', ${hash})
    RETURNING id
  `;
  
  const id = credId[0].id;
  console.log('Credencial created:', id);
  
  // Create perfil
  await prisma.$executeRaw`
    INSERT INTO auth_schema.perfil_usuario (credencial_id, rol, entidad_tipo, entidad_id)
    VALUES (${id}::uuid, 'Admin'::auth_schema.rol_usuario, 'admin', ${id}::uuid)
  `;
  
  console.log('✔ Admin account reset successfully');
  
  // Verify
  const cred = await prisma.credencial.findUnique({
    where: { usuario_login: 'director@sgei.edu.pe' },
  });
  
  if (cred) {
    const match = await bcrypt.compare(password, cred.password_hash);
    console.log('  password verification:', match ? '✓ passes' : '✗ fails');
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
