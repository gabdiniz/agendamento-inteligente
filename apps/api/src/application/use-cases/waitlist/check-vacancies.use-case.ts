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
//   • Dispara SendNotificationUseCase para envio real pelo canal preferido do paciente.
// ─────────────────────────────────────────────────────────────────────────────

import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'
import type { INotificationRepository } from '../../../domain/repositories/notification.repository.js'
import { SendNotificationUseCase } from '../notification/send-notification.use-case.js'

const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

export interface CheckVacanciesInput {
  procedureId: string
  professionalId?: string
  vacancyDate: string        // "YYYY-MM-DD"
  vacancyStartTime: string   // "HH:MM"
}

export class CheckVacanciesUseCase {
  constructor(
    private readonly waitlistRepo: IWaitlistRepository,
    private readonly notificationRepo?: INotificationRepository,
  ) {}

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

    // Atualiza status + envia notificações em paralelo
    const notified = await Promise.all(
      candidates.map(async (entry) => {
        const updated = await this.waitlistRepo.updateStatus(entry.id, 'NOTIFIED', {
          notifiedAt: now,
          expiresAt,
        })

        // Envia notificação real se notificationRepo foi injetado
        if (this.notificationRepo) {
          // Canal preferido do paciente, ou WhatsApp como padrão
          const validChannels = ['WHATSAPP', 'SMS', 'EMAIL'] as const
          type Channel = typeof validChannels[number]
          const rawChannel = entry.patient.preferredContactChannel ?? 'WHATSAPP'
          const resolvedChannel: Channel = validChannels.includes(rawChannel as Channel)
            ? (rawChannel as Channel)
            : 'WHATSAPP'

          const recipient = resolvedChannel === 'EMAIL'
            ? (entry.patient.email ?? entry.patient.phone)
            : entry.patient.phone

          const content =
            `Olá, ${entry.patient.name}! Uma vaga abriu para ${entry.procedure.name} ` +
            `em ${input.vacancyDate} às ${input.vacancyStartTime}. ` +
            `Confirme seu agendamento nas próximas 24 horas.`

          // Falha silenciosa — não deve bloquear a atualização da waitlist
          await new SendNotificationUseCase(this.notificationRepo)
            .execute({
              type: 'WAITLIST_VACANCY',
              channel: resolvedChannel,
              recipient,
              content,
              patientId: entry.patientId,
            })
            .catch((err: unknown) => {
              console.error('[CheckVacancies] Falha ao enviar notificação:', err)
            })
        }

        return updated
      }),
    )

    return notified
  }
}
