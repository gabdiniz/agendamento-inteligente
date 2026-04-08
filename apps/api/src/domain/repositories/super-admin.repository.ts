// ─── Super Admin Repository ──────────────────────────────────────────────────
//
// Opera no schema `public`. Diferente do IUserRepository (tenant),
// o SuperAdmin não possui roles — é um modelo plano.
// ─────────────────────────────────────────────────────────────────────────────

export interface SuperAdminUser {
  id: string
  name: string
  email: string
  passwordHash: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ISuperAdminRepository {
  findByEmail(email: string): Promise<SuperAdminUser | null>
  findById(id: string): Promise<SuperAdminUser | null>
}
