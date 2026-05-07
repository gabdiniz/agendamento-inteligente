// ─── RescheduleAppointmentByPatientUseCase ────────────────────────────────────
//
// Permite que o paciente reagende um agendamento cancelado para outra data/hora.
// O profissional e o procedimento sao mantidos.
//
// Fluxo:
//   1. Carrega o agendamento original e valida posse (patientId do JWT).
//   2. Valida que o agendamento esta cancelado (so remarca cancelados).
//   3. Valida que ainda nao foi remarcado (rescheduledToId == null).
//   4. Cria um novo agendamento via CreateAppointmentUseCase (mesma logica
//      de validacao de grade e conflitos).
//   5. Seta rescheduledToId no original apontando para o novo.
//   6. Retorna o novo agendamento.
// ─────────────────────────────────────────────────────────────────────────────

import { ForbiddenError, NotFoundError, UnprocessableError } from '../../../domain/errors/app-error.js'
import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import type { IProcedureRepository } from '../../../domain/repositories/procedure.repository.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IWorkScheduleRepository } from '../../../domain/repositories/work-schedule.repository.js'
import { CreateAppointmentUseCase } from '../appointment/create-appointment.use-case.js'

export interface RescheduleAppointmentByPatientInput {
  appointmentId:  string   // agendamento original (cancelado)
  patientId:      string   // do JWT
  scheduledDate:  string   // nova data "YYYY-MM-DD"
  startTime:      string   // novo horario "HH:MM"
}

export class RescheduleAppointmentByPatientUseCase {
  constructor(
    private readonly appointmentRepo:   IAppointmentRepository,
    private readonly professionalRepo:  IProfessionalRepository,
    private readonly procedureRepo:     IProcedureRepository,
    private readonly patientRepo:       IPatientRepository,
    private readonly workScheduleRepo:  IWorkScheduleRepository,
  ) {}

  async execute(input: RescheduleAppointmentByPatientInput): Promise<AppointmentRecord> {
    const { appointmentId, patientId, scheduledDate, startTime } = input

    // 1. Carrega agendamento original
    const original = await this.appointmentRepo.findById(appointmentId)
    if (!original) throw new NotFoundError('Agendamento')

    // 2. Garante posse
    if (original.patientId !== patientId) {
      throw new ForbiddenError('Voce nao tem permissao para remarcar este agendamento')
    }

    // 3. So reagenda cancelados
    if (original.status !== 'CANCELED') {
      throw new UnprocessableError(
        'Apenas agendamentos cancelados podem ser remarcados. Cancele o agendamento atual antes de remarcar.',
      )
    }

    // 4. Ja foi remarcado anteriormente?
    if (original.rescheduledToId) {
      throw new UnprocessableError('Este agendamento ja foi remarcado anteriormente.')
    }

    // 5. Cria novo agendamento (reutiliza toda a logica de validacao)
    const newAppointment = await new CreateAppointmentUseCase(
      this.appointmentRepo,
      this.professionalRepo,
      this.procedureRepo,
      this.patientRepo,
      this.workScheduleRepo,
    ).execute({
      patientId,
      professionalId: original.professionalId,
      procedureId:    original.procedureId,
      scheduledDate,
      startTime,
    })

    // 6. Vincula original ao novo
    await this.appointmentRepo.setRescheduled(appointmentId, newAppointment.id)

    return newAppointment
  }
}
