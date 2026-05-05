// ─── Patient Reset Password Page ─────────────────────────────────────────────
//
// Redefine a senha do paciente usando o token recebido por e-mail.
// O token é lido de ?token=xxx na query string.
// Rota: /:slug/minha-conta/redefinir-senha
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useParams, useSearch, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { patientAuthApi } from '@/lib/api/patient-auth.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  newPassword: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientResetPasswordPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const navigate = useNavigate()

  // TanStack Router expõe query string via useSearch
  const search = useSearch({ strict: false }) as { token?: string }
  const token = search.token ?? ''

  const [done, setDone] = useState(false)
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
    if (!token) {
      setServerError('Link inválido ou expirado. Solicite um novo.')
      return
    }
    try {
      await patientAuthApi.resetPassword(slug, token, values.newPassword)
      setDone(true)
    } catch {
      setServerError('Link inválido ou expirado. Solicite um novo.')
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
    paddingRight: '44px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'var(--font-sans)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative' as const, overflow: 'hidden' as const,
    }}>
      {/* Grain */}
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
            Nova senha
          </h1>
          <p style={{ fontSize: '13px', color: '#b0a899', margin: 0, fontWeight: 500 }}>
            Escolha uma senha segura para sua conta
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
            {' '}
            <Link
              to="/$slug/minha-conta/esqueci-senha"
              params={{ slug }}
              style={{ color: '#b91c1c', fontWeight: 600 }}
            >
              Solicitar novo link
            </Link>
          </div>
        )}

        {/* Token ausente */}
        {!token && !serverError && (
          <div style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
            background: '#fffbeb', border: '1.5px solid #fde68a',
            fontSize: '13px', color: '#92400e',
          }}>
            Link inválido. Acesse o e-mail de recuperação e clique no botão.
          </div>
        )}

        <div style={{
          background: '#ffffff', borderRadius: '20px',
          border: '1px solid #ece9e4', padding: '28px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)',
        }}>
          {done ? (
            // Sucesso
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'color-mix(in srgb, var(--color-primary) 12%, white)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px', fontStyle: 'italic',
                color: '#1a1614', marginBottom: '8px',
              }}>
                Senha redefinida!
              </h2>
              <p style={{ fontSize: '13px', color: '#8a7f75', lineHeight: 1.6, marginBottom: '20px' }}>
                Sua nova senha foi configurada com sucesso.
              </p>
              <button
                type="button"
                onClick={() => void navigate({ to: '/$slug/minha-conta/login', params: { slug } })}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Entrar na minha conta
              </button>
            </div>
          ) : (
            // Formulário
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nova senha */}
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  color: '#8a7f75', marginBottom: '6px',
                }}>
                  Nova senha
                </label>
                <div style={{ position: 'relative' as const }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    {...register('newPassword')}
                    style={{
                      ...inputBase,
                      borderColor: errors.newPassword ? '#fca5a5' : focused === 'new' ? 'var(--color-primary)' : '#e5e1db',
                      boxShadow: focused === 'new' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                    }}
                    onFocus={() => setFocused('new')}
                    onBlur={() => setFocused(null)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute' as const, right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#b0a899', padding: '4px',
                    }}
                    aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
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
                {errors.newPassword && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.newPassword.message}</p>}
              </div>

              {/* Confirmar senha */}
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  color: '#8a7f75', marginBottom: '6px',
                }}>
                  Confirmar senha
                </label>
                <div style={{ position: 'relative' as const }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    style={{
                      ...inputBase,
                      borderColor: errors.confirmPassword ? '#fca5a5' : focused === 'confirm' ? 'var(--color-primary)' : '#e5e1db',
                      boxShadow: focused === 'confirm' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                    }}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                  />
                </div>
                {errors.confirmPassword && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !token}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', fontSize: '14px', fontWeight: 600,
                  cursor: isSubmitting || !token ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !token ? 0.6 : 1, transition: 'all 0.2s',
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
                    Salvando...
                  </>
                ) : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>

        {/* Voltar */}
        {!done && (
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
        )}
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
