const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const password = 'Admin1234';
  const hash = await bcrypt.hash(password, 12);
  
  console.log('Generated hash:', hash);
  
  const cred = await prisma.credencial.update({
    where: { usuario_login: 'director@sgei.edu.pe' },
    data: { 
      password_hash: hash,
      intentos_fallidos: 0,
      bloqueado_hasta: null
    },
  });
  
  console.log('✔ Admin password reset successfully');
  console.log('  usuario_login:', cred.usuario_login);
  console.log('  intentos_fallidos:', cred.intentos_fallidos);
  
  // Verify
  const match = await bcrypt.compare(password, cred.password_hash);
  console.log('  password verification:', match ? '✓ passes' : '✗ fails');
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
