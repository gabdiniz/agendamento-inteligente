import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import type { IProcedureRepository } from '../../../domain/repositories/procedure.repository.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IWorkScheduleRepository } from '../../../domain/repositories/work-schedule.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

// Converte "HH:MM" para minutos desde meia-noite
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

// Retorna true quando dois intervalos [startA, endA) e [startB, endB) se sobroepem
function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB)
}

interface CreateAppointmentInput {
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string
  startTime: string
  notes?: string
  createdByUserId?: string
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

    // 1. Validar entidades
    const [patient, professional, procedure] = await Promise.all([
      this.patientRepo.findById(patientId),
      this.professionalRepo.findById(professionalId),
      this.procedureRepo.findById(procedureId),
    ])

    if (!patient) throw new NotFoundError('Paciente')
    if (!patient.isActive) throw new ValidationError('Paciente esta inativo')

    if (!professional) throw new NotFoundError('Profissional')
    if (!professional.isActive) throw new ValidationError('Profissional esta inativo')

    if (!procedure) throw new NotFoundError('Procedimento')
    if (!procedure.isActive) throw new ValidationError('Procedimento esta inativo')

    // 2. Calcular endTime
    const duration = input.durationMinutes ?? procedure.durationMinutes
    const endTime  = addMinutes(startTime, duration)

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      throw new ValidationError('O agendamento ultrapassa a meia-noite')
    }

    // 3. Validar grade de horarios do profissional
    const dayOfWeek = dayOfWeekFromDate(scheduledDate)
    const schedules = await this.workScheduleRepo.findByProfessional(professionalId)
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek)

    if (!schedule) {
      throw new ValidationError(`Profissional nao atende no dia selecionado (dayOfWeek=${dayOfWeek})`)
    }
    if (!schedule.isActive) {
      throw new ValidationError('O dia da semana selecionado esta desativado na grade do profissional')
    }
    if (toMinutes(startTime) < toMinutes(schedule.startTime)) {
      throw new ValidationError(`Horario de inicio (${startTime}) e anterior ao inicio do expediente (${schedule.startTime})`)
    }
    if (toMinutes(endTime) > toMinutes(schedule.endTime)) {
      throw new ValidationError(`Horario de termino (${endTime}) ultrapassa o fim do expediente (${schedule.endTime})`)
    }

    // 4. Detectar colisao com agendamentos existentes
    //
    // Verifica dois eixos independentes:
    //   a) Profissional: horario ocupado por outro paciente
    //   b) Paciente: paciente ja tem agendamento ativo naquela janela
    //      Impede duplo agendamento mesmo sendo com profissional diferente.

    const [professionalAppts, patientAppts] = await Promise.all([
      this.appointmentRepo.findByProfessionalAndDate(professionalId, scheduledDate),
      this.appointmentRepo.findByPatientAndDate(patientId, scheduledDate),
    ])

    const profCollision = professionalAppts.find(
      (a) => a.status !== 'CANCELED' && intervalsOverlap(startTime, endTime, a.startTime, a.endTime),
    )
    if (profCollision) {
      throw new ValidationError(
        `Conflito de horario: o profissional ja possui agendamento das ${profCollision.startTime} as ${profCollision.endTime}`,
      )
    }

    const patientCollision = patientAppts.find(
      (a) => a.status !== 'CANCELED' && intervalsOverlap(startTime, endTime, a.startTime, a.endTime),
    )
    if (patientCollision) {
      throw new ValidationError(
        `Voce ja possui um agendamento das ${patientCollision.startTime} as ${patientCollision.endTime} nesta data`,
      )
    }

    // 5. Criar agendamento
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
