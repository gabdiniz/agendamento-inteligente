import type { PrismaClient } from '@prisma/client'

import type {
  IWorkScheduleRepository,
  WorkScheduleRecord,
  UpsertWorkScheduleData,
} from '../../../domain/repositories/work-schedule.repository.js'

// ─── Time helpers ─────────────────────────────────────────────────────────────
// Prisma maps @db.Time to a DateTime anchored at 1970-01-01T00:00:00Z.
// We convert "HH:MM" → Date for persistence, and Date → "HH:MM" for the domain.
// Same strategy used in the tenant seed.
// ─────────────────────────────────────────────────────────────────────────────

function timeStringToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`)
}

function dateToTimeString(date: Date): string {
  return date.toISOString().slice(11, 16) // "HH:MM"
}

// ─── Raw row shape returned by Prisma ────────────────────────────────────────
interface WorkScheduleRow {
  id: string
  professionalId: string
  dayOfWeek: number
  startTime: Date
  endTime: Date
  slotIntervalMinutes: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function toRecord(row: WorkScheduleRow): WorkScheduleRecord {
  return {
    id: row.id,
    professionalId: row.professionalId,
    dayOfWeek: row.dayOfWeek,
    startTime: dateToTimeString(row.startTime),
    endTime: dateToTimeString(row.endTime),
    slotIntervalMinutes: row.slotIntervalMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaWorkScheduleRepository implements IWorkScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: UpsertWorkScheduleData): Promise<WorkScheduleRecord> {
    const row = await this.prisma.workSchedule.upsert({
      where: {
        professionalId_dayOfWeek: {
          professionalId: data.professionalId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      update: {
        startTime: timeStringToDate(data.startTime),
        endTime: timeStringToDate(data.endTime),
        ...(data.slotIntervalMinutes !== undefined && { slotIntervalMinutes: data.slotIntervalMinutes }),
        isActive: true, // reactivate if previously deactivated
      },
      create: {
        professionalId: data.professionalId,
        dayOfWeek: data.dayOfWeek,
        startTime: timeStringToDate(data.startTime),
        endTime: timeStringToDate(data.endTime),
        slotIntervalMinutes: data.slotIntervalMinutes ?? 30,
      },
    })
    return toRecord(row as WorkScheduleRow)
  }

  async findByProfessional(professionalId: string): Promise<WorkScheduleRecord[]> {
    const rows = await this.prisma.workSchedule.findMany({
      where: { professionalId },
      orderBy: { dayOfWeek: 'asc' },
    })
    return (rows as WorkScheduleRow[]).map(toRecord)
  }

  async deleteByDay(professionalId: string, dayOfWeek: number): Promise<void> {
    await this.prisma.workSchedule.deleteMany({
      where: { professionalId, dayOfWeek },
    })
  }

  async setActive(professionalId: string, dayOfWeek: number, isActive: boolean): Promise<WorkScheduleRecord> {
    const row = await this.prisma.workSchedule.update({
      where: {
        professionalId_dayOfWeek: {
          professionalId,
          dayOfWeek,
        },
      },
      data: { isActive },
    })
    return toRecord(row as WorkScheduleRow)
  }
}
