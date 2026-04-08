import type {
  ITenantRepository,
  TenantRecord,
  PaginatedResult,
} from '../../../domain/repositories/tenant.repository.js'

// ─── List Tenants Use Case ──────────────────────────────────────────────────

interface ListTenantsInput {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export class ListTenantsUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(input: ListTenantsInput): Promise<PaginatedResult<TenantRecord>> {
    return this.tenantRepo.list(input)
  }
}
