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
  async list(params?: { page?: number; limit?: number }): Promise<PaginatedProfessionals> {
    const { data } = await apiClient.get('/professionals', { params })
    return data as PaginatedProfessionals
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
    return data as PaginatedPatients
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

export const appointmentsApi = {
  async list(params?: {
    page?: number
    limit?: number
    date?: string
    professionalId?: string
    status?: string
  }): Promise<PaginatedAppointments> {
    const { data } = await apiClient.get('/appointments', { params })
    return data as PaginatedAppointments
  },
}
