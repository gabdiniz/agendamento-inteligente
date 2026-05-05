// ─── Token Service Interface ───────────────────────────────────────────────
//
// Abstração para geração e verificação de JWT e refresh tokens.
// Suporta três escopos: Tenant (multi-tenant), Super Admin e Patient.
// ─────────────────────────────────────────────────────────────────────────

// ─── Tenant JWT ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string          // userId
  tenantId: string
  tenantSlug: string
  roles: string[]
}

// ─── Super Admin JWT ────────────────────────────────────────────────────────

export interface SuperAdminJwtPayload {
  sub: string          // superAdminUserId
  scope: 'super-admin' // distingue de tokens de tenant
}

// ─── Patient JWT ─────────────────────────────────────────────────────────────

export interface PatientJwtPayload {
  sub: string          // patientId
  tenantId: string
  tenantSlug: string
  role: 'PATIENT'      // constante — distingue de tokens de staff (roles[])
}

// ─── Shared ─────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string
  refreshToken: string // token em texto plano (enviado ao client)
}

export interface ITokenService {
  // ─── Tenant (staff) ─────────────────────────────────────────────────────
  /** Gera o par access + refresh token para usuário de tenant */
  generateTokenPair(payload: JwtPayload): TokenPair

  /** Verifica e decodifica um access token de tenant */
  verifyAccessToken(token: string): JwtPayload

  // ─── Super Admin ────────────────────────────────────────────────────────
  /** Gera o par access + refresh token para super admin */
  generateSuperAdminTokenPair(payload: SuperAdminJwtPayload): TokenPair

  /** Verifica e decodifica um access token de super admin */
  verifySuperAdminAccessToken(token: string): SuperAdminJwtPayload

  // ─── Patient ─────────────────────────────────────────────────────────────
  /** Gera o par access + refresh token para paciente */
  generatePatientTokenPair(payload: PatientJwtPayload): TokenPair

  /** Verifica e decodifica um access token de paciente */
  verifyPatientAccessToken(token: string): PatientJwtPayload

  // ─── Shared ─────────────────────────────────────────────────────────────
  /** Gera um refresh token random (64 bytes hex) */
  generateRefreshToken(): string

  /** Duração do refresh token em milissegundos (para calcular expiresAt no DB) */
  readonly refreshExpiresInMs: number
}
