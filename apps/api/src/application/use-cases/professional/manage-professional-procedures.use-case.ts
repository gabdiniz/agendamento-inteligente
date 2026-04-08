import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Link Procedures ─────────────────────────────────────────────────────────

interface LinkProceduresInput {
  professionalId: string
  procedureIds: string[]
}

export class LinkProceduresUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(input: LinkProceduresInput): Promise<void> {
    const professional = await this.professionalRepo.findById(input.professionalId)
    if (!professional) throw new NotFoundError('Profissional')

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
