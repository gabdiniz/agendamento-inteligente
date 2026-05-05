// ─── VerifyPatientOtpUseCase ──────────────────────────────────────────────────
//
// Valida o código OTP e, se correto, retorna o par de tokens JWT
// idêntico ao fluxo de login normal.
//
// Regras:
//   - OTP precisa existir, não estar expirado e não ter sido usado
//   - Máximo de 5 tentativas erradas antes de invalidar o OTP
//   - Após verificação bem-sucedida, marca o OTP como usado
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'
import { UnauthorizedError, BadRequestError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, PatientJwtPayload } from '../../../domain/services/token.service.js'

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface VerifyPatientOtpInput {
  phone:      string
  code:       string   // código de 6 dígitos informado pelo paciente
  tenantId:   string
  tenantSlug: string
}

export interface VerifyPatientOtpOutput {
  accessToken:  string
  refreshToken: string
  patient: {
    id:    string
    name:  string
    email: string | null
  }
}

const MAX_ATTEMPTS = 5

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class VerifyPatientOtpUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly refreshTokenRepo: IPatientRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: VerifyPatientOtpInput): Promise<VerifyPatientOtpOutput> {
    // 1. Busca o OTP mais recente válido para o telefone
    const otp = await this.patientRepo.findLatestOtpByPhone(input.phone)

    const invalidError = new UnauthorizedError('Código inválido ou expirado.')

    if (!otp) throw invalidError

    // 2. Verifica tentativas excedidas
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestError(
        'Número de tentativas excedido. Solicite um novo código.',
      )
    }

    // 3. Verifica o hash do código
    const codeHash = createHash('sha256').update(input.code.trim()).digest('hex')

    if (codeHash !== otp.codeHash) {
      await this.patientRepo.incrementOtpAttempts(otp.id)
      throw invalidError
    }

    // 4. Código correto — marca como usado
    await this.patientRepo.markOtpUsed(otp.id)

    // 5. Busca o paciente (pelo phone)
    const patient = await this.patientRepo.findByPhone(input.phone)
    if (!patient || !patient.isActive) throw invalidError

    // 6. Monta payload JWT
    const jwtPayload: PatientJwtPayload = {
      sub:        patient.id,
      tenantId:   input.tenantId,
      tenantSlug: input.tenantSlug,
      role:       'PATIENT',
    }

    // 7. Gera par de tokens
    const tokenPair = this.tokenService.generatePatientTokenPair(jwtPayload)

    // 8. Persiste refresh token e atualiza lastLoginAt
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
        email: patient.email,
      },
    }
  }
}
