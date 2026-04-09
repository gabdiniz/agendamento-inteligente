// ─── CheckVacanciesUseCase ────────────────────────────────────────────────────
//
// Chamado quando um agendamento é cancelado — notifica os candidatos elegíveis
// da lista de espera que correspondem ao procedimento/profissional/data.
//
// Critérios de elegibilidade (todos verificados pelo repo.findCandidates):
//   • status = WAITING
//   • procedureId coincide
//   • professionalId coincide ou entrada não especificou profissional
//   • vacancyDate está dentro do intervalo preferredDateFrom..preferredDateTo
//   • minAdvanceMinutes: tempo entre agora e a vaga é suficiente
//
// Ação:
//   • Para cada candidato, atualiza para NOTIFIED com notifiedAt e expiresAt
//     (expiresAt = agora + 24 h por padrão).
// ─────────────────────────────────────────────────────────────────────────────

import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'

const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

export interface CheckVacanciesInput {
  procedureId: string
  professionalId?: string
  vacancyDate: string        // "YYYY-MM-DD"
  vacancyStartTime: string   // "HH:MM"
}

export class CheckVacanciesUseCase {
  constructor(private readonly waitlistRepo: IWaitlistRepository) {}

  async execute(input: CheckVacanciesInput): Promise<WaitlistRecord[]> {
    const candidates = await this.waitlistRepo.findCandidates({
      procedureId: input.procedureId,
      vacancyDate: input.vacancyDate,
      vacancyStartTime: input.vacancyStartTime,
      ...(input.professionalId !== undefined ? { professionalId: input.professionalId } : {}),
    })

    if (candidates.length === 0) return []

    const now = new Date()
    const expiresAt = new Date(now.getTime() + NOTIFICATION_TTL_MS)

    // Notifica cada candidato em paralelo
    const notified = await Promise.all(
      candidates.map((entry) =>
        this.waitlistRepo.updateStatus(entry.id, 'NOTIFIED', {
          notifiedAt: now,
          expiresAt,
        }),
      ),
    )

    return notified
  }
}
