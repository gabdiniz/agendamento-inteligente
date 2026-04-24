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

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #eaecef',
  padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14,
  fontFamily: 'var(--font-sans)', outline: 'none', color: '#1a2530',
}

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 700,
  fontFamily: 'var(--font-sans)',
}

const btnSecondary: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568',
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
    free:   '#2f9e44',
    pro:    '#6741d9',
    growth: '#1971c2',
  }
  const color = slugColor[plan.slug] ?? 'var(--color-primary)'

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: color,
            }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a2530', margin: 0 }}>
              {plan.name}
            </h3>
            {!plan.isActive && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c92a2a', background: '#fff5f5', padding: '2px 8px', borderRadius: 20, border: '1px solid #ffc9c9' }}>
                Inativo
              </span>
            )}
          </div>
          {plan.description && (
            <p style={{ fontSize: 12, color: '#8a99a6', margin: 0 }}>{plan.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#8a99a6' }}>
            {plan.tenantCount} clínica{plan.tenantCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onEdit(plan.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${color}22`, background: `${color}11`, color,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Configurar features
          </button>
        </div>
      </div>

      {/* Features por categoria */}
      {plan.features.length === 0 ? (
        <p style={{ fontSize: 12, color: '#b0bbc6', margin: 0 }}>Nenhuma feature atribuída.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(featuresByCategory).map(([cat, names]) => (
            <div key={cat} style={{ minWidth: 140 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                {CATEGORY_LABEL[cat] ?? cat}
              </p>
              {names.map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <svg width="10" height="10" fill="none" stroke={color} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#4a5568' }}>{n}</span>
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2530', margin: '0 0 4px' }}>
            Planos
          </h1>
          <p style={{ fontSize: 13, color: '#8a99a6', margin: 0 }}>
            Configure os planos e as funcionalidades disponíveis em cada um.
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setShowModal(true)}>
          + Novo plano
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando...</p>
      ) : plans.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum plano cadastrado.</p>
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ ...card, width: 440, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a2530', margin: '0 0 20px' }}>
              Novo plano
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Nome *
                </label>
                <input {...register('name')} placeholder="Ex: Pro" style={inputStyle} />
                {errors.name && <p style={{ color: '#c92a2a', fontSize: 11, margin: '4px 0 0' }}>{errors.name.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Slug * <span style={{ fontWeight: 400, textTransform: 'none', color: '#8a99a6' }}>(ex: pro, growth, enterprise)</span>
                </label>
                <input {...register('slug')} placeholder="pro" style={inputStyle} />
                {errors.slug && <p style={{ color: '#c92a2a', fontSize: 11, margin: '4px 0 0' }}>{errors.slug.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Descrição
                </label>
                <input {...register('description')} placeholder="Descrição curta do plano" style={inputStyle} />
              </div>

              {serverError && (
                <p style={{ color: '#c92a2a', fontSize: 12, background: '#fff5f5', padding: '8px 12px', borderRadius: 8, margin: 0, border: '1px solid #ffc9c9' }}>
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
