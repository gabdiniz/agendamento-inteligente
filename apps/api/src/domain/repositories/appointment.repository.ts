import type { Appointment, AppointmentStatus } from '@myagendix/database'

// ─── Repository interface (abstração) ────────────────────────────────────
//
// Os use cases dependem desta interface, nunca da implementação concreta.
// A implementação concreta (Prisma) fica em infrastructure/database/.
// ─────────────────────────────────────────────────────────────────────────

export interface FindAvailableSlotsParams {
  professionalId: string
  procedureId: string
  date: string // ISO date YYYY-MM-DD
}

export interface AvailableSlot {
  startTime: string
  endTime: string
}

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>
  findByProfessionalAndDate(professionalId: string, date: string): Promise<Appointment[]>
  findByPatient(patientId: string): Promise<Appointment[]>
  findAvailableSlots(params: FindAvailableSlotsParams): Promise<AvailableSlot[]>
  create(data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment>
  updateStatus(id: string, status: AppointmentStatus, changedByUserId?: string): Promise<Appointment>
  cancel(id: string, reason: string | undefined, canceledBy: 'PATIENT' | 'STAFF'): Promise<Appointment>
}
