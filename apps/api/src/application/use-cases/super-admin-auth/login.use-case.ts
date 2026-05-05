import type { ISuperAdminRepository } from '../../../domain/repositories/super-admin.repository.js'
import type { ISuperAdminRefreshTokenRepository } from '../../../domain/repositories/super-admin-refresh-token.repository.js'
import type { ITokenService } from '../../../domain/services/token.service.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import { UnauthorizedError } from '../../../domain/errors/app-error.js'

// ─── Super Admin Login ──────────────────────────────────────────────────────
//
// Opera no schema `public`. Sem conceito de tenant.
// ─────────────────────────────────────────────────────────────────────────────

interface LoginInput {
  email: string
  password: string
}

interface LoginOutput {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    name: string
    email: string
  }
}

export class SuperAdminLoginUseCase {
  constructor(
    private readonly superAdminRepo: ISuperAdminRepository,
    private readonly refreshTokenRepo: ISuperAdminRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Busca super admin por email
    const admin = await this.superAdminRepo.findByEmail(input.email)
    if (!admin) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    // 2. Verifica se está ativo
    if (!admin.isActive) {
      throw new UnauthorizedError('Conta desativada')
    }

    // 3. Valida senha
    const isPasswordValid = await this.hashService.comparePassword(
      input.password,
      admin.passwordHash,
    )
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    // 4. Gera par de tokens (access JWT + refresh random)
    const tokenPair = this.tokenService.generateSuperAdminTokenPair({
      sub: admin.id,
      scope: 'super-admin',
    })

    // 5. Armazena hash do refresh token no banco
    const tokenHash = this.hashService.hashToken(tokenPair.refreshToken)
    await this.refreshTokenRepo.create({
      userId: admin.id,
      tokenHash,
      expiresAt: new Date(Date.now() + this.tokenService.refreshExpiresInMs),
    })

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    }
  }
}
