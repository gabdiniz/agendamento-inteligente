import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, PatientJwtPayload } from '../../../domain/services/token.service.js'

// ─── Input / Output ──────────────────────────────────────────────────────

export interface PatientLoginInput {
  email: string
  password: string
  tenantId: string
  tenantSlug: string
}

export interface PatientLoginOutput {
  accessToken: string
  refreshToken: string
  patient: {
    id: string
    name: string
    email: string
  }
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class PatientLoginUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly refreshTokenRepo: IPatientRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: PatientLoginInput): Promise<PatientLoginOutput> {
    // 1. Busca paciente pelo e-mail (com campos de auth)
    const patient = await this.patientRepo.findByEmailWithAuth(input.email)

    // Mensagem genérica — evita enumeração de e-mails
    const invalidError = new UnauthorizedError('E-mail ou senha inválidos')

    if (!patient || !patient.isActive) throw invalidError

    // 2. Paciente existe mas nunca teve conta criada (sem passwordHash)
    if (!patient.passwordHash) throw invalidError

    // 3. Verifica a senha
    const passwordMatch = await this.hashService.comparePassword(
      input.password,
      patient.passwordHash,
    )
    if (!passwordMatch) throw invalidError

    // 4. Monta payload do JWT do paciente
    const jwtPayload: PatientJwtPayload = {
      sub:        patient.id,
      tenantId:   input.tenantId,
      tenantSlug: input.tenantSlug,
      role:       'PATIENT',
    }

    // 5. Gera par de tokens
    const tokenPair = this.tokenService.generatePatientTokenPair(jwtPayload)

    // 6. Persiste refresh token (hash) e atualiza lastLoginAt em paralelo
    const tokenHash = this.hashService.hashToken(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + this.tokenService.refreshExpiresInMs)

    await Promise.all([
      this.refreshTokenRepo.create({ patientId: patient.id, tokenHash, expiresAt }),
      this.patientRepo.updateLastLogin(patient.id),
    ])

    return {
      accessToken:  tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      patient: {
        id:    patient.id,
        name:  patient.name,
        email: patient.email!,
      },
    }
  }
}
