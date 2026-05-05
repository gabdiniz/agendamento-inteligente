// ─── Patient Security Page ────────────────────────────────────────────────────
//
// Troca de senha do paciente autenticado.
// Rota: /:slug/minha-conta/seguranca
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientPortalApi } from '@/lib/api/patient-auth.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword:     z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientSecurityPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''

  const [showPw, setShowPw]   = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setServerError(null)
    setSaved(false)
    try {
      await patientPortalApi.changePassword(slug, values.currentPassword, values.newPassword)
      reset()
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        setServerError('Senha atual incorreta.')
      } else {
        setServerError('Não foi possível alterar a senha. Tente novamente.')
      }
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#faf8f5',
    border: '1.5px solid #e5e1db',
    color: '#1a1614',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box' as const,
    paddingRight: '44px',
  }

  const focusStyle = (field: string, hasError?: boolean): React.CSSProperties => ({
    ...inputBase,
    borderColor: hasError ? '#fca5a5' : focused === field ? 'var(--color-primary)' : '#e5e1db',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
  })

  function EyeButton() {
    return (
      <button
        type="button"
        onClick={() => setShowPw(!showPw)}
        style={{
          position: 'absolute' as const, right: '12px', top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#b0a899', padding: '4px',
        }}
        aria-label={showPw ? 'Ocultar' : 'Mostrar'}
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
    )
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)',
      animation: 'fadeUp 0.35s ease both',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 5vw, 26px)',
          fontStyle: 'italic',
          color: '#1a1614', margin: '0 0 4px', lineHeight: 1.2,
        }}>
          Segurança
        </h1>
        <p style={{ fontSize: '13px', color: '#8a7f75', margin: 0 }}>
          Altere sua senha de acesso ao portal.
        </p>
      </div>

      {/* Sucesso */}
      {saved && (
        <div style={{
          marginBottom: '20px', padding: '12px 14px', borderRadius: '10px',
          background: '#f0fdf4', border: '1.5px solid #86efac',
          fontSize: '13px', color: '#166534',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Senha alterada com sucesso!
        </div>
      )}

      {/* Erro */}
      {serverError && (
        <div style={{
          marginBottom: '20px', padding: '12px 14px', borderRadius: '10px',
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
        background: '#fff', borderRadius: '20px',
        border: '1px solid #ece9e4', padding: '28px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
      }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Senha atual */}
          <div>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase' as const,
              color: '#8a7f75', marginBottom: '6px',
            }}>Senha atual</label>
            <div style={{ position: 'relative' as const }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('currentPassword')}
                style={focusStyle('current', !!errors.currentPassword)}
                onFocus={() => setFocused('current')} onBlur={() => setFocused(null)}
              />
              <EyeButton />
            </div>
            {errors.currentPassword && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.currentPassword.message}</p>}
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0ece7', margin: '0 -4px' }} />

          {/* Nova senha */}
          <div>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase' as const,
              color: '#8a7f75', marginBottom: '6px',
            }}>Nova senha</label>
            <div style={{ position: 'relative' as const }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                {...register('newPassword')}
                style={focusStyle('new', !!errors.newPassword)}
                onFocus={() => setFocused('new')} onBlur={() => setFocused(null)}
              />
              <EyeButton />
            </div>
            {errors.newPassword && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.newPassword.message}</p>}
          </div>

          {/* Confirmar nova senha */}
          <div>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase' as const,
              color: '#8a7f75', marginBottom: '6px',
            }}>Confirmar nova senha</label>
            <div style={{ position: 'relative' as const }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                style={focusStyle('confirm', !!errors.confirmPassword)}
                onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
              />
              <EyeButton />
            </div>
            {errors.confirmPassword && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', fontSize: '14px', fontWeight: 600,
              cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting ? 0.75 : 1,
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
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
            ) : 'Alterar senha'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
