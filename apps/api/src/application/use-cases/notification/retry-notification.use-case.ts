// ─── RetryNotificationUseCase ─────────────────────────────────────────────────
//
// Reenvio manual de notificações que falharam (status FAILED).
// Cria um NOVO registro de notificação com os mesmos dados — mantendo o
// histórico de falhas intacto — e dispara o envio.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  INotificationRepository,
  NotificationRecord,
} from '../../../domain/repositories/notification.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'
import { NotificationDispatcher } from '../../../infrastructure/notifications/notification.dispatcher.js'

export class RetryNotificationUseCase {
  private readonly dispatcher = new NotificationDispatcher()

  constructor(private readonly notificationRepo: INotificationRepository) {}

  async execute(id: string): Promise<NotificationRecord> {
    const original = await this.notificationRepo.findById(id)
    if (!original) throw new NotFoundError('Notificação')

    if (original.status !== 'FAILED') {
      throw new ValidationError(
        `Apenas notificações com status FAILED podem ser reenviadas. Status atual: ${original.status}`,
      )
    }

    // Cria novo registro (o histórico de falha fica preservado no original)
    const newNotification = await this.notificationRepo.create({
      type: original.type,
      channel: original.channel,
      recipient: original.recipient,
      content: original.content,
      patientId: original.patientId ?? undefined,
      userId: original.userId ?? undefined,
      appointmentId: original.appointmentId ?? undefined,
    })

    try {
      const result = await this.dispatcher.dispatch({
        channel: original.channel,
        recipient: original.recipient,
        content: original.content,
      })
      return this.notificationRepo.markSent(newNotification.id, result.externalId)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      return this.notificationRepo.markFailed(newNotification.id, reason)
    }
  }
}
