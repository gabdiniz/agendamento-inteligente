import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import type { IProcedureRepository } from '../../../domain/repositories/procedure.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

// ─── Link Procedures ─────────────────────────────────────────────────────────

interface LinkProceduresInput {
  professionalId: string
  procedureIds: string[]
}

export class LinkProceduresUseCase {
  constructor(
    private readonly professionalRepo: IProfessionalRepository,
    private readonly procedureRepo: IProcedureRepository,
  ) {}

  async execute(input: LinkProceduresInput): Promise<void> {
    const professional = await this.professionalRepo.findById(input.professionalId)
    if (!professional) throw new NotFoundError('Profissional')

    // Valida que todos os procedures existem e estão ativos antes de linkar
    for (const procedureId of input.procedureIds) {
      const procedure = await this.procedureRepo.findById(procedureId)
      if (!procedure) throw new NotFoundError(`Procedimento ${procedureId}`)
      if (!procedure.isActive) {
        throw new ValidationError(`Procedimento "${procedure.name}" está inativo e não pode ser vinculado`)
      }
    }

    await this.professionalRepo.linkProcedures(input.professionalId, input.procedureIds)
  }
}

// ─── Unlink Procedure ────────────────────────────────────────────────────────

interface UnlinkProcedureInput {
  professionalId: string
  procedureId: string
}

export class UnlinkProcedureUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(input: UnlinkProcedureInput): Promise<void> {
    const professional = await this.professionalRepo.findById(input.professionalId)
    if (!professional) throw new NotFoundError('Profissional')

    await this.professionalRepo.unlinkProcedure(input.professionalId, input.procedureId)
  }
}
