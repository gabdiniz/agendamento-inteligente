// ─── Patient Repository ───────────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// phone é o identificador único do paciente (deduplicação no cadastro).
// birthDate é sempre "YYYY-MM-DD" no domínio e na resposta da API.
// O repositório converte Date do Prisma para string antes de retornar.
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientRecord {
  id: string
  name: string
  phone: string                         // único por tenant
  email: string | null
  birthDate: string | null              // "YYYY-MM-DD"
  gender: string | null                 // MALE | FEMALE | OTHER | PREFER_NOT_TO_SAY
  city: string | null
  preferredContactChannel: string | null // WHATSAPP | SMS | EMAIL
  marketingOptIn: boolean
  notes: string | null
  source: string                        // MANUAL | PUBLIC_PAGE | INVITE
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreatePatientData {
  name: string
  phone: string
  email?: string
  birthDate?: string    // "YYYY-MM-DD"
  gender?: string
  city?: string
  preferredContactChannel?: string
  marketingOptIn?: boolean
  notes?: string
  source?: string
}

export interface UpdatePatientData {
  name?: string
  phone?: string
  email?: string | null
  birthDate?: string | null
  gender?: string | null
  city?: string | null
  preferredContactChannel?: string | null
  marketingOptIn?: boolean
  notes?: string | null
}

export interface ListPatientsParams {
  page: number
  limit: number
  search?: string     // busca em name, phone, email
  isActive?: boolean
}

export interface PaginatedPatients {
  data: PatientRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface IPatientRepository {
  create(data: CreatePatientData): Promise<PatientRecord>
  findById(id: string): Promise<PatientRecord | null>
  findByPhone(phone: string): Promise<PatientRecord | null>
  list(params: ListPatientsParams): Promise<PaginatedPatients>
  update(id: string, data: UpdatePatientData): Promise<PatientRecord>
  setActive(id: string, isActive: boolean): Promise<PatientRecord>
}
