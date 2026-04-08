// ─── User Repository Interface ────────────────────────────────────────────
//
// Abstração do repositório de usuários (tenant-scoped).
// A implementação concreta (Prisma) fica em infrastructure/database/.
// ─────────────────────────────────────────────────────────────────────────

export interface UserWithRoles {
  id: string
  name: string
  email: string
  passwordHash: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  roles: { role: string }[]
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserWithRoles | null>
  findById(id: string): Promise<UserWithRoles | null>
}
