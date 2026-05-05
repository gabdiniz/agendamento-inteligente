import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import type { IUserRepository } from '../../../domain/repositories/user.repository.js'
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, JwtPayload } from '../../../domain/services/token.service.js'

// ─── Input / Output ──────────────────────────────────────────────────────

export interface LoginInput {
  email: string
  password: string
  tenantId: string
  tenantSlug: string
}

export interface LoginOutput {
  accessToken: string
  refreshToken: string
  tenantId: string
  tenantSlug: string
  user: {
    id: string
    name: string
    email: string
    roles: string[]
  }
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Busca o usuário pelo email
    const user = await this.userRepo.findByEmail(input.email)

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Email ou senha inválidos')
    }

    // 2. Verifica a senha
    const passwordMatch = await this.hashService.comparePassword(
      input.password,
      user.passwordHash,
    )

    if (!passwordMatch) {
      throw new UnauthorizedError('Email ou senha inválidos')
    }

    // 3. Monta o payload do JWT
    const roles = user.roles.map((r) => r.role)
    const jwtPayload: JwtPayload = {
      sub: user.id,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      roles,
    }

    // 4. Gera o par de tokens
    const tokenPair = this.tokenService.generateTokenPair(jwtPayload)

    // 5. Armazena o refresh token (hash) no banco
    const tokenHash = this.hashService.hashToken(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + this.tokenService.refreshExpiresInMs)

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    })

    // 6. Retorna
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
      },
    }
  }
}
