import type { IProfessionalRepository, ProfessionalWithProcedures } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

interface CreateProfessionalInput {
  name: string
  specialty?: string
  bio?: string
  color?: string
  userId?: string          // vínculo opcional com usuário
  avatarUrl?: string | null
  birthDate?: string | null
  procedureIds?: string[]  // procedures a linkar imediatamente
}

export class CreateProfessionalUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(input: CreateProfessionalInput): Promise<ProfessionalWithProcedures> {
    const professional = await this.professionalRepo.create({
      name:      input.name,
      specialty: input.specialty,
      bio:       input.bio,
      color:     input.color,
      userId:    input.userId,
      avatarUrl: input.avatarUrl ?? null,
      birthDate: input.birthDate ?? null,
    })

    if (input.procedureIds && input.procedureIds.length > 0) {
      await this.professionalRepo.linkProcedures(professional.id, input.procedureIds)
    }

    // Re-fetch para retornar com procedures atualizadas
    const updated = await this.professionalRepo.findById(professional.id)
    if (!updated) throw new NotFoundError('Professional')

    return updated
  }
}
