import type { ITenantRepository, TenantRecord } from '../../../domain/repositories/tenant.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Toggle Tenant Active Use Case ──────────────────────────────────────────
//
// Ativa ou desativa um tenant. Tenants desativados não podem ser acessados
// pelo tenant middleware (busca com isActive: true).
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleInput {
  tenantId: string
  isActive: boolean
}

export class ToggleTenantActiveUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(input: ToggleInput): Promise<TenantRecord> {
    const existing = await this.tenantRepo.findById(input.tenantId)
    if (!existing) {
      throw new NotFoundError('Tenant')
    }

    return this.tenantRepo.setActive(input.tenantId, input.isActive)
  }
}
