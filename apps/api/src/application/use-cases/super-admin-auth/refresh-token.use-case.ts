import type { ISuperAdminRepository } from '../../../domain/repositories/super-admin.repository.js'
import type { ISuperAdminRefreshTokenRepository } from '../../../domain/repositories/super-admin-refresh-token.repository.js'
import type { ITokenService } from '../../../domain/services/token.service.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import { UnauthorizedError } from '../../../domain/errors/app-error.js'

// ─── Super Admin Refresh Token ──────────────────────────────────────────────
//
// Token rotation com detecção de roubo. Mesma lógica do tenant auth.
// Se um token já revogado for reutilizado, TODAS as sessões do admin
// são revogadas imediatamente.
// ─────────────────────────────────────────────────────────────────────────────

interface RefreshInput {
  refreshToken: string
}

interface RefreshOutput {
  accessToken: string
  refreshToken: string
}

export class SuperAdminRefreshTokenUseCase {
  constructor(
    private readonly superAdminRepo: ISuperAdminRepository,
    private readonly refreshTokenRepo: ISuperAdminRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshInput): Promise<RefreshOutput> {
    // 1. Busca o refresh token pelo hash
    const tokenHash = this.hashService.hashToken(input.refreshToken)
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token inválido')
    }

    // 2. Detecção de roubo: se já revogado, alguém roubou o token
    if (storedToken.revokedAt) {
      // Revoga TODAS as sessões do admin por segurança
      await this.refreshTokenRepo.revokeAllByUserId(storedToken.userId)
      throw new UnauthorizedError('Refresh token já utilizado — todas as sessões foram revogadas')
    }

    // 3. Verifica expiração
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expirado')
    }

    // 4. Verifica se o admin ainda está ativo
    const admin = await this.superAdminRepo.findById(storedToken.userId)
    if (!admin || !admin.isActive) {
      await this.refreshTokenRepo.revokeAllByUserId(storedToken.userId)
      throw new UnauthorizedError('Conta desativada')
    }

    // 5. Revoga o token antigo (rotation — uso único)
    await this.refreshTokenRepo.revoke(storedToken.id)

    // 6. Gera novo par de tokens
    const newTokenPair = this.tokenService.generateSuperAdminTokenPair({
      sub: admin.id,
      scope: 'super-admin',
    })

    // 7. Armazena o novo refresh token
    const newTokenHash = this.hashService.hashToken(newTokenPair.refreshToken)
    await this.refreshTokenRepo.create({
      userId: admin.id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + this.tokenService.refreshExpiresInMs),
    })

    return {
      accessToken: newTokenPair.accessToken,
      refreshToken: newTokenPair.refreshToken,
    }
  }
}
