import type { IProcedureRepository, ProcedureRecord } from '../../../domain/repositories/procedure.repository.js'

interface CreateProcedureInput {
  name: string
  description?: string
  durationMinutes: number
  color?: string
}

export class CreateProcedureUseCase {
  constructor(private readonly procedureRepo: IProcedureRepository) {}

  async execute(input: CreateProcedureInput): Promise<ProcedureRecord> {
    return this.procedureRepo.create(input)
  }
}
