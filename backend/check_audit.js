const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  const audits = await prisma.$queryRaw`
    SELECT tipo, modulo, fecha_hora, entidad_id 
    FROM audit_schema.sesion_auditoria
    WHERE modulo = 'auth'
    ORDER BY fecha_hora DESC
    LIMIT 10;
  `;
  
  console.log('Recent auth audit logs:');
  audits.forEach(a => {
    console.log(`  ${a.tipo} at ${a.fecha_hora}`);
  });
  
  const cred = await prisma.credencial.findUnique({
    where: { usuario_login: 'director@sgei.edu.pe' },
    select: { intentos_fallidos: true, bloqueado_hasta: true }
  });
  
  console.log('\nAdmin credential status:');
  console.log('  intentos_fallidos:', cred.intentos_fallidos);
  console.log('  bloqueado_hasta:', cred.bloqueado_hasta);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
