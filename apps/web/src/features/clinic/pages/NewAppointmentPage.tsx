// ─── NewAppointmentPage ────────────────────────────────────────────────────────
//
// Cria um agendamento manual pelo painel interno.
// Fluxo: paciente → profissional → procedimento → data → slot → confirmar
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  professionalsApi,
  patientsApi,
  appointmentsApi,
  type Professional,
  type Patient,
} from '@/lib/api/clinic.api'
import { publicApi, type TimeSlot } from '@/lib/api/public.api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Componentes internos ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px', fontWeight: 700,
  color: '#374151',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  height: '42px', padding: '0 14px',
  border: '1.5px solid #e2e8f0', borderRadius: '10px',
  fontSize: '14px', color: '#1a2530',
  background: '#fff', outline: 'none',
  fontFamily: 'var(--font-sans)',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NewAppointmentPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? ''
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── Estado do formulário ─────────────────────────────────────────────────
  const [patientSearch, setPatientSearch]   = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedProf, setSelectedProf]     = useState<Professional | null>(null)
  const [selectedProcId, setSelectedProcId] = useState('')
  const [selectedDate, setSelectedDate]     = useState(todayISO())
  const [selectedSlot, setSelectedSlot]     = useState<TimeSlot | null>(null)
  const [durationOverride, setDurationOverride] = useState<number | undefined>(undefined)
  const [notes, setNotes]                   = useState('')
  const [errorMsg, setErrorMsg]             = useState('')

  // ── Busca profissionais ──────────────────────────────────────────────────
  const { data: profsData } = useQuery({
    queryKey: ['professionals-list', slug],
    queryFn: () => professionalsApi.list({ limit: 100, isActive: true }),
  })

  // ── Busca pacientes (com search) ─────────────────────────────────────────
  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', slug, patientSearch],
    queryFn: () => patientsApi.list({ search: patientSearch || undefined, limit: 20 }),
    enabled: patientSearch.length >= 2 || !selectedPatient,
  })

  // ── Busca slots disponíveis ──────────────────────────────────────────────
  const selectedProc    = selectedProf?.procedures.find((p) => p.id === selectedProcId)
  const effectiveDuration = durationOverride ?? selectedProc?.durationMinutes

  const {
    data: slots,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
  } = useQuery({
    queryKey: ['slots', slug, selectedProf?.id, selectedProcId, selectedDate],
    queryFn: () => publicApi.getSlots(slug, selectedProf!.id, selectedProcId, selectedDate),
    enabled: !!selectedProf && !!selectedProcId && !!selectedDate,
    placeholderData: [],
  })

  // Reset slot quando muda profissional/procedimento/data
  useEffect(() => { setSelectedSlot(null) }, [selectedProf?.id, selectedProcId, selectedDate])

  // Reset procedimento quando muda profissional
  useEffect(() => { setSelectedProcId(''); setSelectedSlot(null) }, [selectedProf?.id])

  // Reset duração quando muda procedimento (volta ao padrão)
  useEffect(() => { setDurationOverride(undefined) }, [selectedProcId])

  // ── Mutation ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => appointmentsApi.create({
      patientId: selectedPatient!.id,
      professionalId: selectedProf!.id,
      procedureId: selectedProcId,
      scheduledDate: selectedDate,
      startTime: selectedSlot!.startTime,
      // Envia durationMinutes só se o usuário alterou o padrão
      durationMinutes: durationOverride !== undefined && durationOverride !== selectedProc?.durationMinutes
        ? durationOverride
        : undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments'] })
      void navigate({ to: '/app/$slug/$section', params: { slug, section: 'appointments' } })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrorMsg(msg ?? 'Erro ao criar agendamento. Tente novamente.')
    },
  })

  const canSubmit = selectedPatient && selectedProf && selectedProcId && selectedDate && selectedSlot
  const showPatientList = patientSearch.length >= 2 && !selectedPatient

  return (
    <div className="r-page" style={{ maxWidth: '680px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'appointments' } })}
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
          Voltar para agendamentos
        </button>
        <h1 style={{
          margin: 0, fontSize: '26px', fontWeight: 400,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: '#1a2530', letterSpacing: '-0.02em',
        }}>
          Novo agendamento
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
          Preencha os dados para criar um agendamento manual.
        </p>
      </div>

      <div className="r-card" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* ── Paciente ──────────────────────────────────────────────────── */}
        <div>
          <label style={labelStyle}>Paciente</label>
          {selectedPatient ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', border: '1.5px solid #d1fae5',
              borderRadius: '10px', background: '#f0fdf4',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a2530' }}>
                  {selectedPatient.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#16a34a' }}>
                  {selectedPatient.phone}
                </p>
              </div>
              <button
                onClick={() => { setSelectedPatient(null); setPatientSearch('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: '12px', padding: '4px 8px',
                  borderRadius: '6px', fontFamily: 'var(--font-sans)',
                }}
              >
                Trocar
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Digite o nome ou telefone do paciente..."
                style={inputStyle}
              />
              {showPatientList && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1.5px solid #e2e8f0',
                  borderTop: 'none', borderRadius: '0 0 10px 10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  maxHeight: '200px', overflowY: 'auto',
                }}>
                  {(patientsData?.data ?? []).length === 0 ? (
                    <div style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
                      Nenhum paciente encontrado
                    </div>
                  ) : (
                    (patientsData?.data ?? []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatientSearch(p.name) }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '11px 16px', background: 'none', border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                      >
                        <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#1a2530' }}>
                          {p.name}
                        </p>
                        <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                          {p.phone}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Profissional ──────────────────────────────────────────────── */}
        <div>
          <label style={labelStyle}>Profissional</label>
          <select
            value={selectedProf?.id ?? ''}
            onChange={(e) => {
              const prof = profsData?.data.find((p) => p.id === e.target.value) ?? null
              setSelectedProf(prof)
            }}
            style={selectStyle}
          >
            <option value="">Selecione um profissional...</option>
            {(profsData?.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}</option>
            ))}
          </select>
        </div>

        {/* ── Procedimento ──────────────────────────────────────────────── */}
        {selectedProf && (
          <div>
            <label style={labelStyle}>Procedimento</label>
            {selectedProf.procedures.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
                Este profissional não possui procedimentos vinculados.
              </p>
            ) : (
              <select
                value={selectedProcId}
                onChange={(e) => setSelectedProcId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Selecione um procedimento...</option>
                {selectedProf.procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationMinutes} min)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Duração (editável) ────────────────────────────────────────── */}
        {selectedProc && (
          <div>
            <label style={labelStyle}>
              Duração da consulta
              {durationOverride !== undefined && durationOverride !== selectedProc.durationMinutes && (
                <span style={{ marginLeft: '8px', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#f59e0b' }}>
                  (padrão: {selectedProc.durationMinutes} min)
                </span>
              )}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationOverride ?? selectedProc.durationMinutes}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  setDurationOverride(isNaN(v) ? undefined : Math.max(5, Math.min(480, v)))
                }}
                style={{ ...inputStyle, width: '110px' }}
              />
              <span style={{ fontSize: '13px', color: '#64748b' }}>minutos</span>
              {durationOverride !== undefined && durationOverride !== selectedProc.durationMinutes && (
                <button
                  onClick={() => setDurationOverride(undefined)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: '#94a3b8', padding: '4px 8px',
                    borderRadius: '6px', fontFamily: 'var(--font-sans)',
                  }}
                >
                  ↺ Restaurar padrão
                </button>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Altere aqui se esta consulta específica tiver duração diferente do padrão.
            </p>
          </div>
        )}

        {/* ── Data ──────────────────────────────────────────────────────── */}
        {selectedProcId && (
          <div>
            <label style={labelStyle}>Data</label>
            <input
              type="date"
              value={selectedDate}
              min={todayISO()}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
            />
          </div>
        )}

        {/* ── Horários disponíveis ───────────────────────────────────────── */}
        {selectedProcId && selectedDate && (
          <div>
            <label style={labelStyle}>
              Horário disponível
              {effectiveDuration && (
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', marginLeft: '8px' }}>
                  duração: {effectiveDuration} min
                </span>
              )}
            </label>

            {slotsLoading || slotsFetching ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Carregando horários...
              </p>
            ) : (slots ?? []).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
                Nenhum horário disponível nesta data.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(slots ?? []).map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime
                  return (
                    <button
                      key={slot.startTime}
                      onClick={() => setSelectedSlot(isSelected ? null : slot)}
                      style={{
                        padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
                        border: isSelected ? 'none' : '1.5px solid #e2e8f0',
                        background: isSelected ? 'var(--color-primary)' : '#f8fafc',
                        color: isSelected ? '#fff' : '#374151',
                        boxShadow: isSelected ? '0 4px 10px color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'none',
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
        )}

        {/* ── Observações ───────────────────────────────────────────────── */}
        {canSubmit && (
          <div>
            <label style={labelStyle}>Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre o agendamento..."
              rows={3}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '12px 14px',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* ── Erro ──────────────────────────────────────────────────────── */}
        {errorMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', fontSize: '13.5px',
          }}>
            {errorMsg}
          </div>
        )}

        {/* ── Resumo + Submeter ──────────────────────────────────────────── */}
        {canSubmit && (
          <div style={{
            padding: '16px', borderRadius: '12px',
            background: 'color-mix(in srgb, var(--color-primary) 6%, white)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Resumo
            </p>
            <p style={{ margin: '0 0 2px', fontSize: '13.5px', color: '#1a2530' }}>
              <strong>{selectedPatient!.name}</strong> com <strong>{selectedProf!.name}</strong>
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {selectedProc?.name}
              {effectiveDuration && effectiveDuration !== selectedProc?.durationMinutes && (
                <span style={{ color: '#f59e0b' }}> · {effectiveDuration} min</span>
              )}
              {' · '}{selectedDate.split('-').reverse().join('/')} às {selectedSlot!.startTime}
            </p>
          </div>
        )}

        {/* ── Botões ────────────────────────────────────────────────────── */}
        <div className="r-btn-row" style={{ paddingTop: '4px' }}>
          <button
            onClick={() => void navigate({ to: '/app/$slug/$section', params: { slug, section: 'appointments' } })}
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
            onClick={() => { setErrorMsg(''); createMutation.mutate() }}
            disabled={!canSubmit || createMutation.isPending}
            style={{
              flex: 2, height: '44px', border: 'none',
              borderRadius: '10px',
              background: canSubmit ? 'var(--color-primary)' : '#e2e8f0',
              color: canSubmit ? '#fff' : '#94a3b8',
              fontSize: '14px', fontWeight: 600,
              cursor: !canSubmit || createMutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: canSubmit ? '0 4px 14px color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {createMutation.isPending ? 'Criando...' : 'Criar agendamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
