import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import type { IProcedureRepository } from '../../../domain/repositories/procedure.repository.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IWorkScheduleRepository } from '../../../domain/repositories/work-schedule.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

// ─── Helpers de tempo ─────────────────────────────────────────────────────────
// Converte "HH:MM" para minutos desde meia-noite — facilita aritmética
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

// Adiciona minutos a um "HH:MM" e retorna "HH:MM"
function addMinutes(time: string, minutes: number): string {
  const total = toMinutes(time) + minutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Retorna 0=Dom..6=Sab a partir de "YYYY-MM-DD" em UTC
function dayOfWeekFromDate(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay()
}

// ─────────────────────────────────────────────────────────────────────────────

interface CreateAppointmentInput {
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string   // "YYYY-MM-DD"
  startTime: string       // "HH:MM"
  notes?: string
  createdByUserId?: string
  /** Duração em minutos — sobrescreve procedure.durationMinutes para este agendamento */
  durationMinutes?: number
}

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly professionalRepo: IProfessionalRepository,
    private readonly procedureRepo: IProcedureRepository,
    private readonly patientRepo: IPatientRepository,
    private readonly workScheduleRepo: IWorkScheduleRepository,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<AppointmentRecord> {
    const { patientId, professionalId, procedureId, scheduledDate, startTime, notes, createdByUserId } = input

    // ── 1. Validar entidades ───────────────────────────────────────────────

    const [patient, professional, procedure] = await Promise.all([
      this.patientRepo.findById(patientId),
      this.professionalRepo.findById(professionalId),
      this.procedureRepo.findById(procedureId),
    ])

    if (!patient) throw new NotFoundError('Paciente')
    if (!patient.isActive) throw new ValidationError('Paciente está inativo')

    if (!professional) throw new NotFoundError('Profissional')
    if (!professional.isActive) throw new ValidationError('Profissional está inativo')

    if (!procedure) throw new NotFoundError('Procedimento')
    if (!procedure.isActive) throw new ValidationError('Procedimento está inativo')

    // ── 2. Calcular endTime — usa override se fornecido, senão padrão do procedimento ───

    const duration = input.durationMinutes ?? procedure.durationMinutes
    const endTime  = addMinutes(startTime, duration)

    // Sanity check: endTime não pode passar da meia-noite
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      throw new ValidationError('O agendamento ultrapassa a meia-noite — não permitido')
    }

    // ── 3. Validar grade de horários do profissional ───────────────────────

    const dayOfWeek = dayOfWeekFromDate(scheduledDate)
    const schedules = await this.workScheduleRepo.findByProfessional(professionalId)
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek)

    if (!schedule) {
      throw new ValidationError(
        `Profissional não atende no dia selecionado (dayOfWeek=${dayOfWeek})`,
      )
    }
    if (!schedule.isActive) {
      throw new ValidationError('O dia da semana selecionado está desativado na grade do profissional')
    }
    if (toMinutes(startTime) < toMinutes(schedule.startTime)) {
      throw new ValidationError(
        `Horário de início (${startTime}) é anterior ao início do expediente (${schedule.startTime})`,
      )
    }
    if (toMinutes(endTime) > toMinutes(schedule.endTime)) {
      throw new ValidationError(
        `Horário de término (${endTime}) ultrapassa o fim do expediente (${schedule.endTime})`,
      )
    }

    // ── 4. Detectar colisão com outros agendamentos ────────────────────────

    const existingAppointments = await this.appointmentRepo.findByProfessionalAndDate(
      professionalId,
      scheduledDate,
    )

    // Intervalos se sobrepõem quando: novo.start < exist.end AND novo.end > exist.start
    const collision = existingAppointments.find(
      (appt) =>
        appt.status !== 'CANCELED' &&
        toMinutes(startTime) < toMinutes(appt.endTime) &&
        toMinutes(endTime) > toMinutes(appt.startTime),
    )

    if (collision) {
      throw new ValidationError(
        `Conflito de horário: já existe um agendamento das ${collision.startTime} às ${collision.endTime}`,
      )
    }

    // ── 5. Criar agendamento ───────────────────────────────────────────────

    return this.appointmentRepo.create({
      patientId,
      professionalId,
      procedureId,
      scheduledDate,
      startTime,
      endTime,
      notes,
      createdByUserId,
    })
  }
}
