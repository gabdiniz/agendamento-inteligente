import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'

export interface PatientLogoutInput {
  refreshToken: string
}

export class PatientLogoutUseCase {
  constructor(
    private readonly refreshTokenRepo: IPatientRefreshTokenRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: PatientLogoutInput): Promise<void> {
    const tokenHash = this.hashService.hashToken(input.refreshToken)
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (storedToken && !storedToken.revokedAt) {
      await this.refreshTokenRepo.revoke(storedToken.id)
    }

    // Logout é idempotente — não lança erro se token não existir
  }
}
