// ─── Clinic API Functions ─────────────────────────────────────────────────────
//
// Todas as chamadas autenticadas do painel da clínica.
// Usa `apiClient` (client.ts) que injeta o JWT de tenant no header.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './client'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface ClinicUser {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  roles: string[]
  /** URL relativa da logo da clínica — ex: /uploads/logos/filename.png */
  tenantLogoUrl?: string | null
  /** Slugs das features do plano do tenant — ex: ['waitlist', 'whatsapp'] */
  tenantFeatures?: string[]
}

export interface ClinicAuthTokens {
  accessToken: string
  refreshToken: string
  user: ClinicUser
  tenantId: string
  tenantSlug: string
}

export const clinicAuthApi = {
  // Login usa slug explícito na URL — token ainda não está armazenado
  async login(slug: string, email: string, password: string): Promise<ClinicAuthTokens> {
    const { data } = await apiClient.post(`/t/${slug}/auth/login`, { email, password })
    return data.data as ClinicAuthTokens
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken })
  },

  async me(): Promise<ClinicUser> {
    const { data } = await apiClient.get('/auth/me')
    return data.data as ClinicUser
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.patch('/auth/password', { currentPassword, newPassword })
  },

  /** Envia e-mail de recuperação de senha (pública, usa slug na URL). */
  async forgotPassword(slug: string, email: string): Promise<void> {
    await apiClient.post(`/t/${slug}/auth/forgot-password`, { email })
  },

  /** Redefine a senha usando o token recebido por e-mail (pública). */
  async resetPassword(slug: string, token: string, newPassword: string): Promise<void> {
    await apiClient.post(`/t/${slug}/auth/reset-password`, { token, newPassword })
  },
}

// ─── Procedures ───────────────────────────────────────────────────────────────

export interface Procedure {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  priceCents: number | null  // em centavos; null = não informado
  color: string | null
  isActive: boolean
  createdAt: string
  professionalsCount?: number  // quantos profissionais executam este procedimento
}

