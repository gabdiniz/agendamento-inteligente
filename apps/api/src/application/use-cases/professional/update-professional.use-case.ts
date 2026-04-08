import type { IProfessionalRepository, ProfessionalWithProcedures, UpdateProfessionalData } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

interface UpdateProfessionalInput extends UpdateProfessionalData {
  professionalId: string
}

export class UpdateProfessionalUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(input: UpdateProfessionalInput): Promise<ProfessionalWithProcedures> {
    const { professionalId, ...data } = input

    const existing = await this.professionalRepo.findById(professionalId)
    if (!existing) throw new NotFoundError('Profissional')

    return this.professionalRepo.update(professionalId, data)
  }
}
