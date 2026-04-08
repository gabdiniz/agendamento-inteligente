import type { IProcedureRepository, ProcedureRecord, UpdateProcedureData } from '../../../domain/repositories/procedure.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

interface UpdateProcedureInput extends UpdateProcedureData {
  procedureId: string
}

export class UpdateProcedureUseCase {
  constructor(private readonly procedureRepo: IProcedureRepository) {}

  async execute(input: UpdateProcedureInput): Promise<ProcedureRecord> {
    const { procedureId, ...data } = input
    const existing = await this.procedureRepo.findById(procedureId)
    if (!existing) throw new NotFoundError('Procedimento')
    return this.procedureRepo.update(procedureId, data)
  }
}
