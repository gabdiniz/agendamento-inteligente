// ─── Appointment Repository ───────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// scheduledDate e "YYYY-MM-DD" no dominio.
// startTime / endTime sao "HH:MM" no dominio (mesmo padrao do WorkSchedule).
// updateStatus e cancel criam AppointmentStatusHistory em transacao.
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
  avatarUrl: string | null
}

export interface AppointmentProcedure {
  id: string
  name: string
  durationMinutes: number
  color: string | null
}

// ─── Avaliacao embutida no AppointmentRecord ──────────────────────────────────

export interface AppointmentEvaluationData {
  id: string
  quickRating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null
  quickRatingReasons: string[]
  rating: number | null
  comment: string | null
}

// ─── AppointmentRecord ────────────────────────────────────────────────────────

export interface AppointmentRecord {
  id: string
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string
  startTime: string
  endTime: string
  status: string
  cancellationReason: string | null
  canceledBy: string | null
  notes: string | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
  patient: AppointmentPatient
  professional: AppointmentProfessional
  procedure: AppointmentProcedure
  evaluation: AppointmentEvaluationData | null
}

// ─── AppointmentSlim ──────────────────────────────────────────────────────────

export interface AppointmentSlim {
  id: string
  startTime: string
  endTime: string
  status: string
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateAppointmentData {
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string
  startTime: string
  endTime: string
  notes?: string
  createdByUserId?: string
}

export interface ListAppointmentsParams {
  page: number
  limit: number
  professionalId?: string
  patientId?: string
  scheduledDate?: string
  startDate?: string
  endDate?: string
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
