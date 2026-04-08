import type { IProfessionalRepository, ProfessionalWithProcedures } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class GetProfessionalUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(professionalId: string): Promise<ProfessionalWithProcedures> {
    const professional = await this.professionalRepo.findById(professionalId)
    if (!professional) throw new NotFoundError('Profissional')
    return professional
  }
}
