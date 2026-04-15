// ─── Edit Professional Page ───────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { professionalsApi, proceduresApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#84cc16',
]

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  specialty: z.string().optional(),
  bio:       z.string().optional(),
})

type FormData = z.infer<typeof schema>

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

export function EditProfessionalPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const params   = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const id       = params.id ?? ''

  const [serverError,     setServerError]     = useState<string | null>(null)
  const [selectedColor,   setSelectedColor]   = useState(PRESET_COLORS[0]!)
  const [selectedProcIds, setSelectedProcIds] = useState<string[]>([])

  const { data: prof, isLoading } = useQuery({
    queryKey: ['professional', id],
    queryFn:  () => professionalsApi.get(id),
    enabled:  !!id,
  })

  const { data: allProcedures } = useQuery({
    queryKey: ['procedures-active'],
    queryFn:  () => proceduresApi.list({ limit: 100, isActive: true }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (prof) {
      reset({ name: prof.name, specialty: prof.specialty ?? '', bio: prof.bio ?? '' })
      setSelectedColor(prof.color ?? PRESET_COLORS[0]!)
      setSelectedProcIds((prof.procedures ?? []).map((p) => p.id))
    }
  }, [prof, reset])

  function toggleProc(procId: string) {
    setSelectedProcIds((prev) =>
      prev.includes(procId) ? prev.filter((x) => x !== procId) : [...prev, procId]
    )
  }

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await professionalsApi.update(id, {
        name:      values.name,
        specialty: values.specialty || undefined,
        bio:       values.bio       || undefined,
        color:     selectedColor,
      })
      // Sincroniza procedimentos (substitui todos os vínculos)
      await professionalsApi.linkProcedures(id, selectedProcIds)
      await qc.invalidateQueries({ queryKey: ['professionals'] })
      await qc.invalidateQueries({ queryKey: ['professional', id] })
      void navigate({ to: '/app/$slug/professionals', params: { slug } })
    } catch {
      setServerError('Erro ao salvar. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Carregando...
      </div>
    )
  }

  return (
    <div className="r-page" style={{ maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/professionals', params: { slug } })}
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
          Voltar para profissionais
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Editar profissional
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          {prof?.name}
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
              placeholder="Dra. Ana Lima"
              {...register('name')}
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Especialidade */}
          <div>
            <label style={labelStyle}>Especialidade (opcional)</label>
            <input
              placeholder="Fisioterapia, Nutrição..."
              {...register('specialty')}
              style={inputStyle}
            />
          </div>

          {/* Biografia */}
          <div>
            <label style={labelStyle}>Biografia (opcional)</label>
            <textarea
              rows={3}
              placeholder="Breve apresentação do profissional..."
              {...register('bio')}
              style={{
                ...inputStyle, height: 'auto',
                padding: '12px 14px', resize: 'vertical',
              }}
            />
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: '4px' }} />

          {/* Procedimentos vinculados */}
          <div>
            <label style={labelStyle}>Procedimentos realizados</label>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
              Selecione os procedimentos que este profissional realiza.
            </p>
            {!allProcedures || allProcedures.data.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                Nenhum procedimento cadastrado ainda.{' '}
                <a
                  href={`/app/${slug}/configuracoes/procedimentos/new`}
                  style={{ color: 'var(--color-primary)', textDecoration: 'none', fontStyle: 'normal' }}
                >
                  Cadastrar procedimento →
                </a>
              </p>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px',
              }}>
                {allProcedures.data.map((proc) => {
                  const checked = selectedProcIds.includes(proc.id)
                  return (
                    <label
                      key={proc.id}
                      onClick={() => toggleProc(proc.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        border: checked ? '1.5px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                        background: checked ? 'color-mix(in srgb, var(--color-primary) 6%, white)' : '#fff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                        border: checked ? 'none' : '1.5px solid #d1d5db',
                        background: checked ? 'var(--color-primary)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && (
                          <svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {proc.color && (
                            <span style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: proc.color, flexShrink: 0,
                            }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a2530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {proc.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {proc.durationMinutes} min
                          {proc.priceCents != null && ` · ${(proc.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: '4px' }} />

          {/* Cor de identificação */}
          <div>
            <label style={labelStyle}>Cor de identificação</label>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
              Usada para identificar o profissional no calendário de agendamentos.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: color, border: 'none', cursor: 'pointer',
                    transform: selectedColor === color ? 'scale(1.25)' : 'scale(1)',
                    outline: selectedColor === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px',
                    transition: 'transform 0.15s ease',
                    flexShrink: 0,
                  }}
                />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Personalizada:</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '6px',
                    border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: '2px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => void navigate({ to: '/app/$slug/professionals', params: { slug } })}
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
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
