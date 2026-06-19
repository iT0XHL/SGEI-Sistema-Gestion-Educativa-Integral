// ============================================================================
//  prisma/reset-admin-password.ts — Utilidad de DESARROLLO.
//
//  Restablece la contraseña de una cuenta y la desbloquea (intentos fallidos /
//  bloqueado_hasta). Pensada para recuperar el acceso del admin en el entorno
//  local cuando no se conoce la contraseña o la cuenta quedó bloqueada.
//
//  Usa las MISMAS funciones de la app (hashPassword bcrypt 12 + withAuditContext
//  para que el trigger tg_audit_credencial registre el cambio correctamente),
//  así que todo ocurre dentro de Node — sin problemas de escape de shell.
//
//  Uso (dentro del contenedor del backend):
//    docker exec sgei-backend npx tsx /app/prisma/reset-admin-password.ts
//
//  Personalizable por variables de entorno:
//    RESET_LOGIN=otro@correo  RESET_PASSWORD=MiClave123  npx tsx ...
// ============================================================================
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { withAuditContext } from '@/lib/audit-context';

const LOGIN    = process.env.RESET_LOGIN    ?? 'director@sgei.edu.pe';
const PASSWORD = process.env.RESET_PASSWORD ?? 'demo1234';

async function main() {
  const cred = await prisma.credencial.findUnique({
    where:  { usuario_login: LOGIN },
    select: { id: true },
  });
  if (!cred) {
    console.error(`✗ No existe una credencial con usuario_login = "${LOGIN}".`);
    process.exit(1);
  }

  // El perfil es necesario para el contexto de auditoría (usuario_id NOT NULL).
  const perfil = await prisma.perfilUsuario.findFirst({
    where:  { credencial_id: cred.id },
    select: { id: true },
  });
  if (!perfil) {
    console.error(`✗ La credencial "${LOGIN}" no tiene un perfil asociado.`);
    process.exit(1);
  }

  const hash = await hashPassword(PASSWORD);

  await withAuditContext(perfil.id, (tx) =>
    tx.credencial.update({
      where: { id: cred.id },
      data:  { password_hash: hash, intentos_fallidos: 0, bloqueado_hasta: null },
    }),
  );

  console.log(`✓ Cuenta "${LOGIN}" restablecida y desbloqueada.`);
  console.log(`  Contraseña: ${PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('✗ Error:', e);
  process.exit(1);
});
