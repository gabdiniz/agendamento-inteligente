import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import type { IUserRepository } from '../../../domain/repositories/user.repository.js'
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, JwtPayload } from '../../../domain/services/token.service.js'

// ─── Input / Output ──────────────────────────────────────────────────────

export interface RefreshTokenInput {
  refreshToken: string
  tenantId: string
  tenantSlug: string
}

export interface RefreshTokenOutput {
  accessToken: string
  refreshToken: string
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // 1. Busca o token no banco pelo hash
    const tokenHash = this.hashService.hashToken(input.refreshToken)
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token inválido')
    }

    // 2. Verifica se o token foi revogado
    if (storedToken.revokedAt) {
      // Possível roubo de token — revoga todos os tokens do usuário
      await this.refreshTokenRepo.revokeAllByUserId(storedToken.userId)
      throw new UnauthorizedError('Refresh token revogado. Todas as sessões foram encerradas.')
    }

    // 3. Verifica expiração
    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepo.revoke(storedToken.id)
      throw new UnauthorizedError('Refresh token expirado')
    }

    // 4. Busca o usuário (pode ter sido desativado)
    const user = await this.userRepo.findById(storedToken.userId)

    if (!user || !user.isActive) {
      await this.refreshTokenRepo.revokeAllByUserId(storedToken.userId)
      throw new UnauthorizedError('Usuário desativado')
    }

    // 5. Revoga o token antigo (rotation)
    await this.refreshTokenRepo.revoke(storedToken.id)

    // 6. Gera novo par de tokens
    const roles = user.roles.map((r) => r.role)
    const jwtPayload: JwtPayload = {
      sub: user.id,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      roles,
    }

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload)

    // 7. Armazena o novo refresh token
    const newTokenHash = this.hashService.hashToken(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + this.tokenService.refreshExpiresInMs)

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    })

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }
}
