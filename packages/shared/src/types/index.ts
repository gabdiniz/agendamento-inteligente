// ─── Roles ─────────────────────────────────────────────────────────────────

export type Role = 'GESTOR' | 'PROFISSIONAL' | 'RECEPCAO'

export type PlanType = 'BASIC' | 'PRO'

// ─── Appointment ───────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'PATIENT_PRESENT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED'

export type CanceledBy = 'PATIENT' | 'STAFF'

// ─── Waitlist ──────────────────────────────────────────────────────────────

export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'CONFIRMED' | 'EXPIRED' | 'REMOVED'

// ─── Notifications ─────────────────────────────────────────────────────────

export type NotificationType =
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'WAITLIST_VACANCY'
  | 'CAMPAIGN'
  | 'RETENTION_SUGGESTION'
  | 'CUSTOM'

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL'

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ'

// ─── Patient ───────────────────────────────────────────────────────────────

export type PatientSource = 'MANUAL' | 'PUBLIC_PAGE' | 'INVITE'

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── API Response ──────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  message?: string
}

export interface ApiError {
  success: false
  error: string
  details?: Record<string, string[]>
}
