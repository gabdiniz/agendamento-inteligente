// ─── Patient Portal Guard ─────────────────────────────────────────────────────
//
// Redireciona para o login do paciente se não estiver autenticado.
// Usado como `beforeLoad` nas rotas protegidas do portal.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from '@tanstack/react-router'
import { patientTokens } from '@/lib/api/patient-client'

export function requirePatientPortalAuth({ params }: { params: Record<string, string> }) {
  const slug = params['slug'] ?? ''
  if (!patientTokens.isAuthenticated(slug)) {
    throw redirect({ to: '/$slug/minha-conta/login', params: { slug } })
  }
}
