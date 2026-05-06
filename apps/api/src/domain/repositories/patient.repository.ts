// ─── IPatientRepository ───────────────────────────────────────────────────────

export interface PatientRecord {
  id:                      string
  name:                    string
  email:                   string | null
  phone:                   string | null
  birthDate:               string | null   // "YYYY-MM-DD" — convertido no repositório
  gender:                  string | null
  city:                    string | null
  notes:                   string | null
  preferredContactChannel: string | null
  marketingOptIn:          boolean
  source:                  string
  isActive:                boolean
  createdAt:               Date
  updatedAt:               Date
}

export interface PatientAuthRecord extends PatientRecord {
  passwordHash:           string | null
  passwordResetToken:     string | null
  passwordResetExpiresAt: Date | null
}

export interface CreatePatientData {
  name:                     string
  phone:                    string          // obrigatório — único por tenant
  email?:                   string | null
  birthDate?:               string | null   // "YYYY-MM-DD"
  gender?:                  string | null
  city?:                    string | null
  notes?:                   string | null
  preferredContactChannel?: string | null
  marketingOptIn?:          boolean
  source?:                  string
}

export interface UpdatePatientData {
  name?:                    string
  email?:                   string | null
  phone?:                   string | null
  birthDate?:               string | null   // "YYYY-MM-DD"
  gender?:                  string | null
  city?:                    string | null
  notes?:                   string | null
  isActive?:                boolean
  preferredContactChannel?: string | null
  marketingOptIn?:          boolean
}

export interface ListPatientsParams {
  search?:   string
  page?:     number
  limit?:    number
  isActive?: boolean
}

export interface PaginatedPatients {
  data:       PatientRecord[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

export interface IPatientRepository {
  create(data: CreatePatientData): Promise<PatientRecord>
  findById(id: string): Promise<PatientRecord | null>
  findByPhone(phone: string): Promise<PatientRecord | null>
  list(params: ListPatientsParams): Promise<PaginatedPatients>
  update(id: string, data: UpdatePatientData): Promise<PatientRecord>
  setActive(id: string, isActive: boolean): Promise<PatientRecord>

  // ─── Auth ─────────────────────────────────────────────────────────────────
  /** Busca paciente pelo ID incluindo campos de auth (passwordHash, etc.) */
  findByIdWithAuth(id: string): Promise<PatientAuthRecord | null>
  /** Busca paciente pelo e-mail incluindo campos de auth (passwordHash, etc.) */
  findByEmailWithAuth(email: string): Promise<PatientAuthRecord | null>
  /** Busca paciente pelo token de reset de senha (hash SHA-256) */
  findByPasswordResetToken(tokenHash: string): Promise<PatientAuthRecord | null>
  /** Atualiza o passwordHash do paciente */
  updatePasswordHash(id: string, passwordHash: string): Promise<void>
  /** Salva token de reset de senha (hash) e sua expiração */
  savePasswordResetToken(id: string, tokenHash: string, expiresAt: Date): Promise<void>
  /** Limpa token de reset após uso */
  clearPasswordResetToken(id: string): Promise<void>
  /** Atualiza lastLoginAt para agora */
  updateLastLogin(id: string): Promise<void>

  // ─── OTP ──────────────────────────────────────────────────────────────────
  /** Salva código OTP (hash SHA-256) para o telefone */
  saveOtpCode(phone: string, codeHash: string, expiresAt: Date): Promise<void>
  /** Busca o código OTP mais recente para o telefone */
  findLatestOtpByPhone(phone: string): Promise<{ id: string; codeHash: string; expiresAt: Date; usedAt: Date | null; attempts: number } | null>
  /** Marca o OTP como usado */
  markOtpUsed(id: string): Promise<void>
  /** Incrementa contador de tentativas do OTP */
  incrementOtpAttempts(id: string): Promise<void>
}
