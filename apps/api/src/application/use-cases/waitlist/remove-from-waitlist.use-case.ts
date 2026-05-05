// ─── RemoveFromWaitlistUseCase ────────────────────────────────────────────────
//
// Marca a entrada como REMOVED (soft delete semântico via updateStatus).
// Permitido em qualquer status terminal ou WAITING/NOTIFIED quando
// o paciente ou a staff solicita retirada.
// ─────────────────────────────────────────────────────────────────────────────

import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

const TERMINAL_STATUSES = ['CONFIRMED', 'EXPIRED', 'REMOVED']

export class RemoveFromWaitlistUseCase {
  constructor(private readonly waitlistRepo: IWaitlistRepository) {}

  async execute(id: string): Promise<WaitlistRecord> {
    const entry = await this.waitlistRepo.findById(id)
    if (!entry) throw new NotFoundError('Entrada na lista de espera')

    if (TERMINAL_STATUSES.includes(entry.status)) {
      throw new ValidationError(
        `Entrada já está em status terminal (${entry.status}) e não pode ser removida`,
      )
    }

    return this.waitlistRepo.updateStatus(id, 'REMOVED')
  }
}
