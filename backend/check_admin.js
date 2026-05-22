const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const cred = await prisma.credencial.findUnique({
    where: { usuario_login: 'director@sgei.edu.pe' },
  });
  
  if (!cred) {
    console.log('Account not found');
    process.exit(1);
  }
  
  console.log('Account found:');
  console.log('  usuario_login:', cred.usuario_login);
  console.log('  password_hash:', cred.password_hash.substring(0, 30) + '...');
  
  // Try to verify the password
  const match = await bcrypt.compare('Admin1234', cred.password_hash);
  console.log('  password "Admin1234" matches:', match);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
