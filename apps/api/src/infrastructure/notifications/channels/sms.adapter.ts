// ─── SMS Channel Adapter — STUB ───────────────────────────────────────────────
//
// Placeholder para integração futura com provedores de SMS
// (Twilio, AWS SNS, Vonage, etc.).
//
// Quando SMS_API_URL estiver configurado, a implementação real
// substitui este stub. Por enquanto, loga e retorna sucesso simulado.
//
// Integração sugerida (MVP2): Twilio SMS ou AWS SNS.
// ─────────────────────────────────────────────────────────────────────────────

export interface SmsSendResult {
  externalId?: string
}

export class SmsAdapter {
  async send(to: string, content: string): Promise<SmsSendResult> {
    const apiUrl = process.env['SMS_API_URL']

    if (!apiUrl) {
      console.info('[SmsAdapter] STUB — SMS não enviado (SMS_API_URL não configurado):', {
        to,
        preview: content.slice(0, 120),
      })
      return { externalId: `stub-sms-${Date.now()}` }
    }

    // TODO (MVP2): implementar chamada real à API de SMS
    // Exemplo com Twilio:
    //
    // const twilio = require('twilio')(process.env['TWILIO_SID'], process.env['TWILIO_TOKEN'])
    // const msg = await twilio.messages.create({
    //   body: content,
    //   from: process.env['SMS_FROM'],
    //   to,
    // })
    // return { externalId: msg.sid }

    console.warn('[SmsAdapter] SMS_API_URL configurado mas implementação real pendente')
    return { externalId: `pending-sms-${Date.now()}` }
  }
}
