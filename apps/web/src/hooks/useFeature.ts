// ─── useFeature ───────────────────────────────────────────────────────────────
//
// Verifica se o plano do tenant logado inclui uma feature específica.
//
// Uso:
//   const canUseWaitlist = useFeature('waitlist')
//   const canUseWhatsApp = useFeature('whatsapp')
//
// Retorna `true` se o tenant tem a feature, `false` caso contrário.
// Retorna `true` se tenantFeatures ainda não foi carregado (graceful degradation —
// o backend ainda protege com 403 se necessário).
// ─────────────────────────────────────────────────────────────────────────────

import { useAuthStore } from '@/stores/auth.store'

export function useFeature(slug: string): boolean {
  const { user } = useAuthStore()

  // Se não há usuário ou features ainda não carregadas, permite (graceful)
  if (!user || !user.tenantFeatures) return true

  return user.tenantFeatures.includes(slug)
}

/**
 * Retorna o array completo de feature slugs do tenant.
 */
export function useTenantFeatures(): string[] {
  const { user } = useAuthStore()
  return user?.tenantFeatures ?? []
}
