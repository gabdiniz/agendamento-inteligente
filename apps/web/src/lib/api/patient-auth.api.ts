// ─── Patient Auth & Portal API ────────────────────────────────────────────────
//
// Todas as chamadas do portal do paciente.
// Usa `createPatientClient(slug)` — tokens armazenados por slug.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'
import { BASE_URL } from './client'
import { createPatientClient } from './patient-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatientUser {
  id: string
  name: string
  email: string
  phone: string | null
  birthDate: string | null
  gender: string | null
  city: string | null
  preferredContactChannel: string | null
}

export interface PatientMeResponse extends PatientUser {
  tenantName: string
  tenantLogoUrl: string | null
}

export interface PatientAuthTokens {
  accessToken: string
  refreshToken: string
  patient: PatientUser
  tenantSlug: string
}

export type QuickRating = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'

export interface PatientAppointmentEvaluation {
  id: string
  quickRating: QuickRating | null
  quickRatingReasons: string[]
  rating: number | null
  comment: string | null
}

export interface PatientAppointment {
  id: string
  scheduledDate: string
  startTime: string
  endTime: string
  status: string
  notes: string | null
  professional: { id: string; name: string; specialty: string | null; avatarUrl: string | null }
  procedure: { id: string; name: string; durationMinutes: number }
  evaluation: PatientAppointmentEvaluation | null
}

export interface PatientAppointmentListResult {
  data: PatientAppointment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Auth API (rotas públicas — sem token) ────────────────────────────────────

export const patientAuthApi = {
  async login(slug: string, email: string, password: string): Promise<PatientAuthTokens> {
    const { data } = await axios.post(
      `${BASE_URL}/t/${slug}/patient-auth/login`,
      { email, password },
    )
    return data.data as PatientAuthTokens
  },

  async forgotPassword(slug: string, email: string): Promise<void> {
    await axios.post(`${BASE_URL}/t/${slug}/patient-auth/forgot-password`, { email })
  },

  async resetPassword(slug: string, token: string, newPassword: string): Promise<void> {
    await axios.post(`${BASE_URL}/t/${slug}/patient-auth/reset-password`, { token, newPassword })
  },

  async logout(slug: string, refreshToken: string): Promise<void> {
    const client = createPatientClient(slug)
    await client.post('/patient-auth/logout', { refreshToken })
  },
}

// ─── Portal API (rotas autenticadas) ─────────────────────────────────────────

export const patientPortalApi = {
  async me(slug: string): Promise<PatientMeResponse> {
    const client = createPatientClient(slug)
    const { data } = await client.get('/patient-auth/me')
    return data.data as PatientMeResponse
  },

  async changePassword(slug: string, currentPassword: string, newPassword: string): Promise<void> {
    const client = createPatientClient(slug)
    await client.patch('/patient-auth/change-password', { currentPassword, newPassword })
  },

  async updateProfile(slug: string, updates: Partial<{
    name: string
    phone: string
    email: string
    birthDate: string
    gender: string
    city: string
  }>): Promise<PatientUser> {
    const client = createPatientClient(slug)
    const { data } = await client.patch('/patient/profile', updates)
    return data.data as PatientUser
  },

  async listAppointments(slug: string, params: {
    page?: number
    limit?: number
    status?: string
    upcoming?: boolean
  }): Promise<PatientAppointmentListResult> {
    const client = createPatientClient(slug)
    const { data } = await client.get('/patient/appointments', { params })
    return data.data as PatientAppointmentListResult
  },

  async getAppointment(slug: string, id: string): Promise<PatientAppointment> {
    const client = createPatientClient(slug)
    const { data } = await client.get(`/patient/appointments/${id}`)
    return data.data as PatientAppointment
  },

  async cancelAppointment(slug: string, id: string, reason?: string): Promise<PatientAppointment> {
    const client = createPatientClient(slug)
    const { data } = await client.post(`/patient/appointments/${id}/cancel`, { reason })
    return data.data as PatientAppointment
  },

  async submitQuickRating(
    slug: string,
    appointmentId: string,
    quickRating: QuickRating,
    reasons: string[] = [],
  ): Promise<PatientAppointmentEvaluation> {
    const client = createPatientClient(slug)
    const { data } = await client.post(`/patient/appointments/${appointmentId}/quick-rating`, {
      quickRating,
      reasons,
    })
    return data.data as PatientAppointmentEvaluation
  },
}
