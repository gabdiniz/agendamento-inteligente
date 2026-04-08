// ─── Hash Service Interface ────────────────────────────────────────────────
//
// Abstração para hashing de senhas (bcrypt) e tokens (SHA-256).
// ─────────────────────────────────────────────────────────────────────────

export interface IHashService {
  /** Hash de senha com bcrypt (para armazenamento seguro) */
  hashPassword(password: string): Promise<string>

  /** Compara senha com hash bcrypt */
  comparePassword(password: string, hash: string): Promise<boolean>

  /** Hash SHA-256 do refresh token (para lookup rápido no DB) */
  hashToken(token: string): string
}
