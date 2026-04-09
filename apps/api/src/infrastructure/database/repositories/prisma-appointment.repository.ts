import type { PrismaClient } from '@prisma/client'

import type {
  IAppointmentRepository,
  AppointmentRecord,
  AppointmentSlim,
  CreateAppointmentData,
  ListAppointmentsParams,
  PaginatedAppointments,
} from '../../../domain/repositories/appointment.repository.js'

// ─── Time/Date helpers ────────────────────────────────────────────────────────

function timeStringToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`)
}

function dateToTimeString(date: Date): string {
  return date.toISOString().slice(11, 16)
}

function dateStringToDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function dateToDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ─── Prisma select ────────────────────────────────────────────────────────────

const appointmentSelect = {
  id: true,
  patientId: true,
  professionalId: true,
  procedureId: true,
  scheduledDate: true,
  startTime: true,
  endTime: true,
  status: true,
  cancellationReason: true,
  canceledBy: true,
  notes: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, name: true, phone: true } },
  professional: { select: { id: true, name: true, specialty: true } },
  procedure: { select: { id: true, name: true, durationMinutes: true, color: true } },
}

// ─── Raw row shape ─────────────────────────────────────────────────────────────

interface AppointmentRow {
  id: string
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: Date
  startTime: Date
  endTime: Date
  status: string
  cancellationReason: string | null
  canceledBy: string | null
  notes: string | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
  patient: { id: string; name: string; phone: string }
  professional: { id: string; name: string; specialty: string | null }
  procedure: { id: string; name: string; durationMinutes: number; color: string | null }
}

function toRecord(row: AppointmentRow): AppointmentRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    professionalId: row.professionalId,
    procedureId: row.procedureId,
    scheduledDate: dateToDateString(row.scheduledDate),
    startTime: dateToTimeString(row.startTime),
    endTime: dateToTimeString(row.endTime),
    status: row.status,
    cancellationReason: row.cancellationReason,
    canceledBy: row.canceledBy,
    notes: row.notes,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    patient: row.patient,
    professional: row.professional,
    procedure: row.procedure,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAppointmentData): Promise<AppointmentRecord> {
    const row = await this.prisma.appointment.create({
      data: {
        patientId: data.patientId,
        professionalId: data.professionalId,
        procedureId: data.procedureId,
        scheduledDate: dateStringToDate(data.scheduledDate),
        startTime: timeStringToDate(data.startTime),
        endTime: timeStringToDate(data.endTime),
        notes: data.notes ?? null,
        createdByUserId: data.createdByUserId ?? null,
        // cria a entrada inicial no histórico de status
        statusHistory: {
          create: {
            status: 'SCHEDULED',
            changedByUserId: data.createdByUserId ?? null,
          },
        },
      },
      select: appointmentSelect,
    })
    return toRecord(row as AppointmentRow)
  }

  async findById(id: string): Promise<AppointmentRecord | null> {
    const row = await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    })
    return row ? toRecord(row as AppointmentRow) : null
  }

  async list(params: ListAppointmentsParams): Promise<PaginatedAppointments> {
    const { page, limit, professionalId, patientId, scheduledDate, status } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (professionalId) where['professionalId'] = professionalId
    if (patientId) where['patientId'] = patientId
    if (status) where['status'] = status
    if (scheduledDate) where['scheduledDate'] = dateStringToDate(scheduledDate)

    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        // agenda do dia: ordenar por data + horário de início
        orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
        select: appointmentSelect,
      }),
      this.prisma.appointment.count({ where }),
    ])

    return {
      data: (rows as AppointmentRow[]).map(toRecord),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findByProfessionalAndDate(professionalId: string, date: string): Promise<AppointmentSlim[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        scheduledDate: dateStringToDate(date),
      },
      select: { id: true, startTime: true, endTime: true, status: true },
      orderBy: { startTime: 'asc' },
    })
    return rows.map((r: { id: string; startTime: unknown; endTime: unknown; status: unknown }) => ({
      id: r.id,
      startTime: dateToTimeString(r.startTime as Date),
      endTime: dateToTimeString(r.endTime as Date),
      status: r.status as string,
    }))
  }

  async updateStatus(
    id: string,
    status: string,
    changedByUserId?: string,
    notes?: string,
  ): Promise<AppointmentRecord> {
    // Atualiza status + cria histórico em transação
    const row = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: status as never,
        statusHistory: {
          create: {
            status: status as never,
            changedByUserId: changedByUserId ?? null,
            notes: notes ?? null,
          },
        },
      },
      select: appointmentSelect,
    })
    return toRecord(row as AppointmentRow)
  }

  async cancel(
    id: string,
    reason: string | undefined,
    canceledBy: 'PATIENT' | 'STAFF',
    changedByUserId?: string,
  ): Promise<AppointmentRecord> {
    const row = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELED',
        cancellationReason: reason ?? null,
        canceledBy: canceledBy as never,
        statusHistory: {
          create: {
            status: 'CANCELED',
            changedByUserId: changedByUserId ?? null,
            notes: reason ?? null,
          },
        },
      },
      select: appointmentSelect,
    })
    return toRecord(row as AppointmentRow)
  }
}
