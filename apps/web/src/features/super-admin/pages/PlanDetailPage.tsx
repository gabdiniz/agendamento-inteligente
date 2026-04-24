// ─── Plan Detail Page (Super Admin) ──────────────────────────────────────────
//
// Exibe e edita as features de um plano.
// Features agrupadas por categoria com checkboxes.
// Salva em batch via PUT /super-admin/plans/:id/features
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { superAdminApi, type Feature } from '@/lib/api/super-admin.api'

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['core', 'communication', 'crm', 'billing', 'reports', 'ai', 'integrations', 'support']

const CATEGORY_LABEL: Record<string, string> = {
  core:          '🧩 Core',
  communication: '💬 Comunicação',
  crm:           '👥 CRM',
  ai:            '🤖 Inteligência Artificial',
  billing:       '💳 Financeiro',
  reports:       '📊 Relatórios',
  integrations:  '🔗 Integrações',
  support:       '🎯 Suporte',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #eaecef',
  padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

// ─── Feature Checkbox ─────────────────────────────────────────────────────────

function FeatureCheckbox({
  feature,
  checked,
  onChange,
}: {
  feature: Feature
  checked: boolean
  onChange: (slug: string, checked: boolean) => void
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
      padding: '10px 14px', borderRadius: 10,
      border: `1.5px solid ${checked ? 'var(--color-primary)' : '#e2e8f0'}`,
      background: checked ? 'color-mix(in srgb, var(--color-primary) 5%, white)' : '#fafbfc',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(feature.slug, e.target.checked)}
        style={{ marginTop: 2, width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
      />
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a2530', margin: '0 0 2px' }}>
          {feature.name}
        </p>
        {feature.description && (
          <p style={{ fontSize: 11, color: '#8a99a6', margin: 0 }}>{feature.description}</p>
        )}
        <code style={{ fontSize: 10, color: '#94a3b8', background: '#f0f2f5', padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
          {feature.slug}
        </code>
      </div>
    </label>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PlanDetailPage() {
  const { id }   = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [dirty, setDirty]         = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk]       = useState(false)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ['super-admin-plan', id],
    queryFn:  () => superAdminApi.getPlan(id),
    enabled:  !!id,
  })

  const { data: allFeatures = [], isLoading: loadingFeatures } = useQuery({
    queryKey: ['super-admin-features'],
    queryFn:  superAdminApi.listFeatures,
  })

  // Inicializa checkboxes com as features atuais do plano
  useEffect(() => {
    if (plan) {
      setSelected(new Set(plan.features.map((f) => f.slug)))
      setDirty(false)
    }
  }, [plan])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: () => superAdminApi.setPlanFeatures(id, [...selected]),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['super-admin-plan', id] })
      await qc.invalidateQueries({ queryKey: ['super-admin-plans'] })
      setDirty(false)
      setSaveOk(true)
      setSaveError(null)
      setTimeout(() => setSaveOk(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSaveError(msg ?? 'Erro ao salvar.')
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  function toggle(slug: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(slug)
      else next.delete(slug)
      return next
    })
    setDirty(true)
    setSaveOk(false)
  }

  function selectAll(slugs: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      slugs.forEach((s) => next.add(s))
      return next
    })
    setDirty(true)
  }

  function deselectAll(slugs: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      slugs.forEach((s) => next.delete(s))
      return next
    })
    setDirty(true)
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  const byCategory = allFeatures.reduce<Record<string, Feature[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = []
    acc[f.category]!.push(f)
    return acc
  }, {})

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingPlan || loadingFeatures) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>
        Carregando...
      </div>
    )
  }

  if (!plan) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#c92a2a', fontFamily: 'var(--font-sans)' }}>
        Plano não encontrado.
      </div>
    )
  }

  const slugColor: Record<string, string> = { free: '#2f9e44', pro: '#6741d9', growth: '#1971c2' }
  const color = slugColor[plan.slug] ?? 'var(--color-primary)'

  return (
    <div style={{ padding: '32px 40px', fontFamily: 'var(--font-sans)', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button
          onClick={() => void navigate({ to: '/super-admin/plans' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8a99a6', display: 'flex' }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2530', margin: 0 }}>
              Plano {plan.name}
            </h1>
          </div>
          {plan.description && (
            <p style={{ fontSize: 13, color: '#8a99a6', margin: '2px 0 0 20px' }}>{plan.description}</p>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveOk && (
            <span style={{ fontSize: 12, color: '#2f9e44', fontWeight: 600 }}>✓ Salvo!</span>
          )}
          {saveError && (
            <span style={{ fontSize: 12, color: '#c92a2a' }}>{saveError}</span>
          )}
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {selected.size} feature{selected.size !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', cursor: dirty ? 'pointer' : 'not-allowed',
              background: dirty ? 'var(--color-primary)' : '#e2e8f0',
              color: dirty ? '#fff' : '#94a3b8',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s',
            }}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Grupos de features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {orderedCategories.map((cat) => {
          const features = byCategory[cat] ?? []
          const slugs    = features.map((f) => f.slug)
          const allSel   = slugs.every((s) => selected.has(s))
          const noneSel  = slugs.every((s) => !selected.has(s))

          return (
            <div key={cat} style={card}>
              {/* Categoria header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a2530', margin: 0 }}>
                  {CATEGORY_LABEL[cat] ?? cat}
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => selectAll(slugs)}
                    disabled={allSel}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: allSel ? 'default' : 'pointer',
                      border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568',
                      fontFamily: 'var(--font-sans)', opacity: allSel ? 0.4 : 1,
                    }}
                  >
                    Selecionar todos
                  </button>
                  <button
                    onClick={() => deselectAll(slugs)}
                    disabled={noneSel}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: noneSel ? 'default' : 'pointer',
                      border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568',
                      fontFamily: 'var(--font-sans)', opacity: noneSel ? 0.4 : 1,
                    }}
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              {/* Features grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 10,
              }}>
                {features.map((f) => (
                  <FeatureCheckbox
                    key={f.slug}
                    feature={f}
                    checked={selected.has(f.slug)}
                    onChange={toggle}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky save bar (quando dirty) */}
      {dirty && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2530', borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100,
        }}>
          <span style={{ fontSize: 13, color: '#e2e8f0' }}>Você tem alterações não salvas.</span>
          <button
            onClick={() => {
              if (plan) {
                setSelected(new Set(plan.features.map((f) => f.slug)))
                setDirty(false)
              }
            }}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Descartar
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{
              fontSize: 13, padding: '7px 18px', borderRadius: 8, border: 'none',
              background: 'var(--color-primary)', color: '#fff', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar agora'}
          </button>
        </div>
      )}
    </div>
  )
}
