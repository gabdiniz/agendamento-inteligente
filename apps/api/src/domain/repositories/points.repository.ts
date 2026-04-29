// ─── IPointsRepository ───────────────────────────────────────────────────────
//
// Abstração de acesso a dados para pontos de fidelidade.
// Opera no schema do tenant.
// ─────────────────────────────────────────────────────────────────────────────

export type PointsReason =
  | 'APPOINTMENT_COMPLETED'
  | 'FIRST_APPOINTMENT'
  | 'QUICK_RATING_SUBMITTED'

export type PatientTier = 'BRONZE' | 'SILVER' | 'GOLD'

export interface PointsTransactionRecord {
  id:            string
  patientId:     string
  points:        number
  reason:        PointsReason
  appointmentId: string | null
  createdAt:     Date
}

export interface PatientLoyaltyStats {
  loyaltyPoints:      number
  lifetimePoints:     number
  tier:               PatientTier
  // Métricas de visita (do PatientCrmMetrics)
  totalAppointments:  number
  lastAppointmentAt:  string | null  // ISO date string ou null
  cancellationCount:  number
}

export interface AwardPointsData {
  patientId:     string
  reason:        PointsReason
  points:        number
  appointmentId?: string
}

export interface IPointsRepository {
  /** Conta quantos agendamentos COMPLETED o paciente tem */
  countCompletedAppointments(patientId: string): Promise<number>

  /**
   * Verifica se o paciente já recebeu pontos pelo motivo QUICK_RATING_SUBMITTED
   * neste agendamento — evita dupla concessão no upsert de avaliação.
   */
  hasRatingPoints(patientId: string, appointmentId: string): Promise<boolean>

  /**
   * Cria a transação de pontos e atualiza PatientCrmMetrics atomicamente.
   * Recalcula o tier com base em lifetimePoints.
   */
  award(data: AwardPointsData): Promise<PointsTransactionRecord>

  /** Retorna pontos e tier atuais do paciente */
  getLoyaltyStats(patientId: string): Promise<PatientLoyaltyStats>
}
