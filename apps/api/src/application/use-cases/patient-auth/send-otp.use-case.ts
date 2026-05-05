// ─── SendPatientOtpUseCase ────────────────────────────────────────────────────
//
// Gera um código OTP de 6 dígitos, armazena o hash SHA-256 no banco e
// envia imediatamente via Z-API (WhatsApp) da clínica.
//
// Regras:
//   - Paciente precisa existir no tenant (phone cadastrado)
//   - Clínica precisa ter WhatsApp habilitado e Z-API configurado
//   - Código expira em 10 minutos
//   - Invalida OTPs anteriores não usados do mesmo telefone
// ─────────────────────────────────────────────────────────────────────────────

import { randomInt, createHash } from 'node:crypto'
import { AppError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import { ZApiClient } from '../../../infrastructure/external/zapi.client.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.slice(2)
  }
  return digits
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SendPatientOtpInput {
  phone:           string
  tenantName:      string
  zApiInstanceId:  string | null
  zApiToken:       string | null
  zApiClientToken: string | null
  whatsappEnabled: boolean
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

const OTP_EXPIRY_MS = 10 * 60 * 1000  // 10 minutos

export class SendPatientOtpUseCase {
  private readonly zapiClient = new ZApiClient()

  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(input: SendPatientOtpInput): Promise<void> {
    if (
      !input.whatsappEnabled ||
      !input.zApiInstanceId ||
      !input.zApiToken ||
      !input.zApiClientToken
    ) {
      throw new AppError(
        'Esta clínica não tem WhatsApp configurado. Utilize o login com e-mail e senha.',
        400,
      )
    }

    const phone = normalizePhone(input.phone)

    const patient = await this.patientRepo.findByPhone(phone)
    if (!patient || !patient.isActive) {
      return
    }

    const code = String(randomInt(100000, 999999))
    const codeHash = createHash('sha256').update(code).digest('hex')
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

    await this.patientRepo.invalidatePreviousOtps(phone)
    await this.patientRepo.createOtp({ phone, codeHash, expiresAt })

    const message =
      `Olá! Seu código de acesso ao portal ${input.tenantName} é:\n\n` +
      `*${code}*\n\n` +
      `Válido por 10 minutos. Não compartilhe com ninguém.`

    await this.zapiClient.sendText({
      instanceId:  input.zApiInstanceId,
      token:       input.zApiToken,
      clientToken: input.zApiClientToken,
      phone:       input.phone,
      message,
    })
  }
}
