// ─── Edit Procedure Page ──────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { proceduresApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#84cc16',
]

const schema = z.object({
  name:            z.string().min(2, 'Nome obrigatório'),
  description:     z.string().optional(),
  durationMinutes: z.coerce.number().int().min(5, 'Mínimo 5 minutos').max(480, 'Máximo 480 minutos'),
  priceInput:      z.string().optional(),
})

type FormData = z.infer<typeof schema>

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

function parsePrice(raw: string): number | null {
  if (!raw?.trim()) return null
  const normalized = raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
  const val = parseFloat(normalized)
  if (isNaN(val)) return null
  return Math.round(val * 100)
}

function formatPriceInput(cents: number | null): string {
  if (cents == null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function EditProcedurePage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const params   = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const id       = params.id ?? ''

  const [serverError,   setServerError]   = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]!)

  const { data: procedure, isLoading } = useQuery({
    queryKey: ['procedure', id],
    queryFn:  () => proceduresApi.get(id),
    enabled:  !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (procedure) {
      reset({
        name:            procedure.name,
        description:     procedure.description ?? '',
        durationMinutes: procedure.durationMinutes,
        priceInput:      formatPriceInput(procedure.priceCents),
      })
      setSelectedColor(procedure.color ?? PRESET_COLORS[0]!)
    }
  }, [procedure, reset])

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      await proceduresApi.update(id, {
        name:            values.name,
        description:     values.description || null,
        durationMinutes: values.durationMinutes,
        priceCents:      parsePrice(values.priceInput ?? ''),
        color:           selectedColor,
      })
      await qc.invalidateQueries({ queryKey: ['procedures'] })
      await qc.invalidateQueries({ queryKey: ['procedure', id] })
      void navigate({ to: '/app/$slug/configuracoes/procedimentos', params: { slug } })
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
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Carregando...
      </div>
    )
  }

  return (
    <div className="r-page" style={{ maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>

      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/configuracoes/procedimentos', params: { slug } })}
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
          Voltar para procedimentos
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Editar procedimento
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          {procedure?.name}
        </p>
      </div>

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
            <label style={labelStyle}>Nome *</label>
            <input placeholder="Ex: Consulta inicial" {...register('name')} style={inputStyle} />
            {errors.name && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>{errors.name.message}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição (opcional)</label>
            <textarea
              rows={2}
              placeholder="Detalhes sobre o procedimento..."
              {...register('description')}
              style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical' }}
            />
          </div>

          {/* Duração + Preço */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Duração (minutos) *</label>
              <input type="number" min={5} max={480} step={5} {...register('durationMinutes')} style={inputStyle} />
              {errors.durationMinutes && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>
                  {errors.durationMinutes.message}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Preço (opcional)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  position: 'absolute', left: '12px', fontSize: '14px',
                  color: '#94a3b8', pointerEvents: 'none',
                }}>
                  R$
                </span>
                <input
                  placeholder="150,00"
                  {...register('priceInput')}
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: '4px' }} />

          {/* Cor */}
          <div>
            <label style={labelStyle}>Cor de identificação</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setSelectedColor(color)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: color, border: 'none', cursor: 'pointer', flexShrink: 0,
                    transform: selectedColor === color ? 'scale(1.25)' : 'scale(1)',
                    outline: selectedColor === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px', transition: 'transform 0.15s ease',
                  }}
                />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Personalizada:</span>
                <input type="color" value={selectedColor}
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
            <button type="button"
              onClick={() => void navigate({ to: '/app/$slug/configuracoes/procedimentos', params: { slug } })}
              style={{
                flex: 1, height: '44px', border: '1.5px solid #e2e8f0',
                borderRadius: '10px', background: '#fff', color: '#4a5568',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              style={{
                flex: 2, height: '44px', border: 'none',
                borderRadius: '10px', background: 'var(--color-primary)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1, fontFamily: 'var(--font-sans)',
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
