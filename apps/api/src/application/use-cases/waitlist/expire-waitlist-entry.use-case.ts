// ─── ExpireWaitlistEntryUseCase ───────────────────────────────────────────────
//
// Paciente não respondeu dentro do prazo:
//   • Entrada deve estar em status NOTIFIED.
//   • Atualiza para EXPIRED.
// Usado por job/cron ou manualmente pela staff.
// ─────────────────────────────────────────────────────────────────────────────

import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

export class ExpireWaitlistEntryUseCase {
  constructor(private readonly waitlistRepo: IWaitlistRepository) {}

  async execute(id: string): Promise<WaitlistRecord> {
    const entry = await this.waitlistRepo.findById(id)
    if (!entry) throw new NotFoundError('Entrada na lista de espera')

    if (entry.status !== 'NOTIFIED') {
      throw new ValidationError(
        `Apenas entradas com status NOTIFIED podem ser expiradas. Status atual: ${entry.status}`,
      )
    }

    return this.waitlistRepo.updateStatus(id, 'EXPIRED')
  }
}
