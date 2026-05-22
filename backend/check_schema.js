const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  // Get the column information from information_schema
  const result = await prisma.$queryRaw`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'auth_schema' AND table_name = 'credencial'
    ORDER BY ordinal_position;
  `;
  
  console.log('Credencial table columns:');
  result.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable === 'YES'})`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
