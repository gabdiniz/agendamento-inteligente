import type { IPatientRepository, PaginatedPatients, ListPatientsParams } from '../../../domain/repositories/patient.repository.js'

export class ListPatientsUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(params: ListPatientsParams): Promise<PaginatedPatients> {
    return this.patientRepo.list(params)
  }
}
