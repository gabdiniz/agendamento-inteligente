import { create } from 'zustand'
import type { SuperAdminUser } from '@/lib/api/super-admin.api'
import { saTokens } from '@/lib/api/super-admin-client'

interface SuperAdminAuthStore {
  admin: SuperAdminUser | null
  isAuthenticated: boolean
  setAdmin: (admin: SuperAdminUser, accessToken: string, refreshToken: string) => void
  clearAdmin: () => void
}

export const useSuperAdminAuthStore = create<SuperAdminAuthStore>((set) => ({
  admin: null,
  isAuthenticated: Boolean(saTokens.getAccess()),

  setAdmin: (admin, accessToken, refreshToken) => {
    saTokens.set(accessToken, refreshToken)
    set({ admin, isAuthenticated: true })
  },

  clearAdmin: () => {
    saTokens.clear()
    set({ admin: null, isAuthenticated: false })
  },
}))
