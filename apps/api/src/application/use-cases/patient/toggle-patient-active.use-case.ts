import type { IPatientRepository, PatientRecord } from '../../../domain/repositories/patient.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class TogglePatientActiveUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(patientId: string, isActive: boolean): Promise<PatientRecord> {
    const patient = await this.patientRepo.findById(patientId)
    if (!patient) throw new NotFoundError('Paciente')
    return this.patientRepo.setActive(patientId, isActive)
  }
}
