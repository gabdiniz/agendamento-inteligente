// ─── Clinic Login Page ────────────────────────────────────────────────────────
//
// Login do painel da clínica.
// - Banner da clínica como fundo full-page (quando cadastrado)
// - Logo da clínica no topo do formulário
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate, useParams, Link } from '@tanstack/react-router'

import { clinicAuthApi } from '@/lib/api/clinic.api'
import { publicApi, type ClinicInfo } from '@/lib/api/public.api'
import { useAuthStore } from '@/stores/auth.store'
import { applyTenantTheme } from '@/lib/theme'
import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

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
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Carrega branding da clínica
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
    boxSizing: 'border-box' as const,
  }

  const logoUrl   = resolveUrl(clinicInfo?.logoUrl)
  const bannerUrl = resolveUrl(clinicInfo?.bannerUrl)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      // Fundo: banner da clínica ou gradiente padrão
      background: bannerUrl
        ? `url("${bannerUrl}") center/cover no-repeat`
        : 'linear-gradient(135deg, #f4f8fb 0%, #e8f0f7 100%)',
    }}>

      {/* Overlay escuro sobre o banner para legibilidade */}
      {bannerUrl && (
        <div style={{
          position: 'absolute' as const,
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(1px)',
        }} />
      )}

      {/* Card do formulário */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px 24px',
        position: 'relative' as const,
        zIndex: 1,
        animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>

        {/* Logo + cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${clinicInfo?.name ?? ''}`}
              style={{
                height: '108px',
                maxWidth: '260px',
                objectFit: 'contain',
                margin: '0 auto 14px',
                display: 'block',
                filter: bannerUrl ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' : 'none',
              }}
            />
          ) : (
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '14px',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700,
              margin: '0 auto 14px',
              boxShadow: '0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}>M</div>
          )}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontStyle: 'italic',
            color: bannerUrl ? '#fff' : '#1a2530',
            margin: '0 0 4px',
            textShadow: bannerUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
          }}>
            {clinicInfo?.name ? clinicInfo.name : 'Bem-vindo de volta'}
          </h1>
          {/* slug oculto intencionalmente */}
        </div>

        {/* Mensagem de erro */}
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
          background: bannerUrl ? 'rgba(255,255,255,0.88)' : '#fff',
          backdropFilter: bannerUrl ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: bannerUrl ? 'blur(12px)' : 'none',
          borderRadius: '18px',
          border: bannerUrl ? '1px solid rgba(255,255,255,0.4)' : '1px solid #e2e8ed',
          padding: '28px',
          boxShadow: bannerUrl
            ? '0 20px 60px rgba(0,0,0,0.3)'
            : '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* E-mail */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
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
                textTransform: 'uppercase' as const,
                color: '#5a6b78',
                marginBottom: '7px',
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
                    position: 'absolute' as const,
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

            {/* Esqueceu a senha */}
            <div style={{ textAlign: 'right', marginTop: '-6px' }}>
              <Link
                to="/app/$slug/forgot-password"
                params={{ slug }}
                style={{
                  fontSize: '12px',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  opacity: 0.85,
                }}
              >
                Esqueceu a senha?
              </Link>
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
          </form>
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
                        