import type { IPatientRepository, PatientRecord, CreatePatientData } from '../../../domain/repositories/patient.repository.js'
import { ConflictError } from '../../../domain/errors/app-error.js'

export class CreatePatientUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(data: CreatePatientData): Promise<PatientRecord> {
    // phone é único por tenant — deduplicação explícita com mensagem clara
    const existing = await this.patientRepo.findByPhone(data.phone)
    if (existing) {
      throw new ConflictError(`Já existe um paciente cadastrado com o telefone ${data.phone}`)
    }

    return this.patientRepo.create(data)
  }
}
