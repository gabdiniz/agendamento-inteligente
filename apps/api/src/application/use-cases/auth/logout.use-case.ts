import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'

// ─── Input ───────────────────────────────────────────────────────────────

export interface LogoutInput {
  refreshToken: string
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.hashService.hashToken(input.refreshToken)
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (storedToken && !storedToken.revokedAt) {
      await this.refreshTokenRepo.revoke(storedToken.id)
    }

    // Não lança erro se o token não existir — logout é idempotente
  }
}
