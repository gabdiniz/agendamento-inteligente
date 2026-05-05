// ─── Waitlist Repository ──────────────────────────────────────────────────────
//
// Opera no schema do tenant via tenantPrisma.
// preferredDateFrom / preferredDateTo são "YYYY-MM-DD" no domínio.
// ─────────────────────────────────────────────────────────────────────────────

export interface WaitlistPatient {
  id: string
  name: string
  phone: string
  email: string | null
  preferredContactChannel: string | null   // WHATSAPP | SMS | EMAIL
}

export interface WaitlistProfessional {
  id: string
  name: string
}

export interface WaitlistProcedure {
  id: string
  name: string
  durationMinutes: number
}

// ─── WaitlistRecord — leitura com relações embutidas ─────────────────────────

export interface WaitlistRecord {
  id: string
  patientId: string
  professionalId: string | null
  procedureId: string
  preferredDateFrom: string | null   // "YYYY-MM-DD"
  preferredDateTo: string | null     // "YYYY-MM-DD"
  minAdvanceMinutes: number
  status: string                     // WAITING | NOTIFIED | CONFIRMED | EXPIRED | REMOVED
  notifiedAt: Date | null
  confirmedAt: Date | null
  expiresAt: Date | null
  appointmentId: string | null
  createdAt: Date
  updatedAt: Date
  patient: WaitlistPatient
  professional: WaitlistProfessional | null
  procedure: WaitlistProcedure
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateWaitlistData {
  patientId: string
  professionalId?: string
  procedureId: string
  preferredDateFrom?: string
  preferredDateTo?: string
  minAdvanceMinutes?: number
}

export interface ListWaitlistParams {
  page: number
  limit: number
  status?: string
  procedureId?: string
  professionalId?: string
  patientId?: string
}

export interface PaginatedWaitlist {
  data: WaitlistRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Params para busca de candidatos elegíveis ────────────────────────────────
//
// Usados quando uma vaga abre (appointment cancelado):
// retorna entradas WAITING que matcham procedimento, profissional e data.
// ─────────────────────────────────────────────────────────────────────────────

export interface FindCandidatesParams {
  procedureId: string
  professionalId?: string    // undefined = qualquer profissional
  vacancyDate: string        // "YYYY-MM-DD" — data da vaga aberta
  vacancyStartTime: string   // "HH:MM"  — para checar minAdvanceMinutes
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface IWaitlistRepository {
  create(data: CreateWaitlistData): Promise<WaitlistRecord>
  findById(id: string): Promise<WaitlistRecord | null>
  list(params: ListWaitlistParams): Promise<PaginatedWaitlist>
  findCandidates(params: FindCandidatesParams): Promise<WaitlistRecord[]>
  updateStatus(
    id: string,
    status: string,
    options?: {
      notifiedAt?: Date
      confirmedAt?: Date
      expiresAt?: Date
      appointmentId?: string
    },
  ): Promise<WaitlistRecord>
  remove(id: string): Promise<void>
}
