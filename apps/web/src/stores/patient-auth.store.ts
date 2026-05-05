// ─── Patient Auth Store ───────────────────────────────────────────────────────
//
// Estado de autenticação do paciente no portal.
// Tokens são armazenados por slug (ver patientTokens em patient-client.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { patientTokens } from '@/lib/api/patient-client'
import type { PatientUser } from '@/lib/api/patient-auth.api'

interface PatientAuthStore {
  patient: PatientUser | null
  tenantSlug: string | null
  tenantName: string | null
  tenantLogoUrl: string | null
  isAuthenticated: (slug: string) => boolean

  setPatient: (
    patient: PatientUser,
    accessToken: string,
    refreshToken: string,
    slug: string,
    tenantName?: string,
    tenantLogoUrl?: string | null,
  ) => void

  /** Atualiza só os dados do paciente sem tocar nos tokens de autenticação */
  updatePatient: (updates: Partial<PatientUser>) => void

  clearPatient: (slug: string) => void
}

export const usePatientAuthStore = create<PatientAuthStore>((set, get) => ({
  patient: null,
  tenantSlug: null,
  tenantName: null,
  tenantLogoUrl: null,

  isAuthenticated: (slug: string) => patientTokens.isAuthenticated(slug),

  setPatient: (patient, accessToken, refreshToken, slug, tenantName, tenantLogoUrl) => {
    patientTokens.set(slug, accessToken, refreshToken)
    set({
      patient,
      tenantSlug: slug,
      tenantName: tenantName ?? null,
      tenantLogoUrl: tenantLogoUrl ?? null,
    })
  },

  updatePatient: (updates) => {
    set((state) => ({
      patient: state.patient ? { ...state.patient, ...updates } : null,
    }))
  },

  clearPatient: (slug: string) => {
    patientTokens.clear(slug)
    // Só limpa o estado se ainda for o mesmo tenant
    if (get().tenantSlug === slug) {
      set({ patient: null, tenantSlug: null, tenantName: null, tenantLogoUrl: null })
    }
  },
}))
