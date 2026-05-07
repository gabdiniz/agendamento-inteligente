// ─── ScheduleBlockModal ───────────────────────────────────────────────────────
//
// Modal para criar e listar bloqueios avulsos de um profissional em uma data.
// Aberto a partir da DayColumnsView (botao de cadeado no cabecalho da coluna).
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleBlocksApi, type ScheduleBlock } from '@/lib/api/clinic.api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalHHMM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function buildISO(date: string, time: string): string {
  // Constroi ISO com offset local do browser
  const [h, m] = time.split(':').map(Number)
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h!, m!, 0, 0)
  return d.toISOString()
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  professionalId: string
  professionalName: string
  date: string            // "YYYY-MM-DD"
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduleBlockModal({ professionalId, professionalName, date, onClose }: Props) {
  const qc = useQueryClient()

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd   = `${date}T23:59:59.999Z`

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['schedule-blocks-modal', professionalId, date],
    queryFn: () => scheduleBlocksApi.list(professionalId, { from: dayStart, until: dayEnd }),
  })

  // ─── Form state ───────────────────────────────────────────────────────────
  const [startTime, setStartTime] = useState('08:00')
  const [endTime,   setEndTime]   = useState('09:00')
  const [reason,    setReason]    = useState('')
  const [isFullDay, setIsFullDay] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ─── Mutations ────────────────────────────────────────────────────────────

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['schedule-blocks-modal', professionalId, date] })
    void qc.invalidateQueries({ queryKey: ['schedule-blocks-day'] })
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const start = isFullDay ? buildISO(date, '00:00') : buildISO(date, startTime)
      const end   = isFullDay ? buildISO(date, '23:59') : buildISO(date, endTime)
      return scheduleBlocksApi.create(professionalId, {
        startDatetime: start,
        endDatetime:   end,
        reason:        reason.trim() || undefined,
      })
    },
    onSuccess: () => {
      setReason('')
      setFormError(null)
      invalidate()
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.error ?? 'Erro ao criar bloqueio.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (blockId: string) => scheduleBlocksApi.remove(professionalId, blockId),
    onSuccess: invalidate,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!isFullDay && startTime >= endTime) {
      setFormError('O horario de inicio deve ser anterior ao termino.')
      return
    }
    createMutation.mutate()
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const fmtDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${date}T12:00:00`))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontSize: '13px',
    fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
    background: '#fff', color: '#1a2530',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    display: 'block', marginBottom: '5px',
  }

  return (
    <>
      <style>{`
        @keyframes sbFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sbSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin      { to { transform: rotate(360deg) } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 1100,
          animation: 'sbFadeIn 0.2s ease both',
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1101, padding: '16px', pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#fff', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            width: '100%', maxWidth: '440px',
            maxHeight: '90vh', overflowY: 'auto',
            pointerEvents: 'auto',
            animation: 'sbSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a2530' }}>
                Bloqueios de Horario
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                {professionalName} &middot; {fmtDate}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px 24px' }}>

            {/* ─ Formulario ─ */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
              <p style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Novo bloqueio
              </p>

              {/* Dia inteiro toggle */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '14px', cursor: 'pointer', userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                  Dia inteiro
                </span>
              </label>

              {/* Horarios (visivel quando nao e dia inteiro) */}
              {!isFullDay && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <span style={labelStyle}>Inicio</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <span style={labelStyle}>Termino</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div style={{ marginBottom: '14px' }}>
                <span style={labelStyle}>Motivo (opcional)</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={255}
                  placeholder="Ex: Reuniao, Ferias, Compromisso pessoal..."
                  style={inputStyle}
                />
              </div>

              {formError && (
                <div style={{
                  padding: '8px 12px', borderRadius: '8px',
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  fontSize: '12px', color: '#b91c1c', marginBottom: '12px',
                }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{
                  width: '100%', padding: '9px',
                  background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 700,
                  cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: createMutation.isPending ? 0.7 : 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {createMutation.isPending ? 'Criando...' : 'Criar bloqueio'}
              </button>
            </form>

            {/* ─ Lista de bloqueios existentes ─ */}
            <div>
              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Bloqueios neste dia
              </p>

              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                  <div style={{
                    width: '20px', height: '20px',
                    border: '2px solid #e2e8f0', borderTopColor: '#ef4444',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              ) : blocks.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                  Nenhum bloqueio neste dia
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blocks.map((blk: ScheduleBlock) => {
                    const start = toLocalHHMM(blk.startDatetime)
                    const end   = toLocalHHMM(blk.endDatetime)
                    const isFullDayBlk = start === '00:00' && (end === '23:59' || end === '00:00')
                    return (
                      <div
                        key={blk.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: '10px',
                          background: 'rgba(239,68,68,0.06)',
                          border: '1px solid rgba(239,68,68,0.2)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#b91c1c' }}>
                            {isFullDayBlk ? 'Dia inteiro' : `${start} – ${end}`}
                          </div>
                          {blk.reason && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {blk.reason}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(blk.id)}
                          disabled={deleteMutation.isPending}
                          title="Remover bloqueio"
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: 'rgba(239,68,68,0.1)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#ef4444', flexShrink: 0,
                            opacity: deleteMutation.isPending ? 0.5 : 1,
                          }}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" strokeWidth={2} strokeLinecap="round" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
