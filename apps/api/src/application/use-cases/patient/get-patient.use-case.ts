import type { IPatientRepository, PatientRecord } from '../../../domain/repositories/patient.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class GetPatientUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(patientId: string): Promise<PatientRecord> {
    const patient = await this.patientRepo.findById(patientId)
    if (!patient) throw new NotFoundError('Paciente')
    return patient
  }
}
