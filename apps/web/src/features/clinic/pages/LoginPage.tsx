// ─── Clinic Login Page ────────────────────────────────────────────────────────
//
// Login do painel da clínica. Redesign: "Refined Clinical"
// Fundo branco puro + faixa lateral com gradiente, formulário centrado e arejado.
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate, useParams } from '@tanstack/react-router'

import { clinicAuthApi } from '@/lib/api/clinic.api'
import { useAuthStore } from '@/stores/auth.store'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

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
  const [showPw, setShowPw] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

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

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#f8fafb',
    border: '1.5px solid #e2e8ed',
    color: '#1a2530',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.01em',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f4f8fb',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Painel lateral decorativo ─────────────────────────────────────── */}
      <div style={{
        display: 'none',
        width: '420px',
        flexShrink: 0,
        background: 'linear-gradient(160deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #0d2436) 100%)',
        padding: '48px 40px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      }} className="lg-flex">
        {/* Decoração geométrica */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <div>
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '40px',
          }}>M</div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            fontStyle: 'italic',
            color: '#fff',
            lineHeight: 1.25,
            marginBottom: '16px',
          }}>
            Gerencie sua clínica com eficiência
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: '300px' }}>
            Agendamentos, profissionais e pacientes em um só lugar.
          </p>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          MyAgendix © 2025
        </p>
      </div>

      {/* ── Formulário ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          {/* Logo mobile */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '14px',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
              margin: '0 auto 14px',
              boxShadow: '0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}>M</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontStyle: 'italic',
              color: '#1a2530',
              margin: '0 0 4px',
            }}>
              Bem-vindo de volta
            </h1>
            {slug && (
              <p style={{ fontSize: '12px', color: '#8a99a6', fontWeight: 500, letterSpacing: '0.04em' }}>
                /{slug}
              </p>
            )}
          </div>

          {/* Mensagem de erro */}
          {serverError && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#fff5f5',
              border: '1.5px solid #fecaca',
              fontSize: '13px',
              color: '#b91c1c',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {serverError}
            </div>
          )}

          {/* Card formulário */}
          <div style={{
            background: '#fff',
            borderRadius: '18px',
            border: '1px solid #e2e8ed',
            padding: '32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* E-mail */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5a6b78',
                  marginBottom: '7px',
                }}>
                  E-mail
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="voce@clinica.com"
                  {...register('email')}
                  style={{
                    ...inputBase,
                    borderColor: errors.email ? '#fca5a5' : focused === 'email' ? 'var(--color-primary)' : '#e2e8ed',
                    boxShadow: focused === 'email' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                  }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
                {errors.email && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.email.message}</p>
                )}
              </div>

              {/* Senha */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#5a6b78',
                  marginBottom: '7px',
                }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    style={{
                      ...inputBase,
                      paddingRight: '44px',
                      borderColor: errors.password ? '#fca5a5' : focused === 'password' ? 'var(--color-primary)' : '#e2e8ed',
                      boxShadow: focused === 'password' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
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
                      color: '#8a99a6',
                      padding: '4px',
                    }}
                  >
                    {showPw ? (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1,
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Entrando...
                  </>
                ) : 'Entrar no painel'}
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}