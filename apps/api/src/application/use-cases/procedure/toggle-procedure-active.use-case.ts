import type { IProcedureRepository, ProcedureRecord } from '../../../domain/repositories/procedure.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class ToggleProcedureActiveUseCase {
  constructor(private readonly procedureRepo: IProcedureRepository) {}

  async execute(procedureId: string, isActive: boolean): Promise<ProcedureRecord> {
    const existing = await this.procedureRepo.findById(procedureId)
    if (!existing) throw new NotFoundError('Procedimento')
    return this.procedureRepo.setActive(procedureId, isActive)
  }
}
