// ─── ConfirmWaitlistEntryUseCase ──────────────────────────────────────────────
//
// Paciente aceita a vaga notificada:
//   • Entrada deve estar em status NOTIFIED.
//   • Atualiza para CONFIRMED com confirmedAt e appointmentId (opcional).
// ─────────────────────────────────────────────────────────────────────────────

import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

export interface ConfirmWaitlistEntryInput {
  id: string
  appointmentId?: string
}

export class ConfirmWaitlistEntryUseCase {
  constructor(private readonly waitlistRepo: IWaitlistRepository) {}

  async execute(input: ConfirmWaitlistEntryInput): Promise<WaitlistRecord> {
    const entry = await this.waitlistRepo.findById(input.id)
    if (!entry) throw new NotFoundError('Entrada na lista de espera')

    if (entry.status !== 'NOTIFIED') {
      throw new ValidationError(
        `Apenas entradas com status NOTIFIED podem ser confirmadas. Status atual: ${entry.status}`,
      )
    }

    return this.waitlistRepo.updateStatus(entry.id, 'CONFIRMED', {
      confirmedAt: new Date(),
      ...(input.appointmentId !== undefined ? { appointmentId: input.appointmentId } : {}),
    })
  }
}
