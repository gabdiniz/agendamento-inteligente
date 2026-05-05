// ─── Forgot Password Page ─────────────────────────────────────────────────────
//
// Formulário para solicitar e-mail de recuperação de senha.
// Rota pública: /app/:slug/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

import { useParams, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { clinicAuthApi } from '@/lib/api/clinic.api'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''

  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await clinicAuthApi.forgotPassword(slug, values.email)
      setSent(true)
    } catch {
      setServerError('Não foi possível processar a solicitação. Tente novamente.')
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
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f4f8fb',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Painel lateral decorativo ───────────────────────────────────────── */}
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
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />
        <div style={{
          position: 'absolute', bottom: '80px', left: '-40px',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.18)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '40px',
          }}>M</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '32px',
            fontStyle: 'italic', color: '#fff', lineHeight: 1.25, marginBottom: '16px',
          }}>
            Recupere o acesso à sua conta
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: '300px' }}>
            Enviaremos um link seguro para redefinir sua senha.
          </p>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>MyAgendix © 2025</p>
      </div>

      {/* ── Formulário ──────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{
          width: '100%', maxWidth: '400px',
          animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 700, margin: '0 auto 14px',
              boxShadow: '0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}>M</div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '22px',
              fontStyle: 'italic', color: '#1a2530', margin: '0 0 4px',
            }}>
              Esqueceu a senha?
            </h1>
            {slug && (
              <p style={{ fontSize: '12px', color: '#8a99a6', fontWeight: 500, letterSpacing: '0.04em' }}>
                /{slug}
              </p>
            )}
          </div>

          {/* Erro */}
          {serverError && (
            <div style={{
              marginBottom: '20px', padding: '12px 14px', borderRadius: '10px',
              background: '#fff5f5', border: '1.5px solid #fecaca',
              fontSize: '13px', color: '#b91c1c', display: 'flex', gap: '8px', alignItems: 'center',
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {serverError}
            </div>
          )}

          {/* Card */}
          <div style={{
            background: '#fff', borderRadius: '18px', border: '1px solid #e2e8ed',
            padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            {sent ? (
              /* ── Estado: e-mail enviado ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#ecfdf5', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 20px',
                }}>
                  <svg width="28" height="28" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2530', marginBottom: '10px' }}>
                  Verifique seu e-mail
                </h3>
                <p style={{ fontSize: '13px', color: '#5a6b78', lineHeight: 1.6, marginBottom: '24px' }}>
                  Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em alguns minutos.
                  Verifique também a caixa de spam.
                </p>
                <Link
                  to="/app/$slug/login"
                  params={{ slug }}
                  style={{
                    fontSize: '13px', color: 'var(--color-primary)',
                    fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  ← Voltar ao login
                </Link>
              </div>
            ) : (
              /* ── Formulário ── */
              <>
                <p style={{ fontSize: '13px', color: '#5a6b78', marginBottom: '24px', lineHeight: 1.6 }}>
                  Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
                </p>
                <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{
                      display: 'block', fontSize: '12px', fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                      color: '#5a6b78', marginBottom: '7px',
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
                        borderColor: errors.email ? '#fca5a5' : focused ? 'var(--color-primary)' : '#e2e8ed',
                        boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                      }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                    {errors.email && (
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%', padding: '13px', borderRadius: '10px',
                      background: 'var(--color-primary)', color: '#fff', border: 'none',
                      fontSize: '14px', fontWeight: 600,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      opacity: isSubmitting ? 0.75 : 1, transition: 'all 0.2s',
                      fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div style={{
                          width: '14px', height: '14px',
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        Enviando...
                      </>
                    ) : 'Enviar link de recuperação'}
                  </button>
                </form>
              </>
            )}
          </div>

          {!sent && (
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#8a99a6' }}>
              Lembrou a senha?{' '}
              <Link
                to="/app/$slug/login"
                params={{ slug }}
                style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
              >
                Voltar ao login
              </Link>
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
