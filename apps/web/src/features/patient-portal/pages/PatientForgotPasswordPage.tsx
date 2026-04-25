// ─── Patient Forgot Password Page ────────────────────────────────────────────
//
// Solicita e-mail para envio do link de recuperação de senha.
// Rota: /:slug/minha-conta/esqueci-senha
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { patientAuthApi } from '@/lib/api/patient-auth.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})
type FormData = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientForgotPasswordPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''

  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await patientAuthApi.forgotPassword(slug, values.email)
      setSent(true)
    } catch {
      // Por segurança, não revelamos se o e-mail existe ou não
      setSent(true)
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#faf8f5',
    border: '1.5px solid #e5e1db',
    color: '#1a1614',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.01em',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    }}>
      {/* Grain texture */}
      <div aria-hidden style={{
        position: 'fixed' as const, inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
        pointerEvents: 'none' as const, zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: 'fixed' as const, top: '-120px', right: '-120px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
        pointerEvents: 'none' as const, zIndex: 0,
      }} />

      <div style={{
        width: '100%', maxWidth: '400px',
        position: 'relative' as const, zIndex: 1,
        animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'var(--color-primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, margin: '0 auto 16px',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}>M</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px', fontStyle: 'italic',
            color: '#1a1614', margin: '0 0 6px', lineHeight: 1.2,
          }}>
            Esqueceu a senha?
          </h1>
          <p style={{ fontSize: '13px', color: '#b0a899', margin: 0, fontWeight: 500 }}>
            Enviaremos um link de recuperação
          </p>
        </div>

        {/* Erro */}
        {serverError && (
          <div style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
            background: '#fff5f5', border: '1.5px solid #fecaca',
            fontSize: '13px', color: '#b91c1c',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {serverError}
          </div>
        )}

        <div style={{
          background: '#ffffff', borderRadius: '20px',
          border: '1px solid #ece9e4', padding: '28px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)',
        }}>
          {sent ? (
            // Estado de sucesso
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'color-mix(in srgb, var(--color-primary) 12%, white)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px', fontStyle: 'italic',
                color: '#1a1614', marginBottom: '8px',
              }}>
                E-mail enviado!
              </h2>
              <p style={{ fontSize: '13px', color: '#8a7f75', lineHeight: 1.6, marginBottom: '4px' }}>
                Se o endereço <strong>{getValues('email')}</strong> tiver uma conta, você receberá um e-mail com o link para redefinir sua senha.
              </p>
              <p style={{ fontSize: '12px', color: '#b0a899', lineHeight: 1.6 }}>
                Não recebeu? Verifique a pasta de spam ou aguarde alguns minutos.
              </p>
            </div>
          ) : (
            // Formulário
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  color: '#8a7f75', marginBottom: '6px',
                }}>
                  E-mail da sua conta
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  {...register('email')}
                  style={{
                    ...inputBase,
                    borderColor: errors.email ? '#fca5a5' : focused ? 'var(--color-primary)' : '#e5e1db',
                    boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
                {errors.email && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', fontSize: '14px', fontWeight: 600,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1, transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '4px',
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
          )}
        </div>

        {/* Voltar */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link
            to="/$slug/minha-conta/login"
            params={{ slug }}
            style={{
              fontSize: '13px', color: '#8a7f75', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para o login
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
