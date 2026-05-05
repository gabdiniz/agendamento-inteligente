// ─── Patient Login Page ───────────────────────────────────────────────────────
//
// Login do portal do paciente.
// Estética "Private Practice" — creme, warm tones, consistente com BookingPage.
// Rota: /:slug/minha-conta/login
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { patientAuthApi } from '@/lib/api/patient-auth.api'
import { usePatientAuthStore } from '@/stores/patient-auth.store'
import { publicApi, type ClinicInfo } from '@/lib/api/public.api'
import { applyTenantTheme } from '@/lib/theme'

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'
function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

// ─── Styles ───────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientLoginPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const navigate = useNavigate()
  const setPatient = usePatientAuthStore((s) => s.setPatient)

  const [serverError, setServerError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null)

  useEffect(() => {
    if (!slug) return
    publicApi.getClinicInfo(slug)
      .then((info) => {
        setClinicInfo(info)
        applyTenantTheme({
          colorPrimary:   info.colorPrimary,
          colorSecondary: info.colorSecondary,
          colorSidebar:   info.colorSidebar,
        })
      })
      .catch(() => { /* usa tema padrão */ })
  }, [slug])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      const result = await patientAuthApi.login(slug, values.email, values.password)
      setPatient(result.patient, result.accessToken, result.refreshToken, slug)
      void navigate({ to: '/$slug/minha-conta', params: { slug } })
    } catch {
      setServerError('E-mail ou senha incorretos.')
    }
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
        position: 'fixed' as const,
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
        pointerEvents: 'none' as const,
        zIndex: 0,
      }} />

      {/* Círculos decorativos */}
      <div aria-hidden style={{
        position: 'fixed' as const, top: '-120px', right: '-120px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
        pointerEvents: 'none' as const, zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: 'fixed' as const, bottom: '-80px', left: '-80px',
        width: '280px', height: '280px', borderRadius: '50%',
        background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)',
        pointerEvents: 'none' as const, zIndex: 0,
      }} />

      {/* Conteúdo */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        position: 'relative' as const,
        zIndex: 1,
        animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {resolveUrl(clinicInfo?.logoUrl) ? (
            <img
              src={resolveUrl(clinicInfo!.logoUrl)!}
              alt={clinicInfo?.name ?? 'Logo da clínica'}
              style={{
                height: '52px',
                maxWidth: '160px',
                objectFit: 'contain',
                margin: '0 auto 14px',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '16px',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700,
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent)',
            }}>M</div>
          )}

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontStyle: 'italic',
            color: '#1a1614',
            margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            {clinicInfo?.name ? `Olá, ${clinicInfo.name.split(' ')[0]}` : 'Minha Conta'}
          </h1>
          <p style={{ fontSize: '13px', color: '#b0a899', margin: 0, fontWeight: 500 }}>
            Acesse seus agendamentos
          </p>
          {slug && (
            <p style={{ fontSize: '11px', color: '#c8c0b8', fontWeight: 500, letterSpacing: '0.04em', marginTop: '4px' }}>
              /{slug}
            </p>
          )}
        </div>

        {/* Erro de servidor */}
        {serverError && (
          <div style={{
            marginBottom: '16px',
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
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #ece9e4',
          padding: '28px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* E-mail */}
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                color: '#8a7f75', marginBottom: '6px',
              }}>
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                {...register('email')}
                style={{
                  ...inputBase,
                  borderColor: errors.email ? '#fca5a5' : focused === 'email' ? 'var(--color-primary)' : '#e5e1db',
                  boxShadow: focused === 'email' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
              {errors.email && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.email.message}</p>}
            </div>

            {/* Senha */}
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                color: '#8a7f75', marginBottom: '6px',
              }}>
                Senha
              </label>
              <div style={{ position: 'relative' as const }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  style={{
                    ...inputBase,
                    paddingRight: '44px',
                    borderColor: errors.password ? '#fca5a5' : focused === 'password' ? 'var(--color-primary)' : '#e5e1db',
                    boxShadow: focused === 'password' ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                  }}
                  onFocus={() => setFocused('password')}
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
              {errors.password && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.password.message}</p>}
            </div>

            {/* Esqueci a senha */}
            <div style={{ textAlign: 'right', marginTop: '-4px' }}>
              <Link
                to="/$slug/minha-conta/esqueci-senha"
                params={{ slug }}
                style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', opacity: 0.85 }}
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Botão */}
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
              ) : 'Entrar na minha conta'}
            </button>
          </form>
        </div>

        {/* Voltar para agendamento */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link
            to="/$slug"
            params={{ slug }}
            style={{
              fontSize: '13px',
              color: '#8a7f75',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para agendamento
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
