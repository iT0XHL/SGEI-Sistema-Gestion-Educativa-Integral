// ============================================================
//  lib/password.ts — Hashing y verificación de contraseñas.
//  bcryptjs con coste configurable (BCRYPT_SALT_ROUNDS, def. 12).
//  El hash se guarda en auth_schema.credencial.password_hash.
// ============================================================
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
