// ─── SendNotificationUseCase ──────────────────────────────────────────────────
//
// Fluxo:
//   1. Cria o registro com status PENDING.
//   2. Despacha via NotificationDispatcher (adapter do canal correto).
//   3. Marca SENT (com externalId) ou FAILED (com motivo).
//
// O caller recebe o NotificationRecord final, independente do resultado.
// Erros de envio são capturados e gravados como FAILED — não propagados.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  INotificationRepository,
  NotificationRecord,
  NotificationType,
  NotificationChannel,
} from '../../../domain/repositories/notification.repository.js'
import { NotificationDispatcher } from '../../../infrastructure/notifications/notification.dispatcher.js'

export interface SendNotificationInput {
  type: NotificationType
  channel: NotificationChannel
  recipient: string
  content: string
  subject?: string         // só relevante para EMAIL
  htmlContent?: string     // só relevante para EMAIL
  patientId?: string
  userId?: string
  appointmentId?: string
}

export class SendNotificationUseCase {
  private readonly dispatcher = new NotificationDispatcher()

  constructor(private readonly notificationRepo: INotificationRepository) {}

  async execute(input: SendNotificationInput): Promise<NotificationRecord> {
    // ── 1. Persiste o registro como PENDING ───────────────────────────────
    const notification = await this.notificationRepo.create({
      type: input.type,
      channel: input.channel,
      recipient: input.recipient,
      content: input.content,
      patientId: input.patientId,
      userId: input.userId,
      appointmentId: input.appointmentId,
    })

    // ── 2. Despacha via canal correspondente ──────────────────────────────
    try {
      const result = await this.dispatcher.dispatch({
        channel: input.channel,
        recipient: input.recipient,
        content: input.content,
        subject: input.subject,
        htmlContent: input.htmlContent,
      })

      // ── 3a. Sucesso: marca SENT ────────────────────────────────────────
      return this.notificationRepo.markSent(notification.id, result.externalId)
    } catch (err) {
      // ── 3b. Falha: marca FAILED com motivo legível ────────────────────
      const reason = err instanceof Error ? err.message : String(err)
      return this.notificationRepo.markFailed(notification.id, reason)
    }
  }
}
