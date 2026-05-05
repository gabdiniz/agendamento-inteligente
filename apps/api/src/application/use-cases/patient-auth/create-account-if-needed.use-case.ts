import { randomBytes } from 'node:crypto'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { EmailAdapter } from '../../../infrastructure/notifications/channels/email.adapter.js'

// ─── Input ───────────────────────────────────────────────────────────────────

export interface CreatePatientAccountIfNeededInput {
  patientId: string
  tenantSlug: string
  tenantName: string
  loginBaseUrl: string  // base URL do frontend — ex: https://app.myagendix.com.br

  // Resumo do agendamento para incluir no e-mail de boas-vindas
  appointment: {
    scheduledDate: string  // "YYYY-MM-DD"
    startTime: string      // "HH:MM"
    professionalName: string
    procedureName: string
  }
}

// ─── Use Case ─────────────────────────────────────────────────────────────────
//
// Chamado após cada booking público bem-sucedido.
//
// Lógica:
//   - Se o paciente não tem e-mail → não faz nada (conta não pode ser criada)
//   - Se o paciente já tem passwordHash → conta já existe, não altera a senha
//   - Se o paciente tem e-mail mas sem passwordHash → cria conta:
//       1. Gera senha aleatória de 12 chars (letras + números)
//       2. Salva passwordHash no banco
//       3. Envia e-mail de boas-vindas com senha e resumo do agendamento
//
// Erros de e-mail são capturados silenciosamente: o agendamento já foi criado
// e não deve ser desfeito por falha no envio de e-mail.
// ─────────────────────────────────────────────────────────────────────────────

export class CreatePatientAccountIfNeededUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly hashService: IHashService,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  async execute(input: CreatePatientAccountIfNeededInput): Promise<void> {
    // Busca paciente com campos de auth para verificar e-mail e passwordHash
    const patient = await this.patientRepo.findByIdWithAuth(input.patientId)

    if (!patient || !patient.email) return           // sem e-mail → sem conta
    if (patient.passwordHash !== null) return        // conta já existe → não altera senha

    // Gera senha temporária legível: 12 chars, letras maiúsculas + minúsculas + dígitos
    const password = this.generateReadablePassword(12)
    const passwordHash = await this.hashService.hashPassword(password)

    // Salva no banco antes de enviar o e-mail
    await this.patientRepo.updatePasswordHash(patient.id, passwordHash)

    // Monta link de acesso ao portal
    const loginUrl = `${input.loginBaseUrl}/${input.tenantSlug}/entrar`

    // Formata data legível: "2026-04-24" → "24/04/2026"
    const [year, month, day] = input.appointment.scheduledDate.split('-')
    const formattedDate = `${day}/${month}/${year}`

    // Envia e-mail — falha silenciosa para não desfazer o agendamento
    try {
      await this.emailAdapter.send({
        to:      patient.email,
        subject: `Sua conta no portal de pacientes — ${input.tenantName}`,
        text: [
          `Olá, ${patient.name}!`,
          '',
          `Seu agendamento em ${input.tenantName} foi confirmado.`,
          'Criamos uma conta para você acompanhar seus agendamentos pelo portal.',
          '',
          '─ Resumo do agendamento ─',
          `Data: ${formattedDate} às ${input.appointment.startTime}`,
          `Profissional: ${input.appointment.professionalName}`,
          `Procedimento: ${input.appointment.procedureName}`,
          '',
          '─ Acesso ao portal ─',
          `Link: ${loginUrl}`,
          `E-mail: ${patient.email}`,
          `Senha temporária: ${password}`,
          '',
          'Recomendamos trocar a senha no primeiro acesso.',
          '',
          `Até logo, ${input.tenantName}`,
        ].join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
            <p>Olá, <strong>${patient.name}</strong>!</p>
            <p>
              Seu agendamento em <strong>${input.tenantName}</strong> foi confirmado.
              Criamos uma conta para você acompanhar seus agendamentos pelo portal.
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;font-weight:600;color:#374151">Resumo do agendamento</p>
              <p style="margin:4px 0">📅 <strong>${formattedDate}</strong> às <strong>${input.appointment.startTime}</strong></p>
              <p style="margin:4px 0">👤 ${input.appointment.professionalName}</p>
              <p style="margin:4px 0">🩺 ${input.appointment.procedureName}</p>
            </div>

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;font-weight:600;color:#1d4ed8">Acesso ao portal</p>
              <p style="margin:4px 0">E-mail: <strong>${patient.email}</strong></p>
              <p style="margin:4px 0">Senha temporária: <strong style="font-size:18px;letter-spacing:2px">${password}</strong></p>
            </div>

            <p style="text-align:center;margin:24px 0">
              <a href="${loginUrl}" style="
                display:inline-block;padding:12px 28px;
                background:#4f46e5;color:#ffffff;
                text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;
              ">Acessar minha conta</a>
            </p>

            <p style="color:#6b7280;font-size:13px;text-align:center">
              Recomendamos trocar a senha no primeiro acesso.<br/>
              Não consegue clicar? Acesse: <code>${loginUrl}</code>
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px;text-align:center">
              ${input.tenantName} • Enviado pelo MyAgendix
            </p>
          </div>
        `,
      })
    } catch (err) {
      // Loga mas não propaga — agendamento não deve falhar por erro de e-mail
      console.error('[CreatePatientAccountIfNeeded] Falha ao enviar e-mail de boas-vindas:', err)
    }
  }

  // ─── Gerador de senha legível ─────────────────────────────────────────────
  // Usa randomBytes para garantir aleatoriedade criptográfica.
  // Exclui caracteres ambíguos (0, O, I, l) para facilitar a leitura.

  private generateReadablePassword(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const bytes = randomBytes(length)
    return Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('')
  }
}
