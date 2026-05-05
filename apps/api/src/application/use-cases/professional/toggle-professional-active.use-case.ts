import type { IProfessionalRepository, ProfessionalRecord } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

interface ToggleInput {
  professionalId: string
  isActive: boolean
}

export class ToggleProfessionalActiveUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(input: ToggleInput): Promise<ProfessionalRecord> {
    const existing = await this.professionalRepo.findById(input.professionalId)
    if (!existing) throw new NotFoundError('Profissional')

    return this.professionalRepo.setActive(input.professionalId, input.isActive)
  }
}
