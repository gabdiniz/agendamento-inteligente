// ─── User Repository Interface ────────────────────────────────────────────────
//
// Abstração do repositório de usuários (tenant-scoped).
// A implementação concreta (Prisma) fica em infrastructure/database/.
// ─────────────────────────────────────────────────────────────────────────────

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

export interface UserPublic {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  roles: { role: string }[]
  professional: { id: string; name: string; specialty: string | null } | null
}

export interface ListUsersParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export interface PaginatedUsers {
  data: UserPublic[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateUserData {
  name: string
  email: string
  passwordHash: string
  phone?: string
  role: 'GESTOR' | 'RECEPCAO' | 'PROFISSIONAL'
  /** ID de um Professional já existente para vincular a este usuário */
  professionalId?: string
}

export interface UpdateUserData {
  name?: string
  phone?: string | null
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserWithRoles | null>
  findById(id: string): Promise<UserWithRoles | null>
  findPublicById(id: string): Promise<UserPublic | null>
  updatePassword(id: string, passwordHash: string): Promise<void>
  list(params: ListUsersParams): Promise<PaginatedUsers>
  create(data: CreateUserData): Promise<UserPublic>
  update(id: string, data: UpdateUserData): Promise<UserPublic>
  setActive(id: string, isActive: boolean): Promise<UserPublic>
}
