// ─── NotificationDispatcher ───────────────────────────────────────────────────
//
// Roteador de canais: recebe canal + destinatário + conteúdo e delega ao
// adapter correto (Email, WhatsApp, SMS).
//
// Retorna o externalId retornado pelo provider (usado para tracking).
// Em caso de erro, relança para que o caller registre o status FAILED.
// ─────────────────────────────────────────────────────────────────────────────

import type { NotificationChannel } from '../../domain/repositories/notification.repository.js'
import { EmailAdapter } from './channels/email.adapter.js'
import { WhatsAppAdapter } from './channels/whatsapp.adapter.js'
import { SmsAdapter } from './channels/sms.adapter.js'

export interface DispatchOptions {
  channel: NotificationChannel
  recipient: string   // e-mail ou número de telefone
  subject?: string    // usado apenas pelo canal EMAIL
  content: string     // corpo da mensagem (texto plano)
  htmlContent?: string // conteúdo HTML para EMAIL (opcional)
}

export interface DispatchResult {
  externalId?: string
}

export class NotificationDispatcher {
  private readonly emailAdapter = new EmailAdapter()
  private readonly whatsAppAdapter = new WhatsAppAdapter()
  private readonly smsAdapter = new SmsAdapter()

  async dispatch(options: DispatchOptions): Promise<DispatchResult> {
    const { channel, recipient, content } = options

    switch (channel) {
      case 'EMAIL': {
        const result = await this.emailAdapter.send({
          to: recipient,
          subject: options.subject ?? 'MyAgendix — Notificação',
          text: content,
          html: options.htmlContent,
        })
        return { externalId: result.externalId }
      }

      case 'WHATSAPP': {
        const result = await this.whatsAppAdapter.send(recipient, content)
        return { externalId: result.externalId }
      }

      case 'SMS': {
        const result = await this.smsAdapter.send(recipient, content)
        return { externalId: result.externalId }
      }

      default: {
        // TypeScript garante exhaustiveness em tempo de compilação
        const _exhaustive: never = channel
        throw new Error(`Canal de notificação desconhecido: ${String(_exhaustive)}`)
      }
    }
  }
}
