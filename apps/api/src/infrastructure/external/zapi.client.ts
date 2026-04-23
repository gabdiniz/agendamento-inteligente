// ─── Z-API Client ─────────────────────────────────────────────────────────────
//
// Wrapper HTTP para a API do Z-API (WhatsApp).
// Documentação: https://developer.z-api.io
//
// Endpoint base: https://api.z-api.io/instances/{instanceId}/token/{token}/
// ─────────────────────────────────────────────────────────────────────────────

export interface ZApiSendResult {
  messageId: string
}

export class ZApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'ZApiError'
  }
}

export class ZApiClient {
  private readonly baseUrl = 'https://api.z-api.io'

  // ─── sendText ─────────────────────────────────────────────────────────────
  //
  // Envia uma mensagem de texto para um número de WhatsApp.
  //
  // @param instanceId  ID da instância Z-API da clínica
  // @param token       Token da instância Z-API da clínica
  // @param phone       Número no formato internacional sem + (ex: 5511999999999)
  // @param message     Texto da mensagem (suporta *negrito*, _itálico_)
  //
  async sendText(
    instanceId: string,
    token: string,
    phone: string,
    message: string,
  ): Promise<ZApiSendResult> {
    const url = `${this.baseUrl}/instances/${instanceId}/token/${token}/send-text`

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
        signal: AbortSignal.timeout(15_000), // 15s timeout
      })
    } catch (err) {
      // Erro de rede / timeout — sempre retryable
      throw new ZApiError(0, `Falha de rede ao chamar Z-API: ${String(err)}`, true)
    }

    if (response.ok) {
      const body = await response.json() as { zaapId?: string; messageId?: string }
      return { messageId: body.zaapId ?? body.messageId ?? 'unknown' }
    }

    // Erros 4xx → problema de configuração (número inválido, instância desconectada)
    // Não faz sentido retentar — marcar como FAILED definitivamente
    if (response.status >= 400 && response.status < 500) {
      const body = await response.text()
      throw new ZApiError(
        response.status,
        `Z-API erro ${response.status}: ${body}`,
        false, // não retryable
      )
    }

    // Erros 5xx → instabilidade do Z-API — retryable
    const body = await response.text()
    throw new ZApiError(
      response.status,
      `Z-API erro servidor ${response.status}: ${body}`,
      true, // retryable
    )
  }
}
