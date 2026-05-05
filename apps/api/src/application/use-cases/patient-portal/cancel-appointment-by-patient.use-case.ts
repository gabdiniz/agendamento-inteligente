import { ForbiddenError, NotFoundError, UnprocessableError } from '../../../domain/errors/app-error.js'
import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'

// ─── Configuração de cancelamento da clínica ──────────────────────────────────
//
// Defaults usados quando a clínica ainda não configurou o portal.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CANCELLATION_CONFIG: ClinicCancellationConfig = {
  cancellationAllowed: true,
  cancellationMinHoursInAdvance: 2,
  cancellationAllowedStatuses: ['SCHEDULED'],
}

export interface ClinicCancellationConfig {
  cancellationAllowed: boolean
  cancellationMinHoursInAdvance: number   // 0 = sem restrição
  cancellationAllowedStatuses: string[]   // ex: ['SCHEDULED', 'PATIENT_PRESENT']
}

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface CancelAppointmentByPatientInput {
  appointmentId: string
  patientId: string          // vem do JWT — garante que o paciente só cancela o próprio
  reason?: string
  config: ClinicCancellationConfig
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class CancelAppointmentByPatientUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(input: CancelAppointmentByPatientInput): Promise<AppointmentRecord> {
    const { appointmentId, patientId, reason, config } = input

    // 1. Carrega agendamento
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new NotFoundError('Agendamento')

    // 2. Garante que o agendamento pertence ao paciente autenticado
    if (appointment.patientId !== patientId) {
      throw new ForbiddenError('Você não tem permissão para cancelar este agendamento')
    }

    // 3. Verifica se cancelamento pelo paciente está habilitado na clínica
    if (!config.cancellationAllowed) {
      throw new UnprocessableError(
        'Esta clínica não permite o cancelamento de agendamentos pelo portal do paciente. Entre em contato diretamente.',
      )
    }

    // 4. Verifica se o status atual permite cancelamento
    if (!config.cancellationAllowedStatuses.includes(appointment.status)) {
      throw new UnprocessableError(
        `Agendamento com status "${this.translateStatus(appointment.status)}" não pode ser cancelado pelo portal. Entre em contato com a clínica.`,
      )
    }

    // 5. Verifica antecedência mínima (se configurada)
    if (config.cancellationMinHoursInAdvance > 0) {
      const appointmentDatetime = this.parseAppointmentDatetime(
        appointment.scheduledDate,
        appointment.startTime,
      )
      const hoursUntilAppointment = (appointmentDatetime.getTime() - Date.now()) / (1000 * 60 * 60)

      if (hoursUntilAppointment < config.cancellationMinHoursInAdvance) {
        const hoursNeeded = config.cancellationMinHoursInAdvance
        throw new UnprocessableError(
          `Cancelamentos só são permitidos com pelo menos ${hoursNeeded}h de antecedência. ` +
          `Restam apenas ${Math.max(0, hoursUntilAppointment).toFixed(1)}h para o atendimento.`,
        )
      }
    }

    // 6. Cancela usando o repositório existente
    return this.appointmentRepo.cancel(appointmentId, reason, 'PATIENT')
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private parseAppointmentDatetime(scheduledDate: string, startTime: string): Date {
    // scheduledDate: "YYYY-MM-DD", startTime: "HH:MM"
    // Constrói datetime em UTC (consistente com como as datas são armazenadas)
    return new Date(`${scheduledDate}T${startTime}:00.000Z`)
  }

  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      SCHEDULED:       'Agendado',
      PATIENT_PRESENT: 'Paciente presente',
      IN_PROGRESS:     'Em andamento',
      COMPLETED:       'Concluído',
      CANCELED:        'Cancelado',
    }
    return translations[status] ?? status
  }
}
