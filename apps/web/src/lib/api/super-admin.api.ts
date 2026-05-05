// ─── Super Admin API Functions ────────────────────────────────────────────────

import { saClient } from './super-admin-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuperAdminUser {
  id: string
  name: string
  email: string
  scope: 'super-admin'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: SuperAdminUser
}

export interface PlanInfo {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface Feature {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  isActive: boolean
}

export interface Plan extends PlanInfo {
  isActive: boolean
  createdAt: string
  tenantCount: number
  features: Feature[]
}

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  address: string | null
  logoUrl: string | null
  bannerUrl: string | null
  colorPrimary:   string | null
  colorSecondary: string | null
  colorSidebar:   string | null
  isActive: boolean
  planType: string       // deprecated
  planId: string | null
  plan: PlanInfo | null
  createdAt: string
}

export interface PaginatedTenants {
  data: Tenant[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateTenantPayload {
  name: string
  slug: string
  email: string
  phone?: string
  address?: string
  planId?: string
  logoUrl?: string | null
  bannerUrl?: string | null
  colorPrimary?:   string | null
  colorSecondary?: string | null
  colorSidebar?:   string | null
  gestor: {
    name: string
    email: string
    password: string
    phone?: string
  }
}

export interface UpdateTenantPayload {
  name?: string
  email?: string
  phone?: string | null
  address?: string | null
  planId?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  colorPrimary?:   string | null
  colorSecondary?: string | null
  colorSidebar?:   string | null
}

export interface UploadLogoResult {
  url: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const superAdminApi = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await saClient.post('/super-admin/auth/login', { email, password })
    return data.data as AuthTokens
  },

  async logout(refreshToken: string): Promise<void> {
    await saClient.post('/super-admin/auth/logout', { refreshToken })
  },

  async me(): Promise<SuperAdminUser> {
    const { data } = await saClient.get('/super-admin/auth/me')
    return data.data as SuperAdminUser
  },

  // ─── Tenants ──────────────────────────────────────────────────────────────

  async listTenants(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }): Promise<PaginatedTenants> {
    const { data } = await saClient.get('/super-admin/tenants', { params })
    return data as PaginatedTenants
  },

  async getTenant(id: string): Promise<Tenant> {
    const { data } = await saClient.get(`/super-admin/tenants/${id}`)
    return data.data as Tenant
  },

  async createTenant(payload: CreateTenantPayload): Promise<Tenant> {
    const { data } = await saClient.post('/super-admin/tenants', payload)
    return data.data as Tenant
  },

  async activateTenant(id: string): Promise<Tenant> {
    const { data } = await saClient.patch(`/super-admin/tenants/${id}/activate`)
    return data.data as Tenant
  },

  async deactivateTenant(id: string): Promise<Tenant> {
    const { data } = await saClient.patch(`/super-admin/tenants/${id}/deactivate`)
    return data.data as Tenant
  },

  async updateTenant(id: string, payload: UpdateTenantPayload): Promise<Tenant> {
    const { data } = await saClient.patch(`/super-admin/tenants/${id}`, payload)
    return data.data as Tenant
  },

  async deleteTenant(id: string): Promise<void> {
    await saClient.delete(`/super-admin/tenants/${id}`)
  },

  async assignPlan(tenantId: string, planId: string): Promise<void> {
    await saClient.patch(`/super-admin/tenants/${tenantId}/plan`, { planId })
  },

  // ─── Plans ────────────────────────────────────────────────────────────────

  async listPlans(): Promise<Plan[]> {
    const { data } = await saClient.get('/super-admin/plans')
    return data.data as Plan[]
  },

  async getPlan(id: string): Promise<Plan> {
    const { data } = await saClient.get(`/super-admin/plans/${id}`)
    return data.data as Plan
  },

  async createPlan(payload: { name: string; slug: string; description?: string }): Promise<Plan> {
    const { data } = await saClient.post('/super-admin/plans', payload)
    return data.data as Plan
  },

  async updatePlan(id: string, payload: { name?: string; description?: string; isActive?: boolean }): Promise<Plan> {
    const { data } = await saClient.patch(`/super-admin/plans/${id}`, payload)
    return data.data as Plan
  },

  async deletePlan(id: string): Promise<void> {
    await saClient.delete(`/super-admin/plans/${id}`)
  },

  async setPlanFeatures(planId: string, featureSlugs: string[]): Promise<Feature[]> {
    const { data } = await saClient.put(`/super-admin/plans/${planId}/features`, { featureSlugs })
    return data.data as Feature[]
  },

  // ─── Features ─────────────────────────────────────────────────────────────

  async listFeatures(): Promise<Feature[]> {
    const { data } = await saClient.get('/super-admin/features')
    return data.data as Feature[]
  },

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadLogo(file: File): Promise<UploadLogoResult> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await saClient.post('/super-admin/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data as UploadLogoResult
  },

  async uploadBanner(file: File): Promise<UploadLogoResult> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await saClient.post('/super-admin/upload/banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data as UploadLogoResult
  },
}
