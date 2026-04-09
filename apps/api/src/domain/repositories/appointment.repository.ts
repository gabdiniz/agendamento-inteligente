// ─── Appointment Repository ───────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// scheduledDate é "YYYY-MM-DD" no domínio.
// startTime / endTime são "HH:MM" no domínio (mesmo padrão do WorkSchedule).
// updateStatus e cancel criam AppointmentStatusHistory em transação.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Tipos de relacionamento embutidos (read model) ───────────────────────────

export interface AppointmentPatient {
  id: string
  name: string
  phone: string
}

export interface AppointmentProfessional {
  id: string
  name: string
  specialty: string | null
}

export interface AppointmentProcedure {
  id: string
  name: string
  durationMinutes: number
  color: string | null
}

// ─── AppointmentRecord — modelo de leitura com relações embutidas ─────────────

export interface AppointmentRecord {
  id: string
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string         // "YYYY-MM-DD"
  startTime: string             // "HH:MM"
  endTime: string               // "HH:MM"
  status: string                // SCHEDULED | PATIENT_PRESENT | IN_PROGRESS | COMPLETED | CANCELED
  cancellationReason: string | null
  canceledBy: string | null     // PATIENT | STAFF
  notes: string | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
  patient: AppointmentPatient
  professional: AppointmentProfessional
  procedure: AppointmentProcedure
}

// ─── Modelo de leitura simples (sem relações) — usado para collision check ────

export interface AppointmentSlim {
  id: string
  startTime: string  // "HH:MM"
  endTime: string    // "HH:MM"
  status: string
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateAppointmentData {
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string    // "YYYY-MM-DD"
  startTime: string        // "HH:MM"
  endTime: string          // "HH:MM" — calculado pelo use case
  notes?: string
  createdByUserId?: string
}

export interface ListAppointmentsParams {
  page: number
  limit: number
  professionalId?: string
  patientId?: string
  scheduledDate?: string   // "YYYY-MM-DD" — filtra exato
  status?: string
}

export interface PaginatedAppointments {
  data: AppointmentRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface IAppointmentRepository {
  create(data: CreateAppointmentData): Promise<AppointmentRecord>
  findById(id: string): Promise<AppointmentRecord | null>
  list(params: ListAppointmentsParams): Promise<PaginatedAppointments>
  findByProfessionalAndDate(professionalId: string, date: string): Promise<AppointmentSlim[]>
  updateStatus(
    id: string,
    status: string,
    changedByUserId?: string,
    notes?: string,
  ): Promise<AppointmentRecord>
  cancel(
    id: string,
    reason: string | undefined,
    canceledBy: 'PATIENT' | 'STAFF',
    changedByUserId?: string,
  ): Promise<AppointmentRecord>
}
