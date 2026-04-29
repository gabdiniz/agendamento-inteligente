// ─── Appointment Evaluation Repository ───────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// Separa a lógica de avaliação do repositório de agendamentos para manter
// responsabilidades coesas.
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentEvaluationRecord {
  id: string
  appointmentId: string
  patientId: string
  professionalId: string
  quickRating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null
  quickRatingReasons: string[]
  rating: number | null
  comment: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface UpsertQuickRatingData {
  appointmentId: string
  patientId: string
  professionalId: string
  quickRating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  reasons: string[]
}

export interface UpsertDetailedRatingData {
  appointmentId: string
  patientId: string
  professionalId: string
  rating: number    // 1–5
  comment?: string
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface IAppointmentEvaluationRepository {
  upsertQuickRating(data: UpsertQuickRatingData): Promise<AppointmentEvaluationRecord>
  upsertDetailedRating(data: UpsertDetailedRatingData): Promise<AppointmentEvaluationRecord>
  findByAppointmentId(appointmentId: string): Promise<AppointmentEvaluationRecord | null>
}
