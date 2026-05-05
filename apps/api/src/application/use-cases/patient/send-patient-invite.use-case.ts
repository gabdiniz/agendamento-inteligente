// ─── SendPatientInviteUseCase ──────────────────────────────────────────────────
//
// Envia um convite de acesso ao portal do paciente via WhatsApp ou E-mail.
//
// Responsabilidades:
//   1. Buscar o paciente (valida existência)
//   2. Validar pré-condições do canal:
//      - WHATSAPP → clínica precisa ter Z-API configurado + patient.phone válido
//      - EMAIL    → patient.email precisa existir
//   3. Montar a mensagem (default ou customizada) com {{link}} e {{nome}} resolvidos
//   4. Enviar via Z-API (WhatsApp) ou EmailAdapter (Email)
//   5. Registrar no NotificationLog do tenant
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@myagendix/database'
import { prisma } from '@myagendix/database'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'
import { ZApiClient } from '../../../infrastructure/external/zapi.client.js'
import { EmailAdapter } from '../../../infrastructure/notifications/channels/email.adapter.js'
import { PhoneFormatterService } from '../../services/phone-formatter.service.js'
import { PrismaNotificationRepository } from '../../../infrastructure/database/repositories/prisma-notification.repository.js'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type InviteChannel = 'WHATSAPP' | 'EMAIL'

export interface SendPatientInviteInput {
  patientId:  string
  tenantId:   string          // id global do tenant (para buscar config Z-API)
  channel:    InviteChannel
  inviteLink: string          // construído no frontend com window.location.origin + '/' + slug
  message?:   string          // se omitido, usa o template padrão
}

export interface SendPatientInviteResult {
  channel:    InviteChannel
  recipient:  string
  externalId: string | undefined
}

// ─── Template padrão ─────────────────────────────────────────────────────────

export const DEFAULT_INVITE_TEMPLATE =
  `Olá, {{nome}}! 👋\n\nVocê foi cadastrado em nossa clínica e agora pode agendar seus atendimentos de forma prática pelo nosso portal online:\n\n🔗 {{link}}\n\nAcesse, crie sua senha e aproveite! Em caso de dúvidas, estamos à disposição. 😊`

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class SendPatientInviteUseCase {
  private readonly phoneFormatter = new PhoneFormatterService()
  private readonly zapiClient     = new ZApiClient()
  private readonly emailAdapter   = new EmailAdapter()

  constructor(private readonly tenantPrisma: PrismaClient) {}

  async execute(input: SendPatientInviteInput): Promise<SendPatientInviteResult> {
    const { patientId, tenantId, channel, inviteLink, message } = input

    // 1. Buscar paciente
    const patient = await this.tenantPrisma.patient.findUnique({
      where: { id: patientId },
    })
    if (!patient) {
      throw new NotFoundError('Paciente')
    }

    // 2. Montar mensagem (resolve {{nome}} e {{link}})
    const template = message ?? DEFAULT_INVITE_TEMPLATE
    const content  = template
      .replace(/{{nome}}/g,  patient.name)
      .replace(/{{link}}/g,  inviteLink)

    // 3. Enviar pelo canal solicitado
    const notifRepo = new PrismaNotificationRepository(this.tenantPrisma)

    if (channel === 'WHATSAPP') {
      return this.sendWhatsapp({ patientId, tenantId, patient, content, notifRepo })
    } else {
      return this.sendEmail({ patientId, patient, content, notifRepo })
    }
  }

  // ─── WhatsApp ──────────────────────────────────────────────────────────────

  private async sendWhatsapp(ctx: {
    patientId:  string
    tenantId:   string
    patient:    { name: string; phone: string }
    content:    string
    notifRepo:  PrismaNotificationRepository
  }): Promise<SendPatientInviteResult> {
    const { patientId, tenantId, patient, content, notifRepo } = ctx

    // Busca config Z-API do tenant na tabela global
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { whatsappEnabled: true, zApiInstanceId: true, zApiToken: true, zApiClientToken: true },
    })

    if (!tenant?.zApiInstanceId || !tenant.zApiToken || !tenant.zApiClientToken) {
      throw new ValidationError(
        'WhatsApp não configurado para esta clínica. Configure as credenciais Z-API na página de configurações antes de enviar convites.',
      )
    }

    // Formata o número para o padrão Z-API (internacional, sem +)
    const formattedPhone = this.phoneFormatter.format(patient.phone)
    if (!formattedPhone) {
      throw new ValidationError(
        `O telefone do paciente (${patient.phone}) não pôde ser formatado para envio via WhatsApp. Verifique se o número está no formato correto.`,
      )
    }

    // Registra notificação como PENDING antes de enviar
    const notification = await notifRepo.create({
      type:      'CUSTOM',
      channel:   'WHATSAPP',
      recipient: formattedPhone,
      content,
      patientId,
    })

    try {
      const result = await this.zapiClient.sendText(
        tenant.zApiInstanceId,
        tenant.zApiToken,
        tenant.zApiClientToken,
        formattedPhone,
        content,
      )
      await notifRepo.markSent(notification.id, result.messageId)
      return { channel: 'WHATSAPP', recipient: formattedPhone, externalId: result.messageId }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      await notifRepo.markFailed(notification.id, reason)
      throw new ValidationError(`Falha ao enviar WhatsApp: ${reason}`)
    }
  }

  // ─── Email ────────────────────────────────────────────────────────────────

  private async sendEmail(ctx: {
    patientId:  string
    patient:    { name: string; email: string | null }
    content:    string
    notifRepo:  PrismaNotificationRepository
  }): Promise<SendPatientInviteResult> {
    const { patientId, patient, content, notifRepo } = ctx

    if (!patient.email) {
      throw new ValidationError(
        'Este paciente não possui e-mail cadastrado. Adicione um e-mail ao cadastro antes de enviar o convite por esta via.',
      )
    }

    // Registra notificação como PENDING antes de enviar
    const notification = await notifRepo.create({
      type:      'CUSTOM',
      channel:   'EMAIL',
      recipient: patient.email,
      content,
      patientId,
    })

    try {
      const result = await this.emailAdapter.send({
        to:      patient.email,
        subject: 'Seu acesso ao portal de agendamentos',
        text:    content,
      })
      await notifRepo.markSent(notification.id, result.externalId)
      return { channel: 'EMAIL', recipient: patient.email, externalId: result.externalId }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      await notifRepo.markFailed(notification.id, reason)
      throw new ValidationError(`Falha ao enviar e-mail: ${reason}`)
    }
  }
}
