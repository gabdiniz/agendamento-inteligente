// ─── Refresh Token Repository Interface ───────────────────────────────────
//
// Abstração do repositório de refresh tokens (tenant-scoped).
// Tokens são armazenados com hash SHA-256 para segurança.
// ─────────────────────────────────────────────────────────────────────────

export interface StoredRefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface IRefreshTokenRepository {
  create(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<StoredRefreshToken>

  findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null>

  revoke(id: string): Promise<void>

  revokeAllByUserId(userId: string): Promise<void>
}
