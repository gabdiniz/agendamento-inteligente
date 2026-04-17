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

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  address: string | null
  logoUrl: string | null
  isActive: boolean
  planType: string
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
  planType?: 'BASIC' | 'PRO'
  logoUrl?: string | null
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
  planType?: 'BASIC' | 'PRO'
  logoUrl?: string | null
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

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadLogo(file: File): Promise<UploadLogoResult> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await saClient.post('/super-admin/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data as UploadLogoResult
  },
}
