const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const password = 'Admin1234';
  const hash = await bcrypt.hash(password, 12);
  
  console.log('Generated hash:', hash);
  
  // Use raw SQL to update
  const result = await prisma.$executeRaw`
    UPDATE auth_schema.credencial 
    SET password_hash = ${hash}, intentos_fallidos = 0, bloqueado_hasta = NULL
    WHERE usuario_login = 'director@sgei.edu.pe'
  `;
  
  console.log('✔ Admin password reset successfully');
  console.log('  Rows updated:', result);
  
  // Verify by reading back
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
