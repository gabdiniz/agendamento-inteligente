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
import { UnauthorizedError, AppError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, PatientJwtPayload } from '../../../domain/services/token.service.js'

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface VerifyPatientOtpInput {
  phone:      string
  code:       string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.slice(2)
  }
  return digits
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class VerifyPatientOtpUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly refreshTokenRepo: IPatientRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: VerifyPatientOtpInput): Promise<VerifyPatientOtpOutput> {
    const phone = normalizePhone(input.phone)

    const otp = await this.patientRepo.findLatestOtpByPhone(phone)

    const invalidError = new UnauthorizedError('Código inválido ou expirado.')

    if (!otp) throw invalidError

    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new AppError(
        'Número de tentativas excedido. Solicite um novo código.',
        400,
      )
    }

    const codeHash = createHash('sha256').update(input.code.trim()).digest('hex')

    if (codeHash !== otp.codeHash) {
      await this.patientRepo.incrementOtpAttempts(otp.id)
      throw invalidError
    }

    await this.patientRepo.markOtpUsed(otp.id)

    const patient = await this.patientRepo.findByPhone(phone)
    if (!patient || !patient.isActive) throw invalidError

    const jwtPayload: PatientJwtPayload = {
      sub:        patient.id,
      tenantId:   input.tenantId,
      tenantSlug: input.tenantSlug,
      role:       'PATIENT',
    }

    const tokenPair = this.tokenService.generatePatientTokenPair(jwtPayload)

    const tokenHash = createHash('sha256').update(tokenPair.refreshToken).digest('hex')

    await this.refreshTokenRepo.create({
      patientId: patient.id,
      tokenHash,
      expiresAt: tokenPair.refreshTokenExpiresAt,
    })

    await this.patientRepo.updateLastLogin(patient.id)

    return {
      accessToken:  tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      patient: {
        id:    patient.id,
        name:  patient.name,
        email: patient.email ?? null,
      },
    }
  }
}
