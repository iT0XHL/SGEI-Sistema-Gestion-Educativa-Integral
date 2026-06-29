const revokedAt = new Map<string, number>();

export function revokeUserTokens(perfilId: string): void {
  revokedAt.set(perfilId, Date.now());
}

export function isTokenRevoked(perfilId: string, iat: number): boolean {
  const revoked = revokedAt.get(perfilId);
  return revoked !== undefined && iat * 1000 <= revoked;
}
