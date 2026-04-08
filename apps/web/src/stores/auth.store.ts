import { create } from 'zustand'
import type { Role } from '@myagendix/shared'

interface AuthUser {
  id: string
  name: string
  email: string
  roles: Role[]
  tenantId: string
  tenantSlug: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}))
