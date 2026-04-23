import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'
import type { CheckVacanciesUseCase } from '../waitlist/check-vacancies.use-case.js'

// ─── Transições de status válidas ─────────────────────────────────────────────
//
//  SCHEDULED → PATIENT_PRESENT, CANCELED
//  PATIENT_PRESENT → IN_PROGRESS, CANCELED
//  IN_PROGRESS → COMPLETED, CANCELED
//  COMPLETED → (terminal — sem transição)
//  CANCELED  → (terminal — sem transição)
//
const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED:       ['PATIENT_PRESENT', 'CANCELED'],
  PATIENT_PRESENT: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS:     ['COMPLETED', 'CANCELED'],
  COMPLETED:       [],
  CANCELED:        [],
}

interface UpdateStatusInput {
  appointmentId: string
  newStatus: string
  changedByUserId?: string
  notes?: string
}

export class UpdateAppointmentStatusUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    // Opcional — quando injetado, dispara verificação de vagas na waitlist
    // automaticamente se a transição for para CANCELED (fire-and-forget).
    private readonly checkVacancies?: CheckVacanciesUseCase,
  ) {}

  async execute(input: UpdateStatusInput): Promise<AppointmentRecord> {
    const { appointmentId, newStatus, changedByUserId, notes } = input

    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new NotFoundError('Agendamento')

    const allowed = VALID_TRANSITIONS[appointment.status] ?? []
    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Transição inválida: ${appointment.status} → ${newStatus}. ` +
        (allowed.length > 0
          ? `Transições permitidas: ${allowed.join(', ')}`
          : 'Este agendamento está em estado terminal'),
      )
    }

    const updated = await this.appointmentRepo.updateStatus(appointmentId, newStatus, changedByUserId, notes)

    // ── Dispara verificação de vagas na waitlist se cancelado (fire-and-forget) ─
    if (newStatus === 'CANCELED' && this.checkVacancies) {
      this.checkVacancies
        .execute({
          procedureId:      updated.procedureId,
          professionalId:   updated.professionalId,
          vacancyDate:      updated.scheduledDate,
          vacancyStartTime: updated.startTime,
        })
        .catch((err: unknown) => {
          console.error('[UpdateAppointmentStatus] Falha ao verificar waitlist após cancelamento:', err)
        })
    }

    return updated
  }
}
