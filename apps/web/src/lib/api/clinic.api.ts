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
  professional: { id: string; name: string; color: string | null }
  procedure: { id: string; name: string; durationMinutes: number }
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
    scheduledDate?: string
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
