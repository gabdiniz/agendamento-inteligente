// ─── Patient Refresh Token Repository Interface ───────────────────────────
//
// Análogo ao IRefreshTokenRepository mas para pacientes.
// Tokens são armazenados com hash SHA-256 para segurança.
// ─────────────────────────────────────────────────────────────────────────

export interface StoredPatientRefreshToken {
  id: string
  patientId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface IPatientRefreshTokenRepository {
  create(data: {
    patientId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<StoredPatientRefreshToken>

  findByTokenHash(tokenHash: string): Promise<StoredPatientRefreshToken | null>

  revoke(id: string): Promise<void>

  revokeAllByPatientId(patientId: string): Promise<void>
}
