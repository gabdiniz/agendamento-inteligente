// ─── CancelAppointmentByPatientUseCase — testes unitários ────────────────────
//
// Valida todas as regras de negócio do cancelamento via portal do paciente:
//  • Agendamento não encontrado
//  • Tentativa de cancelar agendamento de outro paciente
//  • Clínica com cancelamento desabilitado
//  • Status que não permite cancelamento
//  • Cancelamento fora do prazo mínimo de antecedência
//  • Antecedência suficiente → cancela com sucesso
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CancelAppointmentByPatientUseCase,
  DEFAULT_CANCELLATION_CONFIG,
  type ClinicCancellationConfig,
} from './cancel-appointment-by-patient.use-case.js'
import {
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../../domain/errors/app-error.js'
import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Retorna uma data futura a `hoursFromNow` horas no formato "YYYY-MM-DD" + "HH:MM" */
function futureDateTime(hoursFromNow: number): { scheduledDate: string; startTime: string } {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  const scheduledDate = d.toISOString().slice(0, 10)
  const startTime     = d.toISOString().slice(11, 16)
  return { scheduledDate, startTime }
}

function makeAppointment(overrides?: Partial<AppointmentRecord>): AppointmentRecord {
  const { scheduledDate, startTime } = futureDateTime(5) // 5h no futuro por padrão
  return {
    id:                 'appt-1',
    patientId:          'patient-1',
    professionalId:     'prof-1',
    procedureId:        'proc-1',
    scheduledDate,
    startTime,
    endTime:            '10:30',
    status:             'SCHEDULED',
    cancellationReason: null,
    canceledBy:         null,
    notes:              null,
    createdByUserId:    null,
    createdAt:          new Date(),
    updatedAt:          new Date(),
    patient:     { id: 'patient-1', name: 'Ana Lima',    phone: '11999990001' },
    professional:{ id: 'prof-1',    name: 'Dr. Carlos',  specialty: 'Clínica Geral', avatarUrl: null },
    procedure:   { id: 'proc-1',    name: 'Consulta',    durationMinutes: 30, color: '#4f8ef7' },
    evaluation:  null,
    ...overrides,
  }
}

function makeAppointmentRepo(
  appointment: AppointmentRecord | null,
  overrides?: Partial<IAppointmentRepository>,
): IAppointmentRepository {
  return {
    create:                   vi.fn(),
    findById:                 vi.fn().mockResolvedValue(appointment),
    list:                     vi.fn(),
    findByProfessionalAndDate:vi.fn(),
    updateStatus:             vi.fn(),
    cancel:                   vi.fn().mockResolvedValue({ ...appointment, status: 'CANCELED', canceledBy: 'PATIENT' }),
    ...overrides,
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancelAppointmentByPatientUseCase', () => {
  let repo:    IAppointmentRepository
  let useCase: CancelAppointmentByPatientUseCase

  const defaultConfig: ClinicCancellationConfig = { ...DEFAULT_CANCELLATION_CONFIG }

  beforeEach(() => {
    repo    = makeAppointmentRepo(makeAppointment())
    useCase = new CancelAppointmentByPatientUseCase(repo)
  })

  // ── Caminho feliz ─────────────────────────────────────────────────────────

  it('cancela com sucesso quando todas as regras são satisfeitas', async () => {
    const result = await useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'patient-1',
      reason:        'Não poderei comparecer',
      config:        defaultConfig,
    })

    expect(result.status).toBe('CANCELED')
    expect(result.canceledBy).toBe('PATIENT')
    expect(repo.cancel).toHaveBeenCalledWith('appt-1', 'Não poderei comparecer', 'PATIENT')
  })

  // ── Agendamento não encontrado ────────────────────────────────────────────

  it('lança NotFoundError quando o agendamento não existe', async () => {
    repo    = makeAppointmentRepo(null)
    useCase = new CancelAppointmentByPatientUseCase(repo)

    await expect(useCase.execute({
      appointmentId: 'inexistente',
      patientId:     'patient-1',
      config:        defaultConfig,
    })).rejects.toThrow(NotFoundError)
  })

  it('NotFoundError tem statusCode 404', async () => {
    repo    = makeAppointmentRepo(null)
    useCase = new CancelAppointmentByPatientUseCase(repo)

    const err = await useCase.execute({ appointmentId: 'x', patientId: 'p', config: defaultConfig })
      .catch((e: unknown) => e)

    expect((err as NotFoundError).statusCode).toBe(404)
  })

  // ── Paciente errado ───────────────────────────────────────────────────────

  it('lança ForbiddenError quando o patientId do JWT não bate com o do agendamento', async () => {
    await expect(useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'outro-paciente',
      config:        defaultConfig,
    })).rejects.toThrow(ForbiddenError)
  })

  it('ForbiddenError tem statusCode 403', async () => {
    const err = await useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'outro-paciente',
      config:        defaultConfig,
    }).catch((e: unknown) => e)

    expect((err as ForbiddenError).statusCode).toBe(403)
  })

  // ── Cancelamento desabilitado pela clínica ────────────────────────────────

  it('lança UnprocessableError quando a clínica desabilitou o cancelamento via portal', async () => {
    const config: ClinicCancellationConfig = {
      ...defaultConfig,
      cancellationAllowed: false,
    }

    await expect(useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'patient-1',
      config,
    })).rejects.toThrow(UnprocessableError)
  })

  // ── Status não permitido ──────────────────────────────────────────────────

  it('lança UnprocessableError quando o status do agendamento não está na lista permitida', async () => {
    repo    = makeAppointmentRepo(makeAppointment({ status: 'COMPLETED' }))
    useCase = new CancelAppointmentByPatientUseCase(repo)

    await expect(useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'patient-1',
      config:        defaultConfig, // default: só SCHEDULED
    })).rejects.toThrow(UnprocessableError)
  })

  it('aceita status PATIENT_PRESENT quando a config permite', async () => {
    const config: ClinicCancellationConfig = {
      ...defaultConfig,
      cancellationAllowedStatuses: ['SCHEDULED', 'PATIENT_PRESENT'],
    }
    repo    = makeAppointmentRepo(makeAppointment({ status: 'PATIENT_PRESENT' }))
    useCase = new CancelAppointmentByPatientUseCase(repo)

    await expect(useCase.execute({ appointmentId: 'appt-1', patientId: 'patient-1', config }))
      .resolves.not.toThrow()
  })

  // ── Antecedência mínima ───────────────────────────────────────────────────

  it('lança UnprocessableError quando falta menos de 2h (config padrão = 2h mínimo)', async () => {
    // Agendamento em 1h — abaixo do mínimo de 2h
    const { scheduledDate, startTime } = futureDateTime(1)
    repo    = makeAppointmentRepo(makeAppointment({ scheduledDate, startTime }))
    useCase = new CancelAppointmentByPatientUseCase(repo)

    await expect(useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'patient-1',
      config:        defaultConfig,
    })).rejects.toThrow(UnprocessableError)
  })

  it('cancela quando a antecedência é exatamente igual ao mínimo exigido', async () => {
    // Agendamento em exatamente 2h + uma pequena margem (evita race condition do teste)
    const { scheduledDate, startTime } = futureDateTime(2.05)
    repo    = makeAppointmentRepo(makeAppointment({ scheduledDate, startTime }))
    useCase = new CancelAppointmentByPatientUseCase(repo)

    await expect(useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'patient-1',
      config:        defaultConfig,
    })).resolves.not.toThrow()
  })

  it('ignora restrição de antecedência quando cancellationMinHoursInAdvance = 0', async () => {
    const config: ClinicCancellationConfig = {
      ...defaultConfig,
      cancellationMinHoursInAdvance: 0,
    }
    // Agendamento em 10 minutos — passaria na regra de 2h, mas aqui a config é 0
    const { scheduledDate, startTime } = futureDateTime(0.17)
    repo    = makeAppointmentRepo(makeAppointment({ scheduledDate, startTime }))
    useCase = new CancelAppointmentByPatientUseCase(repo)

    await expect(useCase.execute({ appointmentId: 'appt-1', patientId: 'patient-1', config }))
      .resolves.not.toThrow()
  })

  // ── Mensagem de erro de antecedência contém horas restantes ──────────────

  it('mensagem de erro de antecedência menciona o tempo faltando', async () => {
    const { scheduledDate, startTime } = futureDateTime(0.5) // 30 min
    repo    = makeAppointmentRepo(makeAppointment({ scheduledDate, startTime }))
    useCase = new CancelAppointmentByPatientUseCase(repo)

    const err = await useCase.execute({
      appointmentId: 'appt-1',
      patientId:     'patient-1',
      config:        defaultConfig,
    }).catch((e: unknown) => e)

    expect((err as UnprocessableError).message).toMatch(/antecedência/i)
    expect((err as UnprocessableError).message).toMatch(/0\./)  // "0.X h" restantes
  })

  // ── DEFAULT_CANCELLATION_CONFIG ───────────────────────────────────────────

  it('DEFAULT_CANCELLATION_CONFIG tem cancellationAllowed=true, 2h de antecedência e status SCHEDULED', () => {
    expect(DEFAULT_CANCELLATION_CONFIG.cancellationAllowed).toBe(true)
    expect(DEFAULT_CANCELLATION_CONFIG.cancellationMinHoursInAdvance).toBe(2)
    expect(DEFAULT_CANCELLATION_CONFIG.cancellationAllowedStatuses).toContain('SCHEDULED')
  })
})
