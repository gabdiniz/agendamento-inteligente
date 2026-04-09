import type { IPatientRepository, PatientRecord, UpdatePatientData } from '../../../domain/repositories/patient.repository.js'
import { NotFoundError, ConflictError } from '../../../domain/errors/app-error.js'

interface UpdatePatientInput extends UpdatePatientData {
  patientId: string
}

export class UpdatePatientUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(input: UpdatePatientInput): Promise<PatientRecord> {
    const { patientId, ...data } = input

    const patient = await this.patientRepo.findById(patientId)
    if (!patient) throw new NotFoundError('Paciente')

    // Se está tentando mudar o phone, verificar que não existe outro paciente com esse número
    if (data.phone && data.phone !== patient.phone) {
      const conflict = await this.patientRepo.findByPhone(data.phone)
      if (conflict) {
        throw new ConflictError(`Já existe um paciente cadastrado com o telefone ${data.phone}`)
      }
    }

    return this.patientRepo.update(patientId, data)
  }
}
