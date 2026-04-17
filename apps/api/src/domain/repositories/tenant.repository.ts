// ─── Tenant Repository ──────────────────────────────────────────────────────
//
// Opera no schema `public`. Gerencia registros de tenants (clínicas).
// Usado exclusivamente pelo Super Admin (tenant management).
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantRecord {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  logoUrl: string | null
  address: string | null
  planType: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateTenantData {
  name: string
  slug: string
  email: string
  phone?: string
  address?: string
  planType?: string
  logoUrl?: string | null
}

export interface UpdateTenantData {
  name?: string
  email?: string
  phone?: string | null
  address?: string | null
  planType?: string
  logoUrl?: string | null
}

export interface ListTenantsParams {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ITenantRepository {
  create(data: CreateTenantData): Promise<TenantRecord>

  findById(id: string): Promise<TenantRecord | null>

  findBySlug(slug: string): Promise<TenantRecord | null>

  list(params: ListTenantsParams): Promise<PaginatedResult<TenantRecord>>

  update(id: string, data: UpdateTenantData): Promise<TenantRecord>

  setActive(id: string, isActive: boolean): Promise<TenantRecord>

  delete(id: string): Promise<void>
}
