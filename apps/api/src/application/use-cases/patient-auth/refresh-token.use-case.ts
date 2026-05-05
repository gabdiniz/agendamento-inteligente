import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, PatientJwtPayload } from '../../../domain/services/token.service.js'

// ─── Input / Output ──────────────────────────────────────────────────────

export interface PatientRefreshTokenInput {
  refreshToken: string
  tenantId: string
  tenantSlug: string
}

export interface PatientRefreshTokenOutput {
  accessToken: string
  refreshToken: string
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class PatientRefreshTokenUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly refreshTokenRepo: IPatientRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: PatientRefreshTokenInput): Promise<PatientRefreshTokenOutput> {
    // 1. Busca token pelo hash
    const tokenHash = this.hashService.hashToken(input.refreshToken)
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token inválido')
    }

    // 2. Token revogado — possível roubo, revoga todos os tokens do paciente
    if (storedToken.revokedAt) {
      await this.refreshTokenRepo.revokeAllByPatientId(storedToken.patientId)
      throw new UnauthorizedError('Refresh token revogado. Todas as sessões foram encerradas.')
    }

    // 3. Token expirado
    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepo.revoke(storedToken.id)
      throw new UnauthorizedError('Refresh token expirado')
    }

    // 4. Paciente pode ter sido desativado
    const patient = await this.patientRepo.findById(storedToken.patientId)
    if (!patient || !patient.isActive) {
      await this.refreshTokenRepo.revokeAllByPatientId(storedToken.patientId)
      throw new UnauthorizedError('Paciente desativado')
    }

    // 5. Revoga o token antigo (rotation)
    await this.refreshTokenRepo.revoke(storedToken.id)

    // 6. Gera novo par de tokens
    const jwtPayload: PatientJwtPayload = {
      sub:        patient.id,
      tenantId:   input.tenantId,
      tenantSlug: input.tenantSlug,
      role:       'PATIENT',
    }
    const tokenPair = this.tokenService.generatePatientTokenPair(jwtPayload)

    // 7. Persiste novo refresh token
    const newTokenHash = this.hashService.hashToken(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + this.tokenService.refreshExpiresInMs)
    await this.refreshTokenRepo.create({
      patientId: patient.id,
      tokenHash: newTokenHash,
      expiresAt,
    })

    return {
      accessToken:  tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }
}
