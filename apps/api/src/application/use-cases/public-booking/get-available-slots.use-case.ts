// ─── GetAvailableSlotsUseCase ─────────────────────────────────────────────────
//
// Calcula os horários disponíveis para um profissional/procedimento em uma data.
//
// Algoritmo:
//   1. Valida profissional (ativo) e procedimento (ativo, vinculado ao profissional).
//   2. Obtém a grade de horário do profissional para o dia da semana.
//   3. Obtém todos os agendamentos não-cancelados naquela data.
//   4. Itera de startTime até endTime com passo = slotIntervalMinutes,
//      descartando slots que colidem com agendamentos existentes ou que
//      não cabem antes de endTime (duração do procedimento).
//   5. Retorna a lista de slots disponíveis com startTime e endTime calculado.
// ─────────────────────────────────────────────────────────────────────────────

import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import type { IProcedureRepository } from '../../../domain/repositories/procedure.repository.js'
import type { IWorkScheduleRepository } from '../../../domain/repositories/work-schedule.repository.js'
import type { IAppointmentRepository } from '../../../domain/repositories/appointment.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

// ─── Time helpers ─────────────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function dayOfWeekFromDate(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay()
}

/**
 * Retorna a data de hoje e o horário atual em minutos, no timezone de Brasília.
 * Funciona independente do timezone configurado no servidor.
 */
function getNowInBrazil(): { todayStr: string; nowMinutes: number } {
  const now = new Date()
  // 'en-CA' produz formato YYYY-MM-DD — ideal para comparação direta com `date`
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(now)

  // Extrai hora e minuto no horário de Brasília
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const hour   = Number(parts.find((p) => p.type === 'hour')?.value   ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)

  return { todayStr, nowMinutes: hour * 60 + minute }
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface AvailableSlot {
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
}

export interface GetAvailableSlotsInput {
  professionalId: string
  procedureId: string
  date: string          // "YYYY-MM-DD"
}

export interface GetAvailableSlotsOutput {
  date: string
  professional: { id: string; name: string }
  procedure: { id: string; name: string; durationMinutes: number }
  slots: AvailableSlot[]
}

// ─────────────────────────────────────────────────────────────────────────────

export class GetAvailableSlotsUseCase {
  constructor(
    private readonly professionalRepo: IProfessionalRepository,
    private readonly procedureRepo: IProcedureRepository,
    private readonly workScheduleRepo: IWorkScheduleRepository,
    private readonly appointmentRepo: IAppointmentRepository,
  ) {}

  async execute(input: GetAvailableSlotsInput): Promise<GetAvailableSlotsOutput> {
    const { professionalId, procedureId, date } = input

    // ── 1. Validar entidades ──────────────────────────────────────────────
    const [professional, procedure] = await Promise.all([
      this.professionalRepo.findById(professionalId),
      this.procedureRepo.findById(procedureId),
    ])

    if (!professional) throw new NotFoundError('Profissional')
    if (!professional.isActive) throw new ValidationError('Profissional não está ativo')

    if (!procedure) throw new NotFoundError('Procedimento')
    if (!procedure.isActive) throw new ValidationError('Procedimento não está ativo')

    // Confirma que o procedimento está vinculado ao profissional
    const linked = professional.procedures.some((p) => p.id === procedureId)
    if (!linked) {
      throw new ValidationError('Este procedimento não é realizado pelo profissional selecionado')
    }

    // ── 2. Obter grade de horário ─────────────────────────────────────────
    const dayOfWeek = dayOfWeekFromDate(date)
    const schedules = await this.workScheduleRepo.findByProfessional(professionalId)
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek && s.isActive)

    if (!schedule) {
      // Dia sem atendimento — retorna lista vazia (não é erro)
      return {
        date,
        professional: { id: professional.id, name: professional.name },
        procedure: {
          id: procedure.id,
          name: procedure.name,
          durationMinutes: procedure.durationMinutes,
        },
        slots: [],
      }
    }

    // ── 3. Buscar agendamentos existentes ─────────────────────────────────
    const existingAppointments = await this.appointmentRepo.findByProfessionalAndDate(
      professionalId,
      date,
    )

    // Filtra apenas os que bloqueiam horário (não cancelados)
    const busySlots = existingAppointments.filter((a) => a.status !== 'CANCELED')

    // ── 4. Calcular slots disponíveis ─────────────────────────────────────
    const durationMin = procedure.durationMinutes
    const stepMin = schedule.slotIntervalMinutes
    const scheduleStart = toMinutes(schedule.startTime)
    const scheduleEnd = toMinutes(schedule.endTime)

    // Se a data solicitada for hoje, o cursor começa no próximo slot a partir
    // do horário atual — slots já iniciados ou passados são ignorados.
    const { todayStr, nowMinutes } = getNowInBrazil()
    let cursorStart = scheduleStart
    if (date === todayStr && nowMinutes > scheduleStart) {
      // Avança para o primeiro slot do grid que ainda não passou
      // Ex: expediente 08:00, intervalo 30min, agora 12:10
      //   → elapsed = ceil((730-480)/30) = ceil(8.33) = 9 slots
      //   → cursor = 480 + 9*30 = 750 → 12:30  ✓
      const elapsed = Math.ceil((nowMinutes - scheduleStart) / stepMin)
      cursorStart = scheduleStart + elapsed * stepMin
    }

    const available: AvailableSlot[] = []

    for (
      let cursor = cursorStart;
      cursor + durationMin <= scheduleEnd;
      cursor += stepMin
    ) {
      const slotStart = cursor
      const slotEnd = cursor + durationMin

      // Colisão: slot.start < busy.end AND slot.end > busy.start
      const hasCollision = busySlots.some((appt) => {
        const busyStart = toMinutes(appt.startTime)
        const busyEnd = toMinutes(appt.endTime)
        return slotStart < busyEnd && slotEnd > busyStart
      })

      if (!hasCollision) {
        available.push({
          startTime: fromMinutes(slotStart),
          endTime: fromMinutes(slotEnd),
        })
      }
    }

    return {
      date,
      professional: { id: professional.id, name: professional.name },
      procedure: {
        id: procedure.id,
        name: procedure.name,
        durationMinutes: procedure.durationMinutes,
      },
      slots: available,
    }
  }
}