export interface PaginatedProcedures {
  data: Procedure[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateProcedurePayload {
  name: string
  description?: string
  durationMinutes: number
  priceCents?: number
  color?: string
}

export interface UpdateProcedurePayload {
  name?: string
  description?: string | null
  durationMinutes?: number
  priceCents?: number | null
  color?: string | null
}

export const proceduresApi = {
  async list(params?: { page?: number; limit?: number; search?: string; isActive?: boolean }): Promise<PaginatedProcedures> {
    const { data } = await apiClient.get('/procedures', { params })
    return {
      data:       data.data            as Procedure[],
      total:      (data.meta?.total      ?? 0)  as number,
      page:       (data.meta?.page       ?? 1)  as number,
      limit:      (data.meta?.limit      ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1)  as number,
    }
  },

  async get(id: string): Promise<Procedure> {
    const { data } = await apiClient.get(`/procedures/${id}`)
    return data.data as Procedure
  },

  async create(payload: CreateProcedurePayload): Promise<Procedure> {
    const { data } = await apiClient.post('/procedures', payload)
    return data.data as Procedure
  },

  async update(id: string, payload: UpdateProcedurePayload): Promise<Procedure> {
    const { data } = await apiClient.patch(`/procedures/${id}`, payload)
    return data.data as Procedure
  },

  async activate(id: string): Promise<Procedure> {
    const { data } = await apiClient.patch(`/procedures/${id}/activate`)
    return data.data as Procedure
  },

  async deactivate(id: string): Promise<Procedure> {
    const { data } = await apiClient.patch(`/procedures/${id}/deactivate`)
    return data.data as Procedure
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/procedures/${id}`)
  },
}

// ─── Professionals ────────────────────────────────────────────────────────────

export interface Professional {
  id: string
  name: string
  specialty: string | null
  bio: string | null
  color: string | null
  isActive: boolean
  userId: string | null
  procedures: Pick<Procedure, 'id' | 'name' | 'durationMinutes' | 'priceCents' | 'color'>[]
}

export interface PaginatedProfessionals {
  data: Professional[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateProfessionalPayload {
  name: string
  specialty?: string
  bio?: string
  color?: string
}

export const professionalsApi = {
  async list(params?: { page?: number; limit?: number; isActive?: boolean }): Promise<PaginatedProfessionals> {
    const { data } = await apiClient.get('/professionals', { params })
    // Backend retorna { success, data: [...], meta: {total, page, limit, totalPages} }
    return {
      data: data.data as Professional[],
      total: (data.meta?.total ?? 0) as number,
      page: (data.meta?.page ?? 1) as number,
      limit: (data.meta?.limit ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1) as number,
    }
  },

  async get(id: string): Promise<Professional> {
    const { data } = await apiClient.get(`/professionals/${id}`)
    return data.data as Professional
  },

  async create(payload: CreateProfessionalPayload): Promise<Professional> {
    const { data } = await apiClient.post('/professionals', payload)
    return data.data as Professional
  },

  async update(id: string, payload: Partial<CreateProfessionalPayload>): Promise<Professional> {
    const { data } = await apiClient.patch(`/professionals/${id}`, payload)
    return data.data as Professional
  },

  async activate(id: string): Promise<Professional> {
    const { data } = await apiClient.patch(`/professionals/${id}/activate`)
    return data.data as Professional
  },

  async deactivate(id: string): Promise<Professional> {
    const { data } = await apiClient.patch(`/professionals/${id}/deactivate`)
    return data.data as Professional
  },

  /** Substitui todos os procedimentos vinculados ao profissional de uma vez */
  async linkProcedures(id: string, procedureIds: string[]): Promise<void> {
    await apiClient.post(`/professionals/${id}/procedures`, { procedureIds })
  },
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  name: string
  phone: string
  email: string | null
  birthDate: string | null
  gender: string | null
  city: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

export interface PaginatedPatients {
  data: Patient[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreatePatientPayload {
  name: string
  phone: string
  email?: string
  birthDate?: string
  gender?: string
  city?: string
  notes?: string
}

export const patientsApi = {
  async list(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }): Promise<PaginatedPatients> {
    const { data } = await apiClient.get('/patients', { params })
    // Backend retorna { success, data: [...], meta: {total, page, limit, totalPages} }
    return {
      data: data.data as Patient[],
      total: (data.meta?.total ?? 0) as number,
      page: (data.meta?.page ?? 1) as number,
      limit: (data.meta?.limit ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1) as number,
    }
  },

  async get(id: string): Promise<Patient> {
    const { data } = await apiClient.get(`/patients/${id}`)
    return data.data as Patient
  },

  async create(payload: CreatePatientPayload): Promise<Patient> {
    const { data } = await apiClient.post('/patients', payload)
    return data.data as Patient
  },

  async update(id: string, payload: Partial<CreatePatientPayload>): Promise<Patient> {
    const { data } = await apiClient.patch(`/patients/${id}`, payload)
    return data.data as Patient
  },

  async activate(id: string): Promise<Patient> {
    const { data } = await apiClient.patch(`/patients/${id}/activate`)
    return data.data as Patient
  },

  async deactivate(id: string): Promise<Patient> {
    const { data } = await apiClient.patch(`/patients/${id}/deactivate`)
    return data.data as Patient
  },
}

// ─── Appointments (dashboard summary) ────────────────────────────────────────

export interface Appointment {
  id: string
  scheduledDate: string
  startTime: string
  endTime: string
  status: string
  notes: string | null
  patient: { id: string; name: string; phone: string }
  professional: { id: string; name: string; color: string | null; specialty: string | null }
  procedure: { id: string; name: string; durationMinutes: number; color: string | null }
}

export interface PaginatedAppointments {
  data: Appointment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateAppointmentPayload {
  patientId: string
  professionalId: string
  procedureId: string
  scheduledDate: string
  startTime: string
  durationMinutes?: number  // sobrescreve a duração padrão do procedimento
  notes?: string
}

export interface UpdateAppointmentPayload {
  scheduledDate?: string
  startTime?: string
  notes?: string
}

export const appointmentsApi = {
  async list(params?: {
    page?: number
    limit?: number
    scheduledDate?: string    // dia exato — exclusivo com startDate/endDate
    startDate?: string        // início do intervalo "YYYY-MM-DD" (para calendário)
    endDate?: string          // fim do intervalo "YYYY-MM-DD"
    professionalId?: string
    patientId?: string
    status?: string
  }): Promise<PaginatedAppointments> {
    const { data } = await apiClient.get('/appointments', { params })
    return {
      data: data.data as Appointment[],
      total: (data.meta?.total ?? 0) as number,
      page: (data.meta?.page ?? 1) as number,
      limit: (data.meta?.limit ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1) as number,
    }
  },

  async get(id: string): Promise<Appointment> {
    const { data } = await apiClient.get(`/appointments/${id}`)
    return data.data as Appointment
  },

  async create(payload: CreateAppointmentPayload): Promise<Appointment> {
    const { data } = await apiClient.post('/appointments', payload)
    return data.data as Appointment
  },

  async update(id: string, payload: UpdateAppointmentPayload): Promise<Appointment> {
    const { data } = await apiClient.patch(`/appointments/${id}`, payload)
    return data.data as Appointment
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Appointment> {
    const { data } = await apiClient.patch(`/appointments/${id}/status`, { status, notes })
    return data.data as Appointment
  },

  async cancel(id: string, reason?: string): Promise<Appointment> {
    const { data } = await apiClient.post(`/appointments/${id}/cancel`, { reason })
    return data.data as Appointment
  },
}

// ─── Work Schedule ─────────────────────────────────────────────────────────────
// Horários de trabalho dos profissionais.
// dayOfWeek: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkScheduleRecord {
  id: string
  professionalId: string
  dayOfWeek: number
  startTime: string         // "HH:MM"
  endTime: string           // "HH:MM"
  slotIntervalMinutes: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertSchedulePayload {
  startTime: string         // "HH:MM"
  endTime: string           // "HH:MM"
  slotIntervalMinutes?: number
}

export const workScheduleApi = {
  /** Lista todos os dias cadastrados para um profissional */
  async list(professionalId: string): Promise<WorkScheduleRecord[]> {
    const { data } = await apiClient.get(`/professionals/${professionalId}/schedule`)
    return data.data as WorkScheduleRecord[]
  },

  /** Cria ou atualiza o horário de um dia específico */
  async upsert(professionalId: string, dayOfWeek: number, payload: UpsertSchedulePayload): Promise<WorkScheduleRecord> {
    const { data } = await apiClient.put(`/professionals/${professionalId}/schedule/${dayOfWeek}`, payload)
    return data.data as WorkScheduleRecord
  },

  /** Remove um dia do horário */
  async remove(professionalId: string, dayOfWeek: number): Promise<void> {
    await apiClient.delete(`/professionals/${professionalId}/schedule/${dayOfWeek}`)
  },

  /** Ativa um dia sem alterar os horários */
  async activate(professionalId: string, dayOfWeek: number): Promise<WorkScheduleRecord> {
    const { data } = await apiClient.patch(`/professionals/${professionalId}/schedule/${dayOfWeek}/activate`)
    return data.data as WorkScheduleRecord
  },

  /** Desativa um dia sem remover os horários */
  async deactivate(professionalId: string, dayOfWeek: number): Promise<WorkScheduleRecord> {
    const { data } = await apiClient.patch(`/professionals/${professionalId}/schedule/${dayOfWeek}/deactivate`)
    return data.data as WorkScheduleRecord
  },
}

// ─── Schedule Blocks ──────────────────────────────────────────────────────────
// Bloqueios pontuais na agenda (férias, feriados, indisponibilidades).
// ─────────────────────────────────────────────────────────────────────────────

export interface ScheduleBlock {
  id: string
  professionalId: string
  startDatetime: string   // ISO 8601 com timezone
  endDatetime: string     // ISO 8601 com timezone
  reason: string | null
  createdByUserId: string
  createdAt: string
}

export interface CreateScheduleBlockPayload {
  startDatetime: string
  endDatetime: string
  reason?: string
}

export const scheduleBlocksApi = {
  async list(professionalId: string, params?: { from?: string; until?: string }): Promise<ScheduleBlock[]> {
    const { data } = await apiClient.get(`/professionals/${professionalId}/schedule/blocks`, { params })
    return data.data as ScheduleBlock[]
  },

  async create(professionalId: string, payload: CreateScheduleBlockPayload): Promise<ScheduleBlock> {
    const { data } = await apiClient.post(`/professionals/${professionalId}/schedule/blocks`, payload)
    return data.data as ScheduleBlock
  },

  async remove(professionalId: string, blockId: string): Promise<void> {
    await apiClient.delete(`/professionals/${professionalId}/schedule/blocks/${blockId}`)
  },
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────
// Status: WAITING → NOTIFIED → CONFIRMED | EXPIRED | REMOVED
// ─────────────────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string
  patientId: string
  professionalId: string | null
  procedureId: string
  preferredDateFrom: string | null   // "YYYY-MM-DD"
  preferredDateTo: string | null     // "YYYY-MM-DD"
  minAdvanceMinutes: number
  status: 'WAITING' | 'NOTIFIED' | 'CONFIRMED' | 'EXPIRED' | 'REMOVED'
  notifiedAt: string | null
  confirmedAt: string | null
  expiresAt: string | null
  appointmentId: string | null
  createdAt: string
  updatedAt: string
  patient: { id: string; name: string; phone: string; email: string | null; preferredContactChannel: string | null }
  professional: { id: string; name: string } | null
  procedure: { id: string; name: string; durationMinutes: number }
}

export interface PaginatedWaitlist {
  data: WaitlistEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateWaitlistPayload {
  patientPhone: string
  patientName: string
  patientEmail?: string
  procedureId: string
  professionalId?: string
  preferredDateFrom?: string
  preferredDateTo?: string
  minAdvanceMinutes?: number
}

export const waitlistApi = {
  async list(params?: {
    page?: number
    limit?: number
    status?: string
    procedureId?: string
    professionalId?: string
    patientId?: string
  }): Promise<PaginatedWaitlist> {
    const { data } = await apiClient.get('/waitlist', { params })
    return {
      data:       data.data                  as WaitlistEntry[],
      total:      (data.meta?.total      ?? 0)  as number,
      page:       (data.meta?.page       ?? 1)  as number,
      limit:      (data.meta?.limit      ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1)  as number,
    }
  },

  async get(id: string): Promise<WaitlistEntry> {
    const { data } = await apiClient.get(`/waitlist/${id}`)
    return data.data as WaitlistEntry
  },

  async create(payload: CreateWaitlistPayload): Promise<WaitlistEntry> {
    const { data } = await apiClient.post('/waitlist', payload)
    return data.data as WaitlistEntry
  },

  /** Confirma a entrada e opcionalmente vincula a um agendamento */
  async confirm(id: string, appointmentId?: string): Promise<WaitlistEntry> {
    const { data } = await apiClient.patch(`/waitlist/${id}/confirm`, { appointmentId })
    return data.data as WaitlistEntry
  },

  /** Marca como expirada (paciente não respondeu à notificação) */
  async expire(id: string): Promise<WaitlistEntry> {
    const { data } = await apiClient.patch(`/waitlist/${id}/expire`)
    return data.data as WaitlistEntry
  },

  /** Remove da lista (desistência ou decisão da staff) */
  async remove(id: string): Promise<WaitlistEntry> {
    const { data } = await apiClient.patch(`/waitlist/${id}/remove`)
    return data.data as WaitlistEntry
  },

  /** Busca candidatos para uma vaga e dispara notificações */
  async checkVacancies(params: {
    procedureId: string
    professionalId?: string
    vacancyDate: string
    vacancyStartTime: string
  }): Promise<WaitlistEntry[]> {
    const { data } = await apiClient.post('/waitlist/check-vacancies', params)
    return data.data as WaitlistEntry[]
  },
}

// ─── Notifications ────────────────────────────────────────────────────────────
// Status:  PENDING → SENT | FAILED → (retry) → SENT | READ
// Canais:  WHATSAPP | SMS | EMAIL
// Tipos:   APPOINTMENT_CONFIRMATION | APPOINTMENT_REMINDER | WAITLIST_VACANCY |
//          CAMPAIGN | RETENTION_SUGGESTION | CUSTOM
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationStatus   = 'PENDING' | 'SENT' | 'FAILED' | 'READ'
export type NotificationChannel  = 'WHATSAPP' | 'SMS' | 'EMAIL'
export type NotificationType     =
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'WAITLIST_VACANCY'
  | 'CAMPAIGN'
  | 'RETENTION_SUGGESTION'
  | 'CUSTOM'

export interface NotificationRecord {
  id: string
  patientId: string | null
  userId: string | null
  type: NotificationType
  channel: NotificationChannel
  recipient: string
  content: string
  status: NotificationStatus
  appointmentId: string | null
  externalId: string | null
  sentAt: string | null
  failedReason: string | null
  createdAt: string
}

export interface PaginatedNotifications {
  data: NotificationRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SendNotificationPayload {
  type: NotificationType
  channel: NotificationChannel
  recipient: string
  content: string
  subject?: string       // somente EMAIL
  htmlContent?: string   // somente EMAIL
  patientId?: string
  appointmentId?: string
}

export const notificationsApi = {
  async list(params?: {
    page?: number
    limit?: number
    status?: NotificationStatus
    type?: NotificationType
    channel?: NotificationChannel
    patientId?: string
    appointmentId?: string
  }): Promise<PaginatedNotifications> {
    const { data } = await apiClient.get('/notifications', { params })
    return {
      data:       data.data                  as NotificationRecord[],
      total:      (data.meta?.total      ?? 0)  as number,
      page:       (data.meta?.page       ?? 1)  as number,
      limit:      (data.meta?.limit      ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1)  as number,
    }
  },

  async send(payload: SendNotificationPayload): Promise<NotificationRecord> {
    const { data } = await apiClient.post('/notifications', payload)
    return data.data as NotificationRecord
  },

  async retry(id: string): Promise<NotificationRecord> {
    const { data } = await apiClient.post(`/notifications/${id}/retry`)
    return data.data as NotificationRecord
  },

  async markRead(id: string): Promise<NotificationRecord> {
    const { data } = await apiClient.patch(`/notifications/${id}/read`)
    return data.data as NotificationRecord
  },
}

// ─── Users (Gestão de usuários da clínica) ───────────────────────────────────

export type UserRole = 'GESTOR' | 'RECEPCAO' | 'PROFISSIONAL'

export interface ClinicUserRecord {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  roles: { role: UserRole }[]
  professional: { id: string; name: string; specialty: string | null } | null
}

export interface PaginatedUsers {
  data: ClinicUserRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  phone?: string
  role: UserRole
  professionalId?: string
}

export interface UpdateUserPayload {
  name?: string
  phone?: string | null
}

export const usersApi = {
  async list(params?: { page?: number; limit?: number; search?: string; isActive?: boolean }): Promise<PaginatedUsers> {
    const { data } = await apiClient.get('/users', { params })
    return {
      data:       data.data                  as ClinicUserRecord[],
      total:      (data.meta?.total      ?? 0)  as number,
      page:       (data.meta?.page       ?? 1)  as number,
      limit:      (data.meta?.limit      ?? 20) as number,
      totalPages: (data.meta?.totalPages ?? 1)  as number,
    }
  },

  async get(id: string): Promise<ClinicUserRecord> {
    const { data } = await apiClient.get(`/users/${id}`)
    return data.data as ClinicUserRecord
  },

  async create(payload: CreateUserPayload): Promise<ClinicUserRecord> {
    const { data } = await apiClient.post('/users', payload)
    return data.data as ClinicUserRecord
  },

  async update(id: string, payload: UpdateUserPayload): Promise<ClinicUserRecord> {
    const { data } = await apiClient.patch(`/users/${id}`, payload)
    return data.data as ClinicUserRecord
  },

  async activate(id: string): Promise<ClinicUserRecord> {
    const { data } = await apiClient.patch(`/users/${id}/activate`)
    return data.data as ClinicUserRecord
  },

  async deactivate(id: string): Promise<ClinicUserRecord> {
    const { data } = await apiClient.patch(`/users/${id}/deactivate`)
    return data.data as ClinicUserRecord
  },
}


// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export interface WhatsappConfig {
  whatsappEnabled: boolean
  zApiInstanceId: string | null
  zApiToken: string | null
  reminderHoursBefore: number
  hasCredentials: boolean
}

export interface WhatsappTemplate {
  id: string | null
  event: 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION' | 'RESCHEDULE'
  body: string
  isActive: boolean
}

export interface WhatsappJob {
  id: string
  event: 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION' | 'RESCHEDULE'
  phone: string
  message: string
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED'
  retries: number
  scheduledAt: string
  sentAt: string | null
  errorLog: string | null
  appointmentId: string
  patientName: string
  createdAt: string
}

export const whatsappApi = {
  async getConfig(): Promise<WhatsappConfig> {
    const { data } = await apiClient.get('/whatsapp/config')
    return data.data as WhatsappConfig
  },

  async saveConfig(payload: Partial<WhatsappConfig> & { zApiInstanceId?: string | null; zApiToken?: string | null }): Promise<void> {
    await apiClient.put('/whatsapp/config', payload)
  },

  async getTemplates(): Promise<WhatsappTemplate[]> {
    const { data } = await apiClient.get('/whatsapp/templates')
    return data.data as WhatsappTemplate[]
  },

  async saveTemplate(event: string, body: string, isActive?: boolean): Promise<WhatsappTemplate> {
    const { data } = await apiClient.put(`/whatsapp/templates/${event}`, { body, isActive })
    return data.data as WhatsappTemplate
  },

  async test(phone: string, message?: string): Promise<void> {
    await apiClient.post('/whatsapp/test', { phone, message })
  },

  async listJobs(params?: { status?: string; event?: string; page?: number; limit?: number }): Promise<{
    data: WhatsappJob[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const { data } = await apiClient.get('/whatsapp/jobs', { params })
    return { data: data.data, meta: data.meta }
  },
}
