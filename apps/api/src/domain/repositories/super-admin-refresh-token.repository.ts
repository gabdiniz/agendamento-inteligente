// ─── Super Admin Refresh Token Repository ────────────────────────────────────
//
// Espelha IRefreshTokenRepository mas opera no schema `public` com
// a tabela super_admin_refresh_tokens.
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredSuperAdminRefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface ISuperAdminRefreshTokenRepository {
  create(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<StoredSuperAdminRefreshToken>

  findByTokenHash(tokenHash: string): Promise<StoredSuperAdminRefreshToken | null>

  revoke(id: string): Promise<void>

  revokeAllByUserId(userId: string): Promise<void>
}
