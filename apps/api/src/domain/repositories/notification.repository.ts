// ─── Notification Repository ──────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'WAITLIST_VACANCY'
  | 'CAMPAIGN'
  | 'RETENTION_SUGGESTION'
  | 'CUSTOM'

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL'

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ'

export interface NotificationRecord {
  id: string
  patientId: string | null
  userId: string | null
  type: NotificationType
  channel: NotificationChannel
  recipient: string        // e.g. email address or phone number
  content: string
  status: NotificationStatus
  appointmentId: string | null
  externalId: string | null
  sentAt: Date | null
  failedReason: string | null
  createdAt: Date
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateNotificationData {
  type: NotificationType
  channel: NotificationChannel
  recipient: string
  content: string
  patientId?: string
  userId?: string
  appointmentId?: string
}

export interface ListNotificationsParams {
  page: number
  limit: number
  status?: NotificationStatus
  type?: NotificationType
  channel?: NotificationChannel
  patientId?: string
  appointmentId?: string
}

export interface PaginatedNotifications {
  data: NotificationRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationRecord>
  findById(id: string): Promise<NotificationRecord | null>
  list(params: ListNotificationsParams): Promise<PaginatedNotifications>
  markSent(id: string, externalId?: string): Promise<NotificationRecord>
  markFailed(id: string, reason: string): Promise<NotificationRecord>
  markRead(id: string): Promise<NotificationRecord>
}
