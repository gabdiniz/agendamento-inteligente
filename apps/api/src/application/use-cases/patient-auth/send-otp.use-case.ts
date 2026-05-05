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
import { BadRequestError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import { ZApiClient } from '../../../infrastructure/external/zapi.client.js'

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SendPatientOtpInput {
  phone:           string   // formato internacional sem + (ex: 5511999999999)
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
    // 1. Verifica se a clínica tem WhatsApp configurado
    if (
      !input.whatsappEnabled ||
      !input.zApiInstanceId ||
      !input.zApiToken ||
      !input.zApiClientToken
    ) {
      throw new BadRequestError(
        'Esta clínica não tem WhatsApp configurado. Utilize o login com e-mail e senha.',
      )
    }

    // 2. Verifica se o paciente existe com esse telefone
    const patient = await this.patientRepo.findByPhone(input.phone)
    if (!patient || !patient.isActive) {
      // Resposta genérica — não revela se o número existe
      return
    }

    // 3. Gera código de 6 dígitos e hash SHA-256
    const code     = String(randomInt(100_000, 999_999))
    const codeHash = createHash('sha256').update(code).digest('hex')
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

    // 4. Persiste o OTP
    await this.patientRepo.saveOtpCode(input.phone, codeHash, expiresAt)

    // 5. Monta e envia a mensagem
    const message = [
      `Olá, ${patient.name.split(' ')[0]}! 👋`,
      '',
      `Seu código de acesso ao portal da *${input.tenantName}* é:`,
      '',
      `*${code}*`,
      '',
      '⏱ Válido por 10 minutos.',
      'Se não foi você, ignore esta mensagem.',
    ].join('\n')

    await this.zapiClient.sendText(
      input.zApiInstanceId,
      input.zApiToken,
      input.zApiClientToken,
      input.phone,
      message,
    )
  }
}
