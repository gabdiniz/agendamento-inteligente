import type { ITenantRepository } from '../../../domain/repositories/tenant.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Delete Tenant Use Case ──────────────────────────────────────────────────
//
// Remove um tenant permanentemente do sistema.
// Lança NotFoundError se o tenant não existir.
// ─────────────────────────────────────────────────────────────────────────────

export class DeleteTenantUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(tenantId: string): Promise<void> {
    const existing = await this.tenantRepo.findById(tenantId)
    if (!existing) {
      throw new NotFoundError('Tenant')
    }

    await this.tenantRepo.delete(tenantId)
  }
}
