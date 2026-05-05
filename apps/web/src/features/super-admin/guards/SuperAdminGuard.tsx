// ─── SuperAdminGuard ──────────────────────────────────────────────────────────
//
// Redireciona para /super-admin/login se não houver token de super admin.
// Usado como `beforeLoad` nas rotas protegidas do TanStack Router.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from '@tanstack/react-router'
import { saTokens } from '@/lib/api/super-admin-client'

export function requireSuperAdminAuth() {
  if (!saTokens.getAccess()) {
    throw redirect({ to: '/super-admin/login' })
  }
}
