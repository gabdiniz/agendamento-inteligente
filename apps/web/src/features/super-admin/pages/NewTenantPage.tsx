// ─── Super Admin — New Tenant Page ───────────────────────────────────────────
//
// Formulário de cadastro de nova clínica (tenant) com o primeiro gestor.
// Usa React Hook Form + Zod para validação.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi } from '@/lib/api/super-admin.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name:           z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  slug:           z.string().min(2, 'Slug deve ter ao menos 2 caracteres')
                    .regex(slugRegex, 'Use apenas letras minúsculas, números e hífens'),
  email:          z.string().email('E-mail inválido'),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  planType:       z.enum(['BASIC', 'PRO']).default('BASIC'),
  gestorName:     z.string().min(2, 'Nome do gestor obrigatório'),
  gestorEmail:    z.string().email('E-mail do gestor inválido'),
  gestorPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  gestorPhone:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

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

const sectionDividerStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  paddingBottom: '12px', borderBottom: '1px solid #f0f2f5',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewTenantPage() {
  const navigate = useNavigate()
  const [serverError,         setServerError]         = useState<string | null>(null)
  const [slugManuallyEdited,  setSlugManuallyEdited]  = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: '', planType: 'BASIC' },
  })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setValue('slug', toSlug(e.target.value), { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await superAdminApi.createTenant({
        name:     values.name,
        slug:     values.slug,
        email:    values.email,
        phone:    values.phone    || undefined,
        address:  values.address  || undefined,
        planType: values.planType,
        gestor: {
          name:     values.gestorName,
          email:    values.gestorEmail,
          password: values.gestorPassword,
          phone:    values.gestorPhone || undefined,
        },
      })
      void navigate({ to: '/super-admin/tenants' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar clínica. Tente novamente.'
      setServerError(msg)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/super-admin/tenants' })}
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
          Voltar para clínicas
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Nova clínica
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          Cadastre uma clínica e o seu primeiro gestor
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

          {/* ── Seção: Dados da Clínica ──────────────────────────────── */}
          <p style={sectionDividerStyle}>Dados da Clínica</p>

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome da clínica *</label>
            <input
              placeholder="Clínica São Lucas"
              {...register('name', { onChange: handleNameChange })}
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Slug (URL pública) *</label>
            <input
              placeholder="clinica-sao-lucas"
              {...register('slug', { onChange: () => setSlugManuallyEdited(true) })}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              URL de agendamento público: /clinica-sao-lucas
            </p>
            {errors.slug && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.slug.message}
              </p>
            )}
          </div>

          {/* E-mail + Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>E-mail da clínica *</label>
              <input
                type="email"
                placeholder="contato@clinica.com"
                {...register('email')}
                style={inputStyle}
              />
              {errors.email && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Telefone (opcional)</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                {...register('phone')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Plano + Endereço */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Plano</label>
              <select
                {...register('planType')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Endereço (opcional)</label>
              <input
                placeholder="Av. Paulista, 1000 — São Paulo, SP"
                {...register('address')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* ── Seção: Gestor Inicial ────────────────────────────────── */}
          <p style={{ ...sectionDividerStyle, marginTop: '6px' }}>Gestor Inicial</p>

          <p style={{ margin: '-10px 0 0', fontSize: '13px', color: '#64748b' }}>
            Este usuário terá acesso total ao painel como <strong>Gestor</strong>.
          </p>

          {/* Nome do gestor */}
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              placeholder="Dr. Carlos Almeida"
              {...register('gestorName')}
              style={inputStyle}
            />
            {errors.gestorName && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.gestorName.message}
              </p>
            )}
          </div>

          {/* E-mail gestor + Telefone gestor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>E-mail *</label>
              <input
                type="email"
                placeholder="gestor@clinica.com"
                {...register('gestorEmail')}
                style={inputStyle}
              />
              {errors.gestorEmail && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.gestorEmail.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Telefone (opcional)</label>
              <input
                type="tel"
                placeholder="(11) 9 9999-9999"
                {...register('gestorPhone')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label style={labelStyle}>Senha de acesso *</label>
            <input
              type="password"
              placeholder="••••••••"
              {...register('gestorPassword')}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Mínimo 6 caracteres. O gestor poderá alterar após o primeiro acesso.
            </p>
            {errors.gestorPassword && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.gestorPassword.message}
              </p>
            )}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => void navigate({ to: '/super-admin/tenants' })}
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
                borderRadius: '10px',
                background: 'var(--admin-color-primary)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 14px rgba(99,184,153,0.35)',
              }}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar clínica'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
