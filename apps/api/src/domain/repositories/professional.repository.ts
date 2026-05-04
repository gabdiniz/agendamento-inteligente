// ─── Professional Repository ─────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfessionalRecord {
  id: string
  userId: string | null
  name: string
  specialty: string | null
  bio: string | null
  avatarUrl: string | null
  color: string | null
  birthDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProfessionalWithProcedures extends ProfessionalRecord {
  procedures: Array<{ id: string; name: string; durationMinutes: number; color: string | null }>
}

export interface CreateProfessionalData {
  name: string
  specialty?: string
  bio?: string
  color?: string
  userId?: string
  avatarUrl?: string | null
  birthDate?: string | null
}

export interface UpdateProfessionalData {
  name?: string
  specialty?: string | null
  bio?: string | null
  color?: string | null
  userId?: string | null
  avatarUrl?: string | null
  birthDate?: string | null
}

export interface ListProfessionalsParams {
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

export interface IProfessionalRepository {
  create(data: CreateProfessionalData): Promise<ProfessionalWithProcedures>
  findById(id: string): Promise<ProfessionalWithProcedures | null>
  list(params: ListProfessionalsParams): Promise<PaginatedResult<ProfessionalWithProcedures>>
  update(id: string, data: UpdateProfessionalData): Promise<ProfessionalWithProcedures>
  setActive(id: string, isActive: boolean): Promise<ProfessionalRecord>
  linkProcedures(professionalId: string, procedureIds: string[]): Promise<void>
  unlinkProcedure(professionalId: string, procedureId: string): Promise<void>
}
