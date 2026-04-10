// ─── Clinic Auth Store ────────────────────────────────────────────────────────

import { create } from 'zustand'
import { clinicTokens } from '@/lib/api/client'
import type { ClinicUser } from '@/lib/api/clinic.api'

interface AuthStore {
  user: ClinicUser | null
  tenantSlug: string | null
  isAuthenticated: boolean
  setUser: (user: ClinicUser, accessToken: string, refreshToken: string, slug: string) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  tenantSlug: clinicTokens.getSlug(),
  isAuthenticated: Boolean(clinicTokens.getAccess()),

  setUser: (user, accessToken, refreshToken, slug) => {
    clinicTokens.set(accessToken, refreshToken, slug)
    set({ user, tenantSlug: slug, isAuthenticated: true })
  },

  clearUser: () => {
    clinicTokens.clear()
    set({ user: null, tenantSlug: null, isAuthenticated: false })
  },
}))
