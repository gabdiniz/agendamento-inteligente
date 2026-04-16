// ─── ChangePasswordPage ───────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { clinicAuthApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

const schema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme a senha'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export function ChangePasswordPage() {
  const params   = useParams({ strict: false }) as { slug?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const navigate = useNavigate()

  const [serverError, setServerError] = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await clinicAuthApi.changePassword(values.currentPassword, values.newPassword)
      setSuccess(true)
      reset()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setServerError(msg ?? 'Erro ao alterar senha. Tente novamente.')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: '44px', padding: '0 44px 0 14px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '14px', color: '#1a2530', background: '#fff',
    outline: 'none', fontFamily: 'var(--font-sans)',
  }

  return (
    <div className="r-page" style={{ maxWidth: '480px', fontFamily: 'var(--font-sans)' }}>

      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/profile', params: { slug } })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748b', padding: 0, marginBottom: '12px', fontFamily: 'var(--font-sans)' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao perfil
        </button>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#1a2530', letterSpacing: '-0.02em' }}>
          Alterar Senha
        </h1>
      </div>

      <div className="r-card">

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f0fdf4', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1a2530' }}>Senha alterada!</p>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>Sua senha foi atualizada com sucesso.</p>
            <button
              onClick={() => void navigate({ to: '/app/$slug/profile', params: { slug } })}
              style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Voltar ao perfil
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {serverError && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13.5px' }}>
                {serverError}
              </div>
            )}

            {/* Senha atual */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Senha atual
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showCurrent ? 'text' : 'password'} {...register('currentPassword')} style={inputStyle} />
                <button type="button" onClick={() => setShowCurrent((s) => !s)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showCurrent
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              {errors.currentPassword && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>{errors.currentPassword.message}</p>}
            </div>

            {/* Nova senha */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Nova senha
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showNew ? 'text' : 'password'} {...register('newPassword')} style={inputStyle} />
                <button type="button" onClick={() => setShowNew((s) => !s)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showNew
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              {errors.newPassword && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>{errors.newPassword.message}</p>}
            </div>

            {/* Confirmar senha */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Confirmar nova senha
              </label>
              <input type="password" {...register('confirmPassword')} style={inputStyle} />
              {errors.confirmPassword && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: '44px', border: 'none', borderRadius: '10px',
                background: 'var(--color-primary)', color: '#fff',
                fontSize: '14px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {isSubmitting ? 'Salvando...' : 'Alterar senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
