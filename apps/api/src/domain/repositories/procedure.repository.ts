// ─── Procedure Repository ────────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcedureRecord {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  priceCents: number | null  // preço em centavos; null = não informado
  color: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  professionalsCount?: number  // quantos profissionais executam este procedimento
}

export interface CreateProcedureData {
  name: string
  description?: string
  durationMinutes: number
  priceCents?: number
  color?: string
}

export interface UpdateProcedureData {
  name?: string
  description?: string | null
  durationMinutes?: number
  priceCents?: number | null
  color?: string | null
}

export interface ListProceduresParams {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export interface IProcedureRepository {
  create(data: CreateProcedureData): Promise<ProcedureRecord>
  findById(id: string): Promise<ProcedureRecord | null>
  list(params: ListProceduresParams): Promise<{ data: ProcedureRecord[]; total: number; page: number; limit: number; totalPages: number }>
  update(id: string, data: UpdateProcedureData): Promise<ProcedureRecord>
  setActive(id: string, isActive: boolean): Promise<ProcedureRecord>
  delete(id: string): Promise<void>
}
