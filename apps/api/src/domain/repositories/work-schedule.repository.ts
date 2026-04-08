// ─── Work Schedule Repository ────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// Times são representados como strings "HH:MM" no domínio.
// A conversão para DateTime @db.Time ocorre no repositório.
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkScheduleRecord {
  id: string
  professionalId: string
  dayOfWeek: number     // 0=Dom, 1=Seg, ..., 6=Sab
  startTime: string     // "HH:MM"
  endTime: string       // "HH:MM"
  slotIntervalMinutes: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UpsertWorkScheduleData {
  professionalId: string
  dayOfWeek: number
  startTime: string     // "HH:MM"
  endTime: string       // "HH:MM"
  slotIntervalMinutes?: number
}

export interface IWorkScheduleRepository {
  upsert(data: UpsertWorkScheduleData): Promise<WorkScheduleRecord>
  findByProfessional(professionalId: string): Promise<WorkScheduleRecord[]>
  deleteByDay(professionalId: string, dayOfWeek: number): Promise<void>
  setActive(professionalId: string, dayOfWeek: number, isActive: boolean): Promise<WorkScheduleRecord>
}
