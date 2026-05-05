// ─── Patient OTP Login Page ───────────────────────────────────────────────────
//
// Login via WhatsApp — 2 steps:
//   Step 1: paciente informa o telefone
//   Step 2: paciente digita o código de 6 dígitos recebido no WhatsApp
//
// Rota: /:slug/minha-conta/entrar-com-whatsapp
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from '@tanstack/react-router'

import { patientAuthApi } from '@/lib/api/patient-auth.api'
import { usePatientAuthStore } from '@/stores/patient-auth.store'
import { publicApi, type ClinicInfo } from '@/lib/api/public.api'
import { applyTenantTheme } from '@/lib/theme'

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'
function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formata string de dígitos como (XX) X XXXX-XXXX */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return digits
  if (digits.length <= 7)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,3)} ${digits.slice(3,7)}-${digits.slice(7)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,3)} ${digits.slice(3,7)}-${digits.slice(7,11)}`
}

/** Remove formatação e converte para E.164 sem + (ex: 5511999999999) */
function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '')
  return digits.length === 11 ? `55${digits}` : digits
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientOtpLoginPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug   = params.slug ?? ''
  const navigate = useNavigate()
  const setPatient = usePatientAuthStore((s) => s.setPatient)

  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null)
  const [step, setStep]       = useState<1 | 2>(1)
  const [phone, setPhone]     = useState('')        // formatado para exibição
  const [code, setCode]       = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)       // segundos para reenviar

  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  const bannerUrl = resolveUrl(clinicInfo?.bannerUrl)

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
      .catch(() => {})
  }, [slug])

  // Countdown para reenviar
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1_000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleSendOtp() {
    const e164 = toE164(phone)
    if (e164.length < 12) {
      setError('Informe um telefone válido com DDD.')
      return
    }

    setSending(true)
    setError(null)
    try {
      await patientAuthApi.sendOtp(slug, e164)
      setStep(2)
      setCooldown(60)
      // Foca no primeiro campo do código
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Não foi possível enviar o código. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  async function handleVerifyOtp() {
    const fullCode = code.join('')
    if (fullCode.length < 6) {
      setError('Digite os 6 dígitos do código.')
      return
    }

    setVerifying(true)
    setError(null)
    try {
      const result = await patientAuthApi.verifyOtp(slug, toE164(phone), fullCode)
      setPatient(result.patient, result.accessToken, result.refreshToken, slug)
      void navigate({ to: '/$slug/minha-conta', params: { slug } })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Código inválido ou expirado.')
      // Limpa o código para redigitar
      setCode(['', '', '', '', '', ''])
      setTimeout(() => codeRefs.current[0]?.focus(), 50)
    } finally {
      setVerifying(false)
    }
  }

  function handleCodeInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...code]
    next[index] = digit
    setCode(next)
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }
    // Auto-submete quando os 6 campos estão preenchidos
    if (next.every(Boolean) && next.join('').length === 6) {
      setTimeout(() => handleVerifyOtpWithCode(next.join('')), 50)
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerifyOtpWithCode(fullCode: string) {
    setVerifying(true)
    setError(null)
    try {
      const result = await patientAuthApi.verifyOtp(slug, toE164(phone), fullCode)
      setPatient(result.patient, result.accessToken, result.refreshToken, slug)
      void navigate({ to: '/$slug/minha-conta', params: { slug } })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Código inválido ou expirado.')
      setCode(['', '', '', '', '', ''])
      setTimeout(() => codeRefs.current[0]?.focus(), 50)
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setSending(true)
    setError(null)
    setCode(['', '', '', '', '', ''])
    try {
      await patientAuthApi.sendOtp(slug, toE164(phone))
      setCooldown(60)
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    } catch {
      setError('Não foi possível reenviar o código.')
    } finally {
      setSending(false)
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
      background: bannerUrl
        ? `url("${bannerUrl}") center/cover no-repeat`
        : '#faf8f5',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    }}>
      {/* Overlay banner */}
      {bannerUrl && (
        <div aria-hidden style={{
          position: 'fixed' as const, inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(1px)',
          zIndex: 0,
        }} />
      )}

      {/* Grain */}
      <div aria-hidden style={{
        position: 'fixed' as const, inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
        pointerEvents: 'none' as const, zIndex: 0,
      }} />

      <div style={{
        width: '100%', maxWidth: '400px',
        position: 'relative' as const, zIndex: 1,
        animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {resolveUrl(clinicInfo?.logoUrl) ? (
            <img
              src={resolveUrl(clinicInfo!.logoUrl)!}
              alt={clinicInfo?.name ?? 'Logo da clínica'}
              style={{
                height: '108px', maxWidth: '260px',
                objectFit: 'contain',
                margin: '0 auto 14px', display: 'block',
                filter: bannerUrl ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' : 'none',
              }}
            />
          ) : (
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, margin: '0 auto 14px',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent)',
            }}>M</div>
          )}

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px', fontStyle: 'italic',
            color: bannerUrl ? '#fff' : '#1a1614',
            margin: '0 0 6px', lineHeight: 1.2,
            textShadow: bannerUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
          }}>
            {step === 1 ? 'Entrar com WhatsApp' : 'Digite o código'}
          </h1>
          <p style={{ fontSize: '13px', color: bannerUrl ? 'rgba(255,255,255,0.8)' : '#b0a899', margin: 0, fontWeight: 500 }}>
            {step === 1
              ? 'Enviaremos um código de 6 dígitos'
              : `Código enviado para ${phone}`}
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
            background: '#fff5f5', border: '1.5px solid #fecaca',
            fontSize: '13px', color: '#b91c1c',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Card */}
        <div style={{
          background: bannerUrl ? 'rgba(255,255,255,0.60)' : '#ffffff',
          backdropFilter: bannerUrl ? 'blur(18px) saturate(0.15)' : 'none',
          WebkitBackdropFilter: bannerUrl ? 'blur(18px) saturate(0.15)' : 'none',
          borderRadius: '20px',
          border: bannerUrl ? '1px solid rgba(255,255,255,0.5)' : '1px solid #ece9e4',
          padding: '28px',
          boxShadow: bannerUrl ? '0 20px 60px rgba(0,0,0,0.25)' : '0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)',
        }}>

          {/* ── Step 1: Telefone ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  color: '#8a7f75', marginBottom: '6px',
                }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(11) 9 9999-9999"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  style={inputBase}
                />
              </div>

              <button
                type="button"
                disabled={sending}
                onClick={handleSendOtp}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', fontSize: '14px', fontWeight: 600,
                  cursor: sending ? 'wait' : 'pointer',
                  opacity: sending ? 0.75 : 1, transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {sending ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    {/* WhatsApp icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar código via WhatsApp
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 2: Código OTP ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  color: '#8a7f75', marginBottom: '14px', textAlign: 'center',
                }}>
                  Código de 6 dígitos
                </label>

                {/* Inputs do código */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      style={{
                        width: '46px',
                        height: '54px',
                        textAlign: 'center' as const,
                        fontSize: '22px',
                        fontWeight: 700,
                        borderRadius: '12px',
                        border: `2px solid ${digit ? 'var(--color-primary)' : '#e5e1db'}`,
                        background: digit ? 'color-mix(in srgb, var(--color-primary) 6%, white)' : '#faf8f5',
                        color: '#1a1614',
                        outline: 'none',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-sans)',
                        cursor: 'text',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={verifying || code.join('').length < 6}
                onClick={handleVerifyOtp}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', fontSize: '14px', fontWeight: 600,
                  cursor: verifying ? 'wait' : 'pointer',
                  opacity: verifying || code.join('').length < 6 ? 0.65 : 1,
                  transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {verifying ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Verificando...
                  </>
                ) : 'Confirmar código'}
              </button>

              {/* Reenviar / voltar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setCode(['','','','','','']); setError(null) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: '#8a7f75', fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Trocar número
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || sending}
                  onClick={handleResend}
                  style={{
                    background: 'none', border: 'none',
                    cursor: cooldown > 0 ? 'default' : 'pointer',
                    fontSize: '13px',
                    color: cooldown > 0 ? '#c0b4aa' : 'var(--color-primary)',
                    fontFamily: 'var(--font-sans)', fontWeight: 600,
                  }}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Voltar para login normal */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link
            to="/$slug/minha-conta/login"
            params={{ slug }}
            style={{
              fontSize: '13px', color: bannerUrl ? 'rgba(255,255,255,0.75)' : '#8a7f75',
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Entrar com e-mail e senha
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
