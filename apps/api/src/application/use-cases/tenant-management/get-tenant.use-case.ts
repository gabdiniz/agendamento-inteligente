import type { ITenantRepository, TenantRecord } from '../../../domain/repositories/tenant.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Get Tenant Use Case ────────────────────────────────────────────────────

export class GetTenantUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(tenantId: string): Promise<TenantRecord> {
    const tenant = await this.tenantRepo.findById(tenantId)

    if (!tenant) {
      throw new NotFoundError('Tenant')
    }

    return tenant
  }
}
