import { randomBytes, createHash } from 'node:crypto'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { EmailAdapter } from '../../../infrastructure/notifications/channels/email.adapter.js'

// ─── Input / Output ──────────────────────────────────────────────────────

export interface PatientForgotPasswordInput {
  email: string
  tenantSlug: string
  tenantName: string
  baseUrl: string        // base URL do frontend para montar o link de reset
}

// ─── Use Case ────────────────────────────────────────────────────────────

export class PatientForgotPasswordUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  async execute(input: PatientForgotPasswordInput): Promise<void> {
    // Busca com campos de auth para verificar se tem conta (passwordHash)
    const patient = await this.patientRepo.findByEmailWithAuth(input.email)

    // Sem retorno de erro — evita enumeração de e-mails
    // Também não envia e-mail se paciente não tem conta (passwordHash nulo)
    if (!patient || !patient.isActive || !patient.passwordHash) return

    // Gera token: 32 bytes raw → hash SHA-256 armazenado no banco
    const raw  = randomBytes(32).toString('hex')
    const hash = createHash('sha256').update(raw).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await this.patientRepo.savePasswordResetToken(patient.id, hash, expiresAt)

    // Monta link: /:slug/minha-conta/redefinir-senha?token=<raw>
    const resetLink = `${input.baseUrl}/${input.tenantSlug}/minha-conta/redefinir-senha?token=${raw}`

    await this.emailAdapter.send({
      to:      patient.email!,
      subject: `Redefinição de senha — ${input.tenantName}`,
      text: [
        `Olá, ${patient.name}!`,
        '',
        'Recebemos uma solicitação para redefinir a senha da sua conta no portal de pacientes.',
        'Clique no link abaixo para criar uma nova senha (válido por 1 hora):',
        '',
        resetLink,
        '',
        'Se você não solicitou isso, ignore este e-mail — sua senha não será alterada.',
      ].join('\n'),
      html: `
        <p>Olá, <strong>${patient.name}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no portal de pacientes de <strong>${input.tenantName}</strong>.</p>
        <p>
          <a href="${resetLink}" style="
            display:inline-block;padding:12px 24px;
            background:#4f46e5;color:#ffffff;
            text-decoration:none;border-radius:6px;font-weight:600;
          ">Redefinir minha senha</a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Este link expira em <strong>1 hora</strong>.<br/>
          Se você não solicitou isso, ignore este e-mail.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;">
          Não consegue clicar? Copie o link:<br/>
          <code style="word-break:break-all;">${resetLink}</code>
        </p