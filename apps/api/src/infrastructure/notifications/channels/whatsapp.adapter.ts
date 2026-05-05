// ─── WhatsApp Channel Adapter — STUB ─────────────────────────────────────────
//
// Placeholder para integração futura com WhatsApp Business API
// (Meta Cloud API, Twilio, Z-API, etc.).
//
// Quando WHATSAPP_API_URL estiver configurado, a implementação real
// substitui este stub. Por enquanto, loga a mensagem e retorna sucesso simulado.
//
// Integração sugerida (MVP2): Z-API ou Twilio WhatsApp Sandbox.
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppSendResult {
  externalId?: string
}

export class WhatsAppAdapter {
  async send(to: string, content: string): Promise<WhatsAppSendResult> {
    const apiUrl = process.env['WHATSAPP_API_URL']

    if (!apiUrl) {
      console.info('[WhatsAppAdapter] STUB — mensagem não enviada (WHATSAPP_API_URL não configurado):', {
        to,
        preview: content.slice(0, 120),
      })
      return { externalId: `stub-wa-${Date.now()}` }
    }

    // TODO (MVP2): implementar chamada real à API do WhatsApp
    // Exemplo com Z-API:
    //
    // const response = await fetch(`${apiUrl}/send-text`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Client-Token': process.env['WHATSAPP_TOKEN'] ?? '',
    //   },
    //   body: JSON.stringify({ phone: to, message: content }),
    // })
    // const data = await response.json()
    // return { externalId: data.zaapId }

    console.warn('[WhatsAppAdapter] WHATSAPP_API_URL configurado mas implementação real pendente')
    return { externalId: `pending-${Date.now()}` }
  }
}
