import type { IProcedureRepository, ProcedureRecord } from '../../../domain/repositories/procedure.repository.js'

interface ListProceduresInput {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export class ListProceduresUseCase {
  constructor(private readonly procedureRepo: IProcedureRepository) {}

  async execute(input: ListProceduresInput): Promise<{ data: ProcedureRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.procedureRepo.list(input)
  }
}
