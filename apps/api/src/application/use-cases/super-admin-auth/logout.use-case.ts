import type { ISuperAdminRefreshTokenRepository } from '../../../domain/repositories/super-admin-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'

// ─── Super Admin Logout ─────────────────────────────────────────────────────
//
// Revoga o refresh token. Operação idempotente — não lança erro se o
// token não existir ou já estiver revogado.
// ─────────────────────────────────────────────────────────────────────────────

interface LogoutInput {
  refreshToken: string
}

export class SuperAdminLogoutUseCase {
  constructor(
    private readonly refreshTokenRepo: ISuperAdminRefreshTokenRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.hashService.hashToken(input.refreshToken)
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (storedToken && !storedToken.revokedAt) {
      await this.refreshTokenRepo.revoke(storedToken.id)
    }
    // Se não encontrou ou já revogado: operação idempotente, sem erro
  }
}
