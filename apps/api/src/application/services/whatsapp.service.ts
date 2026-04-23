// ─── WhatsApp Service ─────────────────────────────────────────────────────────
//
// Responsável por:
//   1. Buscar o template de mensagem para o evento
//   2. Resolver as variáveis ({{nome_paciente}}, {{data}}, etc.)
//   3. Enfileirar um WhatsappJob na tabela do schema de tenant
//
// NÃO envia diretamente — o WhatsappWorker é quem processa a fila.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@myagendix/database'
import { PhoneFormatterService } from './phone-formatter.service.js'

// ─── Tipos internos ────────────────────────────────────────────────────────────

export interface AppointmentContext {
  id: string
  scheduledDate: Date      // Date object (sem hora)
  startTime: Date          // Time object
  patientName: string
  patientPhone: string | null
  professionalName: string
  procedureName: string
  clinicName: string
}

// Templates padrão — usados na criação inicial do tenant WhatsApp
export const DEFAULT_TEMPLATES: Record<string, string> = {
  CONFIRMATION: `Olá, {{nome_paciente}}! 👋\n\nSeu agendamento na *{{clinica}}* foi confirmado:\n\n📅 *Data:* {{data}}\n🕐 *Horário:* {{hora}}\n👨‍⚕️ *Profissional:* {{profissional}}\n💼 *Procedimento:* {{procedimento}}\n\nEm caso de dúvidas ou cancelamento, entre em contato conosco.`,
  REMINDER:     `Olá, {{nome_paciente}}! ⏰\n\nLembrando que você tem consulta na *{{clinica}}*:\n\n📅 *Data:* {{data}}\n🕐 *Horário:* {{hora}}\n👨‍⚕️ *Profissional:* {{profissional}}\n\nAté lá! 😊`,
  CANCELLATION: `Olá, {{nome_paciente}}.\n\nSeu agendamento na *{{clinica}}* foi *cancelado*:\n\n📅 *Data:* {{data}}\n🕐 *Horário:* {{hora}}\n\nPara remarcar, entre em contato conosco.`,
  RESCHEDULE:   `Olá, {{nome_paciente}}! 🔄\n\nSeu agendamento na *{{clinica}}* foi *remarcado*:\n\n📅 *Nova data:* {{data}}\n🕐 *Novo horário:* {{hora}}\n👨‍⚕️ *Profissional:* {{profissional}}\n\nEm caso de dúvidas, entre em contato conosco.`,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTHS_PT   = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatDate(date: Date): string {
  const d = new Date(date)
  const weekday = WEEKDAYS_PT[d.getUTCDay()] ?? ''
  const day     = String(d.getUTCDate()).padStart(2, '0')
  const month   = MONTHS_PT[d.getUTCMonth()] ?? ''
  const year    = d.getUTCFullYear()
  return `${weekday}, ${day} de ${month} de ${year}`
}

function formatTime(time: Date): string {
  const t = new Date(time)
  const h = String(t.getUTCHours()).padStart(2, '0')
  const m = String(t.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function resolveTemplate(template: string, ctx: AppointmentContext): string {
  return template
    .replace(/{{nome_paciente}}/g, ctx.patientName)
    .replace(/{{clinica}}/g,       ctx.clinicName)
    .replace(/{{data}}/g,          formatDate(ctx.scheduledDate))
    .replace(/{{hora}}/g,          formatTime(ctx.startTime))
    .replace(/{{profissional}}/g,  ctx.professionalName)
    .replace(/{{procedimento}}/g,  ctx.procedureName)
}

// ─── WhatsappService ──────────────────────────────────────────────────────────

export class WhatsappService {
  private readonly phoneFormatter = new PhoneFormatterService()

  constructor(private readonly tenantPrisma: PrismaClient) {}

  // ─── enqueueConfirmation ─────────────────────────────────────────────────
  async enqueueConfirmation(ctx: AppointmentContext, reminderHoursBefore: number): Promise<void> {
    // 1. Confirmação imediata
    await this.enqueue('CONFIRMATION', ctx, new Date())

    // 2. Lembrete agendado para X horas antes
    const reminderAt = this.computeReminderTime(ctx.scheduledDate, ctx.startTime, reminderHoursBefore)
    if (reminderAt > new Date()) {
      await this.enqueue('REMINDER', ctx, reminderAt)
    }
  }

  // ─── enqueueReminder ─────────────────────────────────────────────────────
  async enqueueReminder(ctx: AppointmentContext, reminderHoursBefore: number): Promise<void> {
    const reminderAt = this.computeReminderTime(ctx.scheduledDate, ctx.startTime, reminderHoursBefore)
    if (reminderAt > new Date()) {
      await this.enqueue('REMINDER', ctx, reminderAt)
    }
  }

  // ─── enqueueCancellation ─────────────────────────────────────────────────
  async enqueueCancellation(ctx: AppointmentContext): Promise<void> {
    // Cancela lembrete pendente do mesmo agendamento antes de enfileirar cancelamento
    await this.cancelPendingReminder(ctx.id)
    await this.enqueue('CANCELLATION', ctx, new Date())
  }

  // ─── enqueueReschedule ───────────────────────────────────────────────────
  async enqueueReschedule(ctx: AppointmentContext, reminderHoursBefore: number): Promise<void> {
    // Cancela lembrete pendente do agendamento original
    await this.cancelPendingReminder(ctx.id)
    // Confirmação do novo horário + novo lembrete
    await this.enqueueConfirmation(ctx, reminderHoursBefore)
  }

  // ─── ensureDefaultTemplates ──────────────────────────────────────────────
  // Cria os 4 templates padrão se não existirem.
  // Chamado quando a clínica ativa o WhatsApp pela primeira vez.
  async ensureDefaultTemplates(): Promise<void> {
    for (const [event, body] of Object.entries(DEFAULT_TEMPLATES)) {
      const existing = await (this.tenantPrisma as any).whatsappTemplate.findUnique({
        where: { event },
      })
      if (!existing) {
        await (this.tenantPrisma as any).whatsappTemplate.create({
          data: { event, body },
        })
      }
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async enqueue(
    event: string,
    ctx: AppointmentContext,
    scheduledAt: Date,
  ): Promise<void> {
    const phone = this.phoneFormatter.format(ctx.patientPhone)
    if (!phone) {
      console.warn(`[WhatsApp] Número inválido para paciente ${ctx.patientName} (${ctx.patientPhone ?? 'sem telefone'}) — job ignorado`)
      return
    }

    const templateRecord = await (this.tenantPrisma as any).whatsappTemplate.findUnique({
      where: { event },
    })

    const templateBody: string = templateRecord?.body ?? DEFAULT_TEMPLATES[event] ?? ''
    if (!templateBody) {
      console.warn(`[WhatsApp] Template não encontrado para evento ${event} — job ignorado`)
      return
    }

    const message = resolveTemplate(templateBody, ctx)

    await (this.tenantPrisma as any).whatsappJob.create({
      data: {
        event,
        phone,
        message,
        scheduledAt,
        appointmentId: ctx.id,
        patientName:   ctx.patientName,
      },
    })
  }

  private async cancelPendingReminder(appointmentId: string): Promise<void> {
    await (this.tenantPrisma as any).whatsappJob.updateMany({
      where: {
        appointmentId,
        event:  'REMINDER',
        status: 'PENDING',
      },
      data: { status: 'CANCELED' },
    })
  }

  private computeReminderTime(scheduledDate: Date, startTime: Date, hoursBefore: number): Date {
    // Combina scheduledDate (yyyy-mm-dd) com startTime (HH:MM:SS)
    const d = new Date(scheduledDate)
    const t = new Date(startTime)

    const appointmentDateTime = new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        t.getUTCHours(),
        t.getUTCMinutes(),
        0,
      ),
    )

    return new Date(appointmentDateTime.getTime() - hoursBefore * 60 * 60 * 1000)
  }
}
