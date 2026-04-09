// ─── Email Channel Adapter ────────────────────────────────────────────────────
//
// Envia e-mails via SMTP (nodemailer).
// Configuração via variáveis de ambiente:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//
// Em desenvolvimento, quando SMTP_HOST não está configurado, o adapter
// registra o e-mail no log em vez de enviar (modo "dry-run").
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
  private readonly configured: boolean

  constructor() {
    this.configured = Boolean(process.env['SMTP_HOST'])
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.configured) {
      // Modo dry-run: loga e retorna sem enviar
      console.info('[EmailAdapter] DRY-RUN — e-mail não enviado (SMTP não configurado):', {
        to: options.to,
        subject: options.subject,
        preview: options.text.slice(0, 120),
      })
      return { externalId: `dry-run-${Date.now()}` }
    }

    // Importação dinâmica para evitar erro em ambientes sem nodemailer instalado
    const nodemailer = await import('nodemailer').catch(() => null)
    if (!nodemailer) {
      throw new Error('nodemailer não está instalado. Execute: pnpm add nodemailer')
    }

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
}
