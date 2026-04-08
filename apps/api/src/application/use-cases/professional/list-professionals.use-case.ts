import type { IProfessionalRepository, ProfessionalWithProcedures, PaginatedResult } from '../../../domain/repositories/professional.repository.js'

interface ListProfessionalsInput {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export class ListProfessionalsUseCase {
  constructor(private readonly professionalRepo: IProfessionalRepository) {}

  async execute(input: ListProfessionalsInput): Promise<PaginatedResult<ProfessionalWithProcedures>> {
    return this.professionalRepo.list(input)
  }
}
