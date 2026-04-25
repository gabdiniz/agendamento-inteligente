import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'

// ─── Input ───────────────────────────────────────────────────────────────

export interface PatientChangePasswordInput {
  patientId: string        // vem do JWT (currentPatient.sub)
  currentPassword: string
  newPassword: string
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class PatientChangePasswordUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: PatientChangePasswordInput): Promise<void> {
    const patient = await this.patientRepo.findByIdWithAuth(input.patientId)

    if (!patient || !patient.isActive) {
      throw new UnauthorizedError('Paciente não encontrado')
    }

    if (!patient.passwordHash) {
      throw new UnauthorizedError('Este paciente não possui senha cadastrada')
    }

    const match = await this.hashService.comparePassword(
      input.currentPassword,
      patient.passwordHash,
    )

    if (!match) {
      throw new UnauthorizedError('Senha atual incorreta')
    }

    const newHash = await this.hashService.hashPassword(input.newPassword)
    await this.patientRepo.updatePasswordHash(patient.id, newHash)
  }
}
