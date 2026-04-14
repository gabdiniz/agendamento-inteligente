// ─── Super Admin — Login Page ─────────────────────────────────────────────────
//
// Redesign: "Command Center" — dark, authoritative, distinct from clinic theme.
// Fundo escuro com grid de pontos, formulário em dark card, tipografia precisa.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi } from '@/lib/api/super-admin.api'
import { useSuperAdminAuthStore } from '@/stores/super-admin-auth.store'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAdmin = useSuperAdminAuthStore((s) => s.setAdmin)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

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
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas. Tente novamente.'
      setServerError(msg)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#111827',
    color: '#f1f5f9',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.01em',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid de pontos de fundo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Glow verde-azulado no centro */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: `radial-gradient(circle, color-mix(in srgb, var(--admin-color-primary) 18%, transparent) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '380px',
        animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--admin-color-primary), color-mix(in srgb, var(--admin-color-primary) 60%, #059669))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 800,
            color: '#fff',
            margin: '0 auto 18px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.4)',
            letterSpacing: '-0.02em',
          }}>
            SA
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontStyle: 'italic',
            color: '#f1f5f9',
            margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            MyAgendix Admin
          </h1>
          <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
            Painel de controle da plataforma
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#161b22',
          borderRadius: '16px',
          border: '1px solid #21262d',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)',
        }}>
          {serverError && (
            <div style={{
              marginBottom: '18px',
              padding: '11px 14px',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              fontSize: '13px',
              color: '#fca5a5',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* E-mail */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
                marginBottom: '7px',
              }}>
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="admin@myagendix.com"
                {...register('email')}
                style={{
                  ...inputStyle,
                  border: `1px solid ${errors.email ? 'rgba(239,68,68,0.5)' : focused === 'email' ? 'var(--admin-color-primary)' : '#21262d'}`,
                  boxShadow: focused === 'email' ? `0 0 0 3px color-mix(in srgb, var(--admin-color-primary) 20%, transparent)` : 'none',
                }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
              {errors.email && (
                <p style={{ fontSize: '12px', color: '#fca5a5', marginTop: '5px' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
                marginBottom: '7px',
              }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  {...register('password')}
                  style={{
                    ...inputStyle,
                    paddingRight: '44px',
                    border: `1px solid ${errors.password ? 'rgba(239,68,68,0.5)' : focused === 'password' ? 'var(--admin-color-primary)' : '#21262d'}`,
                    boxShadow: focused === 'password' ? `0 0 0 3px color-mix(in srgb, var(--admin-color-primary) 20%, transparent)` : 'none',
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4b5563',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPw ? (
                    <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: '12px', color: '#fca5a5', marginTop: '5px' }}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '8px',
                background: isSubmitting
                  ? '#2d3748'
                  : 'linear-gradient(135deg, var(--admin-color-primary), color-mix(in srgb, var(--admin-color-primary) 60%, #059669))',
                color: '#fff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar painel
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#374151', marginTop: '20px', letterSpacing: '0.03em' }}>
          Acesso restrito • MyAgendix Platform
        </p>
      </div>
    </div>
  )
}
