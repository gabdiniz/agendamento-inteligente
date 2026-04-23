// ─── Email Channel Adapter ────────────────────────────────────────────────────
//
// Suporta dois provedores, por ordem de prioridade:
//   1. Resend (RESEND_API_KEY + RESEND_FROM)          ← recomendado em produção
//   2. SMTP via nodemailer (SMTP_HOST + SMTP_*)        ← alternativo
//
// Quando nenhum provedor está configurado, roda em modo dry-run (log apenas).
// ─────────────────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export interface EmailSendResult {
  externalId?: string
}

export class EmailAdapter {
  private readonly provider: 'resend' | 'smtp' | 'dry-run'

  constructor() {
    if (process.env['RESEND_API_KEY']) {
      this.provider = 'resend'
    } else if (process.env['SMTP_HOST']) {
      this.provider = 'smtp'
    } else {
      this.provider = 'dry-run'
    }
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    switch (this.provider) {
      case 'resend':
        return this.sendViaResend(options)
      case 'smtp':
        return this.sendViaSmtp(options)
      default:
        return this.dryRun(options)
    }
  }

  // ─── Resend ───────────────────────────────────────────────────────────────

  private async sendViaResend(options: SendEmailOptions): Promise<EmailSendResult> {
    // Importação dinâmica — pacote opcional; erro descritivo se ausente
    const resendMod = await import('resend').catch(() => null)
    if (!resendMod) {
      throw new Error('Pacote "resend" não está instalado. Execute: pnpm add resend')
    }

    const { Resend } = resendMod
    const client = new Resend(process.env['RESEND_API_KEY']!)
    const from = process.env['RESEND_FROM'] ?? 'noreply@myagendix.com.br'

    const { data, error } = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text,
    })

    if (error) {
      throw new Error(`Resend error: ${error.message}`)
    }

    return { externalId: data?.id }
  }

  // ─── SMTP (nodemailer) ────────────────────────────────────────────────────

  private async sendViaSmtp(options: SendEmailOptions): Promise<EmailSendResult> {
    // @ts-ignore — nodemailer é opcional
    const nodemailerMod = await import('nodemailer').catch(() => null)
    if (!nodemailerMod) {
      throw new Error('nodemailer não está instalado. Execute: pnpm add nodemailer')
    }
    const nodemailer = nodemailerMod.default ?? nodemailerMod

    const transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'],
      port: Number(process.env['SMTP_PORT'] ?? 587),
      secure: process.env['SMTP_SECURE'] === 'true',
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    })

    const info = await transporter.sendMail({
      from: process.env['SMTP_FROM'] ?? process.env['SMTP_USER'],
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text,
    })

    return { externalId: info.messageId as string | undefined }
  }

  // ─── Dry-run ──────────────────────────────────────────────────────────────

  private dryRun(options: SendEmailOptions): EmailSendResult {
    console.info('[EmailAdapter] DRY-RUN — e-mail não enviado (sem provedor configurado):', {
      to: options.to,
      subject: options.subject,
      preview: options.text.slice(0, 120),
    })
    return { externalId: `dry-run-${Date.now()}` }
  }
}
