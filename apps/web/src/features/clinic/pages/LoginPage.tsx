// ─── Clinic Login Page ────────────────────────────────────────────────────────
//
// Login do painel da clínica. O slug da clínica vem da URL (/app/:slug/login).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { clinicAuthApi } from '@/lib/api/clinic.api'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>

export function ClinicLoginPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      const { user, accessToken, refreshToken, tenantSlug } = await clinicAuthApi.login(
        slug,
        values.email,
        values.password,
      )
      setUser(user, accessToken, refreshToken, tenantSlug)
      void navigate({ to: '/app/$slug/$section', params: { slug: tenantSlug, section: 'dashboard' } })
    } catch {
      setServerError('E-mail ou senha incorretos.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-bg-subtle)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-xl mb-4"
            style={{ background: 'var(--color-primary)' }}
          >
            M
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            MyAgendix
          </h1>
          {slug && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              /{slug}
            </p>
          )}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-md"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
            Entrar no painel
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
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="voce@clinica.com"
                {...register('email')}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-bg-subtle)',
                  border: `1px solid ${errors.email ? 'var(--danger-500)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.email ? 'var(--danger-500)' : 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: 'var(--danger-600)' }}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-bg-subtle)',
                  border: `1px solid ${errors.password ? 'var(--danger-500)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.password ? 'var(--danger-500)' : 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: 'var(--danger-600)' }}>{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" variant="primary" size="md" loading={isSubmitting} className="w-full mt-6">
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
