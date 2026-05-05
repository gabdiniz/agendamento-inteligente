// ─── Phone Formatter ──────────────────────────────────────────────────────────
//
// Normaliza números de telefone brasileiros para o formato esperado pelo Z-API:
// somente dígitos, com código do país (55), sem + ou espaços.
//
// Exemplos de entrada aceitos:
//   "(11) 99999-9999"   → "5511999999999"
//   "11999999999"       → "5511999999999"
//   "+5511999999999"    → "5511999999999"
//   "5511999999999"     → "5511999999999"
//   "011999999999"      → "5511999999999"  (remove o 0 de discagem)
// ─────────────────────────────────────────────────────────────────────────────

export class PhoneFormatterService {
  /**
   * Normaliza um número para o formato Z-API (somente dígitos, com prefixo 55).
   * Retorna null se o número não puder ser normalizado.
   */
  format(raw: string | null | undefined): string | null {
    if (!raw) return null

    // Remove tudo que não for dígito
    let digits = raw.replace(/\D/g, '')

    // Remove zero de discagem nacional (ex: 011 → 11)
    if (digits.startsWith('0')) {
      digits = digits.slice(1)
    }

    // Já tem código do país
    if (digits.startsWith('55')) {
      // Valida: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos) = 12 ou 13 dígitos
      if (digits.length === 12 || digits.length === 13) {
        return digits
      }
      return null
    }

    // Apenas DDD + número (10 ou 11 dígitos) → prefixar com 55
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`
    }

    return null
  }

  /**
   * Retorna true se o número puder ser formatado com sucesso.
   */
  isValid(raw: string | null | undefined): boolean {
    return this.format(raw) !== null
  }
}
