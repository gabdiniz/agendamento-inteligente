// ─── New Patient Page ─────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientsApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(10, 'Telefone inválido'),
  email:     z.string().email('E-mail inválido').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender:    z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  city:      z.string().optional(),
  notes:     z.string().optional(),
})

type FormData = z.infer<typeof schema>

const genderOptions = [
  { value: '',                   label: 'Não informado' },
  { value: 'MALE',               label: 'Masculino' },
  { value: 'FEMALE',             label: 'Feminino' },
  { value: 'OTHER',              label: 'Outro' },
  { value: 'PREFER_NOT_TO_SAY',  label: 'Prefiro não informar' },
]

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '42px', padding: '0 14px',
  border: '1.5px solid #e2e8f0', borderRadius: '10px',
  fontSize: '14px', color: '#1a2530',
  background: '#fff', outline: 'none', fontFamily: 'var(--font-sans)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewPatientPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const params   = useParams({ strict: false }) as { slug?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''

  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await patientsApi.create({
        name:      values.name,
        phone:     values.phone,
        email:     values.email     || undefined,
        birthDate: values.birthDate || undefined,
        gender:    values.gender    || undefined,
        city:      values.city      || undefined,
        notes:     values.notes     || undefined,
      })
      await qc.invalidateQueries({ queryKey: ['patients'] })
      void navigate({ to: '/app/$slug/patients', params: { slug } })
    } catch {
      setServerError('Erro ao cadastrar paciente. Tente novamente.')
    }
  }

  return (
    <div className="r-page" style={{ maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/patients', params: { slug } })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: '#64748b', padding: 0, marginBottom: '12px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para pacientes
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Novo paciente
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          Preencha os dados do paciente
        </p>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #f0f2f5',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          padding: '28px',
          display: 'flex', flexDirection: 'column', gap: '22px',
        }}>

          {serverError && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: '13.5px',
            }}>
              {serverError}
            </div>
          )}

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              placeholder="João da Silva"
              {...register('name')}
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Telefone + E-mail */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>Telefone *</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                {...register('phone')}
                style={inputStyle}
              />
              {errors.phone && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>E-mail (opcional)</label>
              <input
                type="email"
                placeholder="joao@email.com"
                {...register('email')}
                style={inputStyle}
              />
              {errors.email && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Nascimento + Gênero */}
          <div className="r-grid-2">
            <div>
              <label style={labelStyle}>Data de nascimento (opcional)</label>
              <input
                type="date"
                {...register('birthDate')}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gênero (opcional)</label>
              <select
                {...register('gender')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {genderOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cidade */}
          <div>
            <label style={labelStyle}>Cidade (opcional)</label>
            <input
              placeholder="São Paulo"
              {...register('city')}
              style={inputStyle}
            />
          </div>

          {/* Observações */}
          <div>
            <label style={labelStyle}>Observações (opcional)</label>
            <textarea
              rows={3}
              placeholder="Alergias, condições especiais, preferências..."
              {...register('notes')}
              style={{
                ...inputStyle, height: 'auto',
                padding: '12px 14px', resize: 'vertical',
              }}
            />
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => void navigate({ to: '/app/$slug/patients', params: { slug } })}
              style={{
                flex: 1, height: '44px', border: '1.5px solid #e2e8f0',
                borderRadius: '10px', background: '#fff', color: '#4a5568',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2, height: '44px', border: 'none',
                borderRadius: '10px', background: 'var(--color-primary)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary) 30%, transparent)',
              }}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar paciente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
