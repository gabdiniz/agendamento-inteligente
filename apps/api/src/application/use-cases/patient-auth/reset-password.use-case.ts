import { createHash } from 'node:crypto'
import { UnprocessableError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'

// ─── Input ───────────────────────────────────────────────────────────────

export interface PatientResetPasswordInput {
  token: string
  newPassword: string
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class PatientResetPasswordUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly refreshTokenRepo: IPatientRefreshTokenRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: PatientResetPasswordInput): Promise<void> {
    // 1. Hash do token recebido para comparar com o banco
    const tokenHash = createHash('sha256').update(input.token).digest('hex')

    const patient = await this.patientRepo.findByPasswordResetToken(tokenHash)

    if (
      !patient ||
      !patient.passwordResetToken ||
      !patient.passwordResetExpiresAt ||
      patient.passwordResetExpiresAt < new Date()
    ) {
      throw new UnprocessableError(
        'Link inválido ou expirado. Solicite um novo link de recuperação.',
      )
    }

    // 2. Atualiza senha, limpa token e revoga todas as sessões em paralelo
    const newHash = await this.hashService.hashPassword(input.newPassword)

    await Promise.all([
      this.patientRepo.updatePasswordHash(patient.id, newHash),
      this.patientRepo.clearPasswordResetToken(patient.id),
      this.refreshTokenRepo.revokeAllByPatientId(patient.id),
    ])
  }
}
