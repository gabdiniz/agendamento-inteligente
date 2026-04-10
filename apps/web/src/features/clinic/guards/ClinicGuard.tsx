// ─── ClinicGuard ──────────────────────────────────────────────────────────────
//
// Redireciona para /app/:slug/login se não houver token de clínica.
// Usado como `beforeLoad` nas rotas protegidas do painel da clínica.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from '@tanstack/react-router'
import { clinicTokens } from '@/lib/api/client'

export function requireClinicAuth({ params }: { params: Record<string, string> }) {
  if (!clinicTokens.getAccess()) {
    const slug = params['slug'] ?? clinicTokens.getSlug() ?? ''
    throw redirect({ to: '/app/$slug/login', params: { slug } })
  }
}
