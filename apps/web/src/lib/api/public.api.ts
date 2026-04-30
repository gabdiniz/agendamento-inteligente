// ─── Public Booking API ───────────────────────────────────────────────────────
//
// Chamadas sem autenticação — usadas na página pública de agendamento.
// URLs: /t/:slug/public/*
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'

// Cliente sem interceptors de auth — rotas públicas
const publicClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicProcedure {
  id: string
  name: string
  durationMinutes: number
  priceCents: number | null
  preparationInstructions: string | null
  color: string | null
}

export interface PublicProfessional {
  id: string
  name: string
  specialty: string | null
  bio: string | null
  avatarUrl: string | null
  color: string
  procedures: PublicProcedure[]
}

export interface ClinicInfo {
  name: string
  address: string | null
  logoUrl: string | null
  bannerUrl: string | null
  colorPrimary:   string | null
  colorSecondary: string | null
  colorSidebar:   string | null
}

export interface TimeSlot {
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
}

export interface BookingPayload {
  patientName: string
  patientPhone: string
  patientEmail?: string
  professionalId: string
  procedureId: string
  scheduledDate: string // "YYYY-MM-DD"
  startTime: string     // "HH:MM"
}

export interface WaitlistPayload {
  patientPhone: string
  patientName: string
  professionalId?: string
  procedureId: string
  preferredDateFrom?: string
  preferredDateTo?: string
}

export interface BookingResult {
  id: string
  scheduledDate: string
  startTime: string
  endTime: string
  status: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const publicApi = {
  /** Lista profissionais ativos com seus procedimentos ativos */
  async getProfessionals(slug: string): Promise<PublicProfessional[]> {
    const { data } = await publicClient.get(`/t/${slug}/public/professionals`)
    return data.data as PublicProfessional[]
  },

  /** Retorna horários disponíveis para profissional + procedimento + data */
  async getSlots(
    slug: string,
    professionalId: string,
    procedureId: string,
    date: string,
  ): Promise<TimeSlot[]> {
    const { data } = await publicClient.get(`/t/${slug}/public/slots`, {
      params: { professionalId, procedureId, date },
    })
    // O backend retorna { success, data: { date, professional, procedure, slots: [...] } }
    // Precisamos extrair o array slots do objeto, não o objeto inteiro
    return (data.data?.slots ?? []) as TimeSlot[]
  },

  /** Cria o agendamento */
  async book(slug: string, payload: BookingPayload): Promise<BookingResult> {
    const { data } = await publicClient.post(`/t/${slug}/public/book`, payload)
    return data.data as BookingResult
  },

  /** Entra na lista de espera */
  async joinWaitlist(slug: string, payload: WaitlistPayload): Promise<void> {
    await publicClient.post(`/t/${slug}/public/waitlist`, payload)
  },

  /** Retorna informações públicas da clínica (nome, endereço, logo) */
  async getClinicInfo(slug: string): Promise<ClinicInfo> {
    const { data } = await publicClient.get(`/t/${slug}/public/clinic-info`)
    return data.data as ClinicInfo
  },
}
