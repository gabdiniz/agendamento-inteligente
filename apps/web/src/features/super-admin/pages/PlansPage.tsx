// ─── Plans Page (Super Admin) ─────────────────────────────────────────────────
//
// Lista todos os planos com quantidade de clínicas e features.
// Permite criar novo plano e navegar para configuração de features.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { superAdminApi, type Plan } from '@/lib/api/super-admin.api'

// ─── Category labels ─────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  core:          'Core',
  communication: 'Comunicação',
  crm:           'CRM',
  ai:            'Inteligência Artificial',
  billing:       'Financeiro',
  reports:       'Relatórios',
  integrations:  'Integrações',
  support:       'Suporte',
}

// ─── Dark theme constants ─────────────────────────────────────────────────────

const D = {
  bg:          'var(--sa-bg)',
  surface:     'var(--sa-surface)',
  surfaceUp:   'var(--sa-surface-raised)',
  border:      'var(--sa-border)',
  text:        'var(--sa-text)',
  textSec:     'var(--sa-text-secondary)',
  textMuted:   'var(--sa-text-muted)',
  primary:     'var(--admin-color-primary)',
  primaryHov:  'var(--admin-color-primary-hover)',
  green:       '#3fb950',
  greenBg:     'rgba(63,185,80,0.1)',
  greenBorder: 'rgba(63,185,80,0.2)',
  red:         '#f85149',
  redBg:       'rgba(248,81,73,0.1)',
  redBorder:   'rgba(248,81,73,0.2)',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: D.surface, borderRadius: 14, border: `1px solid ${D.border}`,
  padding: '20px 24px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px',
  border: `1.5px solid ${D.border}`, borderRadius: 10, fontSize: 14,
  fontFamily: 'var(--font-sans)', outline: 'none',
  color: D.text, background: D.bg,
}

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: D.primary, color: '#fff', fontSize: 13, fontWeight: 700,
  fontFamily: 'var(--font-sans)',
}

const btnSecondary: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  border: `1px solid ${D.border}`, background: D.surfaceUp, color: D.textSec,
  fontFamily: 'var(--font-sans)',
}

// ─── Create Plan Schema ───────────────────────────────────────────────────────

const createSchema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  slug:        z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: (id: string) => void }) {
  const featuresByCategory = plan.features.reduce<Record<string, string[]>>((acc, f) => {
    const cat = f.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(f.name)
    return acc
  }, {})

  const slugColor: Record<string, string> = {
    free:   '#3fb950',
    pro:    '#a371f7',
    growth: '#58a6ff',
  }
  const color = slugColor[plan.slug] ?? D.primary

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}60`,
            }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, color: D.text, margin: 0 }}>
              {plan.name}
            </h3>
            {!plan.isActive && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: D.red,
                background: D.redBg, padding: '2px 8px', borderRadius: 20,
                border: `1px solid ${D.redBorder}`,
              }}>
                Inativo
              </span>
            )}
          </div>
          {plan.description && (
            <p style={{ fontSize: 12, color: D.textMuted, margin: 0 }}>{plan.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: D.textMuted }}>
            {plan.tenantCount} clínica{plan.tenantCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onEdit(plan.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${color}40`, background: `${color}18`, color,
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}30` }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}18` }}
          >
            Configurar features
          </button>
        </div>
      </div>

      {/* Features por categoria */}
      {plan.features.length === 0 ? (
        <p style={{ fontSize: 12, color: D.textMuted, margin: 0 }}>Nenhuma feature atribuída.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(featuresByCategory).map(([cat, names]) => (
            <div key={cat} style={{
              minWidth: 140,
              background: D.surfaceUp,
              borderRadius: 10,
              padding: '10px 14px',
              border: `1px solid ${D.border}`,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                {CATEGORY_LABEL[cat] ?? cat}
              </p>
              {names.map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <svg width="10" height="10" fill="none" stroke={color} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ fontSize: 12, color: D.textSec }}>{n}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PlansPage() {
  const navigate     = useNavigate()
  const qc           = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['super-admin-plans'],
    queryFn:  superAdminApi.listPlans,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) => superAdminApi.createPlan(values),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['super-admin-plans'] })
      reset()
      setShowModal(false)
      setServerError(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? 'Erro ao criar plano.')
    },
  })

  function onSubmit(values: CreateForm) {
    createMutation.mutate(values)
  }

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-sans)', maxWidth: 1000 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, animation: 'fadeUp 0.3s ease both' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: D.text, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Planos
          </h1>
          <p style={{ fontSize: 13, color: D.textMuted, margin: 0 }}>
            Configure os planos e as funcionalidades disponíveis em cada um.
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setShowModal(true)}>
          + Novo plano
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', margin: '0 auto 12px',
            border: `2px solid ${D.border}`, borderTopColor: D.primary,
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: D.textMuted, fontSize: 13, margin: 0 }}>Carregando planos...</p>
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <svg width="40" height="40" fill="none" stroke={D.border} viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p style={{ color: D.textMuted, fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Nenhum plano cadastrado.</p>
          <p style={{ color: D.textMuted, fontSize: 13, margin: 0, opacity: 0.6 }}>Crie o primeiro plano para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={(id) => void navigate({ to: '/super-admin/plans/$id', params: { id } })}
            />
          ))}
        </div>
      )}

      {/* Modal criar plano */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setServerError(null); reset() } }}
        >
          <div style={{ ...card, width: 440, maxWidth: '95vw', animation: 'fadeUp 0.2s ease' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: 0 }}>
                Novo plano
              </h2>
              <button
                onClick={() => { setShowModal(false); setServerError(null); reset() }}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: `1px solid ${D.border}`, background: D.surfaceUp,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="13" height="13" fill="none" stroke={D.textSec} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Nome *
                </label>
                <input {...register('name')} placeholder="Ex: Pro" style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(99,184,153,0.15)` }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                />
                {errors.name && <p style={{ color: D.red, fontSize: 11, margin: '4px 0 0' }}>{errors.name.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Slug * <span style={{ fontWeight: 400, textTransform: 'none', color: D.textMuted, opacity: 0.6 }}>(ex: pro, growth, enterprise)</span>
                </label>
                <input {...register('slug')} placeholder="pro" style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(99,184,153,0.15)` }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                />
                {errors.slug && <p style={{ color: D.red, fontSize: 11, margin: '4px 0 0' }}>{errors.slug.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Descrição
                </label>
                <input {...register('description')} placeholder="Descrição curta do plano" style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = D.primary; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(99,184,153,0.15)` }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              {serverError && (
                <p style={{ color: D.red, fontSize: 12, background: D.redBg, padding: '8px 12px', borderRadius: 8, margin: 0, border: `1px solid ${D.redBorder}` }}>
                  {serverError}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={btnSecondary} onClick={() => { setShowModal(false); setServerError(null); reset() }}>
                  Cancelar
                </button>
                <button type="submit" style={{ ...btnPrimary, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
