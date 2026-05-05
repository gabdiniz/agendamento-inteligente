import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'
import type { CheckVacanciesUseCase } from '../waitlist/check-vacancies.use-case.js'

interface CancelAppointmentInput {
  appointmentId: string
  reason?: string
  canceledBy: 'PATIENT' | 'STAFF'
  changedByUserId?: string
}

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    // Opcional — quando injetado, dispara verificação de vagas na waitlist
    // automaticamente após o cancelamento (fire-and-forget, falha silenciosa).
    private readonly checkVacancies?: CheckVacanciesUseCase,
  ) {}

  async execute(input: CancelAppointmentInput): Promise<AppointmentRecord> {
    const { appointmentId, reason, canceledBy, changedByUserId } = input

    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new NotFoundError('Agendamento')

    if (appointment.status === 'CANCELED') {
      throw new ValidationError('Agendamento já está cancelado')
    }
    if (appointment.status === 'COMPLETED') {
      throw new ValidationError('Agendamentos concluídos não podem ser cancelados')
    }

    const canceled = await this.appointmentRepo.cancel(appointmentId, reason, canceledBy, changedByUserId)

    // ── Dispara verificação de vagas na waitlist (fire-and-forget) ───────────
    // Não aguarda nem propaga erros — o cancelamento já foi persistido.
    if (this.checkVacancies) {
      this.checkVacancies
        .execute({
          procedureId:    canceled.procedureId,
          professionalId: canceled.professionalId,
          vacancyDate:    canceled.scheduledDate,
          vacancyStartTime: canceled.startTime,
        })
        .catch((err: unknown) => {
          console.error('[CancelAppointment] Falha ao verificar waitlist após cancelamento:', err)
        })
    }

    return canceled
  }
}
