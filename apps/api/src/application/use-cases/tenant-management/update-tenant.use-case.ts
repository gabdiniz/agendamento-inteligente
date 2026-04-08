import type { ITenantRepository, TenantRecord, UpdateTenantData } from '../../../domain/repositories/tenant.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Update Tenant Use Case ─────────────────────────────────────────────────

export class UpdateTenantUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(tenantId: string, data: UpdateTenantData): Promise<TenantRecord> {
    const existing = await this.tenantRepo.findById(tenantId)
    if (!existing) {
      throw new NotFoundError('Tenant')
    }

    return this.tenantRepo.update(tenantId, data)
  }
}
