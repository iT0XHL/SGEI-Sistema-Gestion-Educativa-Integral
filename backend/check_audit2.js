const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  const cred = await prisma.credencial.findUnique({
    where: { usuario_login: 'director@sgei.edu.pe' },
    select: { intentos_fallidos: true, bloqueado_hasta: true, id: true }
  });
  
  console.log('Admin credential status:');
  console.log('  id:', cred.id);
  console.log('  intentos_fallidos:', cred.intentos_fallidos);
  console.log('  bloqueado_hasta:', cred.bloqueado_hasta);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
