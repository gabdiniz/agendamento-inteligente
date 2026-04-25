// ─── Patient Profile Page ─────────────────────────────────────────────────────
//
// Edição de dados pessoais do paciente.
// Rota: /:slug/minha-conta/perfil
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePatientAuthStore } from '@/stores/patient-auth.store'
import { patientPortalApi } from '@/lib/api/patient-auth.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(10, 'Telefone inválido').max(20),
  email:     z.string().email('E-mail inválido').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender:    z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', '']).optional(),
  city:      z.string().max(255).optional(),
})
type FormData = z.infer<typeof schema>

const GENDER_LABELS: Record<string, string> = {
  MALE:             'Masculino',
  FEMALE:           'Feminino',
  OTHER:            'Outro',
  PREFER_NOT_TO_SAY: 'Prefiro não informar',
}

// ─── Input helper ─────────────────────────────────────────────────────────────

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
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: '12px', fontWeight: 600,
      letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      color: '#8a7f75', marginBottom: '6px',
    }}>
      {children}
    </label>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientProfilePage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const { patient, setPatient } = usePatientAuthStore()

  const [focused, setFocused] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:      patient?.name ?? '',
      phone:     patient?.phone ?? '',
      email:     patient?.email ?? '',
      birthDate: patient?.birthDate ?? '',
      gender:    (patient?.gender as FormData['gender']) ?? '',
      city:      patient?.city ?? '',
    },
  })

  // Quando o paciente carrega após mount, sincroniza o form
  useEffect(() => {
    if (patient) {
      reset({
        name:      patient.name ?? '',
        phone:     patient.phone ?? '',
        email:     patient.email ?? '',
        birthDate: patient.birthDate ?? '',
        gender:    (patient.gender as FormData['gender']) ?? '',
        city:      patient.city ?? '',
      })
    }
  }, [patient, reset])

  async function onSubmit(values: FormData) {
    setServerError(null)
    setSaved(false)
    try {
      const updated = await patientPortalApi.updateProfile(slug, {
        name:      values.name,
        phone:     values.phone,
        ...(values.email     ? { email: values.email }         : {}),
        ...(values.birthDate ? { birthDate: values.birthDate } : {}),
        ...(values.gender    ? { gender: values.gender }       : {}),
        ...(values.city      ? { city: values.city }           : {}),
      })
      // Atualiza store
      if (patient) {
        setPatient({ ...patient, ...updated }, '', '', slug)
      }
      reset({
        name:      updated.name,
        phone:     updated.phone ?? '',
        email:     updated.email ?? '',
        birthDate: updated.birthDate ?? '',
        gender:    (updated.gender as FormData['gender']) ?? '',
        city:      updated.city ?? '',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setServerError('Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  const focusStyle = (field: string, hasError?: boolean): React.CSSProperties => ({
    ...inputBase,
    borderColor: hasError ? '#fca5a5' : focused === field ? 'var(--color-primary)' : '#e5e1db',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
  })

  return (
    <div style={{
      maxWidth: '560px',
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
          Meu Perfil
        </h1>
        <p style={{ fontSize: '13px', color: '#8a7f75', margin: 0 }}>
          Mantenha seus dados sempre atualizados.
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
          Perfil atualizado com sucesso!
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

      {/* Form */}
      <div style={{
        background: '#fff', borderRadius: '20px',
        border: '1px solid #ece9e4', padding: '28px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
      }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Nome */}
          <div>
            <Label>Nome completo</Label>
            <input type="text" autoComplete="name" {...register('name')}
              style={focusStyle('name', !!errors.name)}
              onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
            />
            {errors.name && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.name.message}</p>}
          </div>

          {/* Telefone */}
          <div>
            <Label>Telefone / WhatsApp</Label>
            <input type="tel" autoComplete="tel" placeholder="(11) 9 9999-9999" {...register('phone')}
              style={focusStyle('phone', !!errors.phone)}
              onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
            />
            {errors.phone && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.phone.message}</p>}
          </div>

          {/* E-mail */}
          <div>
            <Label>E-mail</Label>
            <input type="email" autoComplete="email" placeholder="voce@email.com" {...register('email')}
              style={focusStyle('email', !!errors.email)}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
            />
            {errors.email && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>{errors.email.message}</p>}
          </div>

          {/* Data de nascimento + Gênero lado a lado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <Label>Data de nascimento</Label>
              <input type="date" {...register('birthDate')}
                style={focusStyle('birthDate')}
                onFocus={() => setFocused('birthDate')} onBlur={() => setFocused(null)}
              />
            </div>
            <div>
              <Label>Gênero</Label>
              <select {...register('gender')}
                style={{
                  ...focusStyle('gender'),
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg fill='none' stroke='%238a7f75' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                  paddingRight: '36px',
                }}
                onFocus={() => setFocused('gender')} onBlur={() => setFocused(null)}
              >
                <option value="">Selecione</option>
                {Object.entries(GENDER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cidade */}
          <div>
            <Label>Cidade</Label>
            <input type="text" placeholder="São Paulo" {...register('city')}
              style={focusStyle('city')}
              onFocus={() => setFocused('city')} onBlur={() => setFocused(null)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', fontSize: '14px', fontWeight: 600,
              cursor: isSubmitting || !isDirty ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !isDirty ? 0.6 : 1,
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
            ) : 'Salvar alterações'}
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
