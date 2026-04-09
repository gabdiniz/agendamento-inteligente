// ─── Super Admin — Login Page ─────────────────────────────────────────────────
//
// Página de login exclusiva do Super Admin.
// Utiliza Axios separado (saClient) e armazena tokens em localStorage
// com chaves próprias (sa_access_token / sa_refresh_token).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi } from '@/lib/api/super-admin.api'
import { useSuperAdminAuthStore } from '@/stores/super-admin-auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

// ─── Validation schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const setAdmin = useSuperAdminAuthStore((s) => s.setAdmin)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormData) {
    setServerError(null)
    try {
      const { user, accessToken, refreshToken } = await superAdminApi.login(
        values.email,
        values.password,
      )
      setAdmin(user, accessToken, refreshToken)
      void navigate({ to: '/super-admin/tenants' })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Credenciais inválidas. Tente novamente.'
      setServerError(msg)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--admin-color-sidebar-bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / cabeçalho */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-xl mb-4"
            style={{ background: 'var(--admin-color-primary)' }}
          >
            SA
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--admin-color-sidebar-text)' }}
          >
            MyAgendix
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--admin-color-sidebar-muted)' }}
          >
            Painel Super Admin
          </p>
        </div>

        {/* Card do formulário */}
        <div
          className="rounded-2xl p-8 shadow-xl"
          style={{
            background: 'var(--admin-800)',
            border: '1px solid var(--admin-700)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: 'var(--admin-color-sidebar-text)' }}
          >
            Entrar na conta
          </h2>

          {serverError && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'var(--danger-50)',
                border: '1px solid var(--danger-200)',
                color: 'var(--danger-700)',
              }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* E-mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--admin-color-sidebar-muted)' }}
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@myagendix.com"
                {...register('email')}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'var(--admin-900)',
                  border: `1px solid ${errors.email ? 'var(--danger-500)' : 'var(--admin-600)'}`,
                  color: 'var(--admin-color-sidebar-text)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.2)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.email
                    ? 'var(--danger-500)'
                    : 'var(--admin-600)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: 'var(--danger-400)' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--admin-color-sidebar-muted)' }}
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'var(--admin-900)',
                  border: `1px solid ${errors.password ? 'var(--danger-500)' : 'var(--admin-600)'}`,
                  color: 'var(--admin-color-sidebar-text)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--admin-color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.2)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.password
                    ? 'var(--danger-500)'
                    : 'var(--admin-600)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: 'var(--danger-400)' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              className="w-full mt-6"
              style={{
                background: 'var(--admin-color-primary)',
              }}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
