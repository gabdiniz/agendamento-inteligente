import type { IProcedureRepository, ProcedureRecord } from '../../../domain/repositories/procedure.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class GetProcedureUseCase {
  constructor(private readonly procedureRepo: IProcedureRepository) {}

  async execute(procedureId: string): Promise<ProcedureRecord> {
    const procedure = await this.procedureRepo.findById(procedureId)
    if (!procedure) throw new NotFoundError('Procedimento')
    return procedure
  }
}
