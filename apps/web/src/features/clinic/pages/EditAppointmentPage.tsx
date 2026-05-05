// ─── EditAppointmentPage ──────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '@/lib/api/clinic.api'
import { publicApi, type TimeSlot } from '@/lib/api/public.api'
import { clinicTokens } from '@/lib/api/client'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '42px', padding: '0 14px',
  border: '1.5px solid #e2e8f0', borderRadius: '10px',
  fontSize: '14px', color: '#1a2530', background: '#fff', outline: 'none',
  fontFamily: 'var(--font-sans)',
}

export function EditAppointmentPage() {
  const params   = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const id       = params.id ?? ''
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [notes,        setNotes]        = useState('')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [reschedule,   setReschedule]   = useState(false)

  const { data: apt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn:  () => appointmentsApi.get(id),
    enabled:  !!id,
  })

  useEffect(() => {
    if (apt) {
      setSelectedDate(apt.scheduledDate)
      setNotes(apt.notes ?? '')
    }
  }, [apt])

  // Slots para reagendamento
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots-edit', slug, apt?.professional.id, apt?.procedure.id, selectedDate],
    queryFn:  () => publicApi.getSlots(slug, apt!.professional.id, apt!.procedure.id, selectedDate),
    enabled:  reschedule && !!apt && !!selectedDate,
    placeholderData: [],
  })

  useEffect(() => { setSelectedSlot(null) }, [selectedDate])

  const updateMutation = useMutation({
    mutationFn: () => appointmentsApi.update(id, {
      scheduledDate: reschedule && selectedDate !== apt?.scheduledDate ? selectedDate : undefined,
      startTime:     reschedule && selectedSlot ? selectedSlot.startTime : undefined,
      notes:         notes,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments'] })
      void qc.invalidateQueries({ queryKey: ['appointment', id] })
      void navigate({ to: '/app/$slug/$section', params: { slug, section: 'appointments' } })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrorMsg(msg ?? 'Erro ao salvar. Tente novamente.')
    },
  })

  const canSave = !reschedule || (reschedule && !!selectedSlot)

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>Carregando...</div>
  }
  if (!apt) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#ef4444', fontFamily: 'var(--font-sans)' }}>Agendamento não encontrado.</div>
  }

  return (
    <div className="r-page" style={{ maxWidth: '640px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'appointments' } })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748b', padding: 0, marginBottom: '12px', fontFamily: 'var(--font-sans)' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para agendamentos
        </button>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#1a2530', letterSpacing: '-0.02em' }}>
          Editar Agendamento
        </h1>
      </div>

      <div className="r-card" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Resumo atual */}
        <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f0f2f5' }}>
          <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agendamento atual</p>
          <div className="r-grid-2" style={{ gap: '8px' }}>
            {[
              ['Paciente',     apt.patient.name],
              ['Profissional', apt.professional.name],
              ['Procedimento', apt.procedure.name],
              ['Data',         apt.scheduledDate.split('-').reverse().join('/')],
              ['Horário',      `${apt.startTime.slice(0,5)} – ${apt.endTime.slice(0,5)}`],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ margin: '0 0 1px', fontSize: '11px', color: '#94a3b8' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div>
          <label style={labelStyle}>Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Observações sobre o agendamento..."
            style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical' }}
          />
        </div>

        {/* Toggle reagendar */}
        <div>
          <button
            onClick={() => setReschedule((r) => !r)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
              border: `1.5px solid ${reschedule ? 'var(--color-primary)' : '#e2e8f0'}`,
              background: reschedule ? 'color-mix(in srgb, var(--color-primary) 8%, white)' : '#fff',
              color: reschedule ? 'var(--color-primary)' : '#374151',
              fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {reschedule ? 'Cancelar reagendamento' : 'Reagendar (nova data/horário)'}
          </button>
        </div>

        {/* Reagendamento */}
        {reschedule && (
          <>
            <div>
              <label style={labelStyle}>Nova data</label>
              <input
                type="date"
                value={selectedDate}
                min={todayISO()}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Horário disponível
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', marginLeft: '8px' }}>
                  {apt.procedure.durationMinutes} min
                </span>
              </label>
              {slotsLoading ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Carregando horários...</p>
              ) : (slots ?? []).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>Nenhum horário disponível nesta data.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(slots ?? []).map((slot) => {
                    const isSel = selectedSlot?.startTime === slot.startTime
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(isSel ? null : slot)}
                        style={{
                          padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                          fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
                          border: isSel ? 'none' : '1.5px solid #e2e8f0',
                          background: isSel ? 'var(--color-primary)' : '#f8fafc',
                          color: isSel ? '#fff' : '#374151',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {slot.startTime}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {errorMsg && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13.5px' }}>
            {errorMsg}
          </div>
        )}

        {/* Botões */}
        <div className="r-btn-row" style={{ paddingTop: '4px' }}>
          <button
            onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'appointments' } })}
            style={{ flex: 1, height: '44px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', color: '#4a5568', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { setErrorMsg(''); updateMutation.mutate() }}
            disabled={!canSave || updateMutation.isPending}
            style={{
              flex: 2, height: '44px', border: 'none', borderRadius: '10px',
              background: canSave ? 'var(--color-primary)' : '#e2e8f0',
              color: canSave ? '#fff' : '#94a3b8',
              fontSize: '14px', fontWeight: 600,
              cursor: !canSave || updateMutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
