// ─── WorkSchedulePage ─────────────────────────────────────────────────────────
//
// Configura os horários de trabalho de um profissional por dia da semana.
// Cada dia pode ser ativado/desativado individualmente, com horário de início,
// fim e intervalo entre slots (15 | 20 | 30 | 45 | 60 min).
//
// Rotas do backend consumidas:
//   GET    /t/:slug/professionals/:id/schedule
//   PUT    /t/:slug/professionals/:id/schedule/:day
//   DELETE /t/:slug/professionals/:id/schedule/:day
//   PATCH  /t/:slug/professionals/:id/schedule/:day/activate
//   PATCH  /t/:slug/professionals/:id/schedule/:day/deactivate
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { professionalsApi, workScheduleApi, type WorkScheduleRecord } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Constantes ───────────────────────────────────────────────────────────────

// Ordem de exibição: Seg→Dom (convenção BR)
const DAYS: { label: string; short: string; value: number }[] = [
  { label: 'Segunda-feira', short: 'Seg', value: 1 },
  { label: 'Terça-feira',   short: 'Ter', value: 2 },
  { label: 'Quarta-feira',  short: 'Qua', value: 3 },
  { label: 'Quinta-feira',  short: 'Qui', value: 4 },
  { label: 'Sexta-feira',   short: 'Sex', value: 5 },
  { label: 'Sábado',        short: 'Sáb', value: 6 },
  { label: 'Domingo',       short: 'Dom', value: 0 },
]

const SLOT_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
]

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface DayState {
  dayOfWeek: number
  enabled: boolean      // tem registro no backend?
  active: boolean       // isActive no registro?
  startTime: string
  endTime: string
  slotIntervalMinutes: number
  dirty: boolean        // tem alteração não salva?
  saving: boolean
  error: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialState(records: WorkScheduleRecord[]): DayState[] {
  return DAYS.map(({ value: dayOfWeek }) => {
    const rec = records.find((r) => r.dayOfWeek === dayOfWeek)
    if (rec) {
      return {
        dayOfWeek,
        enabled: true,
        active: rec.isActive,
        startTime: rec.startTime,
        endTime: rec.endTime,
        slotIntervalMinutes: rec.slotIntervalMinutes,
        dirty: false,
        saving: false,
        error: null,
      }
    }
    return {
      dayOfWeek,
      enabled: false,
      active: false,
      startTime: '08:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      dirty: false,
      saving: false,
      error: null,
    }
  })
}

function countSlots(start: string, end: string, interval: number): number {
  const [sh, sm] = start.split(':').map(Number) as [number, number]
  const [eh, em] = end.split(':').map(Number) as [number, number]
  const totalMin = (eh * 60 + em) - (sh * 60 + sm)
  if (totalMin <= 0) return 0
  return Math.floor(totalMin / interval)
}

// ─── Estilos compartilhados ───────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em',
  marginBottom: '5px',
}

const timeInputStyle: React.CSSProperties = {
  height: '38px', padding: '0 10px',
  border: '1.5px solid #e2e8f0', borderRadius: '8px',
  fontSize: '13px', color: '#1a2530', background: '#fff',
  outline: 'none', fontFamily: 'var(--font-sans)',
  width: '90px',
}

const selectStyle: React.CSSProperties = {
  height: '38px', padding: '0 10px',
  border: '1.5px solid #e2e8f0', borderRadius: '8px',
  fontSize: '13px', color: '#1a2530', background: '#fff',
  outline: 'none', fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      aria-pressed={on}
      style={{
        position: 'relative',
        width: '42px', height: '24px',
        borderRadius: '12px',
        border: 'none',
        background: on ? 'var(--color-primary)' : '#e2e8f0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s ease',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: on ? '21px' : '3px',
        width: '18px', height: '18px',
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s ease',
        display: 'block',
      }} />
    </button>
  )
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

function DayCard({
  state,
  dayInfo,
  onToggleEnabled,
  onToggleActive,
  onChange,
  onSave,
  onRemove,
}: {
  state: DayState
  dayInfo: typeof DAYS[number]
  onToggleEnabled: () => void
  onToggleActive: () => void
  onChange: (field: 'startTime' | 'endTime' | 'slotIntervalMinutes', value: string | number) => void
  onSave: () => void
  onRemove: () => void
}) {
  const slots = countSlots(state.startTime, state.endTime, state.slotIntervalMinutes)
  const isWeekend = state.dayOfWeek === 0 || state.dayOfWeek === 6

  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px',
      border: `1.5px solid ${state.enabled ? (state.active ? 'var(--color-primary)' : '#e2e8f0') : '#f0f2f5'}`,
      padding: '20px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: state.enabled && state.active
        ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent)'
        : '0 1px 4px rgba(0,0,0,0.04)',
      opacity: state.enabled ? 1 : 0.65,
    }}>

      {/* ── Cabeçalho do card ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: state.enabled ? '16px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '10px',
            background: state.enabled && state.active
              ? 'color-mix(in srgb, var(--color-primary) 12%, white)'
              : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              color: state.enabled && state.active ? 'var(--color-primary)' : '#94a3b8',
              letterSpacing: '0.02em',
            }}>
              {dayInfo.short}
            </span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1a2530' }}>
              {dayInfo.label}
            </p>
            {state.enabled && (
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                {state.active
                  ? `${slots} slot${slots !== 1 ? 's' : ''} disponíve${slots !== 1 ? 'is' : 'l'}`
                  : 'Dia desativado'}
              </p>
            )}
            {!state.enabled && (
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#cbd5e1' }}>
                {isWeekend ? 'Não configurado' : 'Não configurado'}
              </p>
            )}
          </div>
        </div>

        {/* Toggle principal — habilita/desabilita o dia */}
        <Toggle
          on={state.enabled}
          onChange={onToggleEnabled}
          disabled={state.saving}
        />
      </div>

      {/* ── Configuração (visível só quando habilitado) ────────────────── */}
      {state.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Linha: início, fim, intervalo */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end',
          }}>
            {/* Início */}
            <div>
              <label style={labelStyle}>Início</label>
              <input
                type="time"
                value={state.startTime}
                disabled={state.saving}
                onChange={(e) => onChange('startTime', e.target.value)}
                style={{ ...timeInputStyle, borderColor: state.error ? '#fca5a5' : '#e2e8f0' }}
              />
            </div>

            {/* Fim */}
            <div>
              <label style={labelStyle}>Fim</label>
              <input
                type="time"
                value={state.endTime}
                disabled={state.saving}
                onChange={(e) => onChange('endTime', e.target.value)}
                style={{ ...timeInputStyle, borderColor: state.error ? '#fca5a5' : '#e2e8f0' }}
              />
            </div>

            {/* Intervalo */}
            <div>
              <label style={labelStyle}>Intervalo</label>
              <select
                value={state.slotIntervalMinutes}
                disabled={state.saving}
                onChange={(e) => onChange('slotIntervalMinutes', Number(e.target.value))}
                style={selectStyle}
              >
                {SLOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Ativar/Desativar (sem remover o registro) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginLeft: 'auto' }}>
              <Toggle
                on={state.active}
                onChange={onToggleActive}
                disabled={state.saving}
              />
              <span style={{ fontSize: '12px', color: state.active ? 'var(--color-primary)' : '#94a3b8', fontWeight: 600 }}>
                {state.active ? 'Ativo' : 'Pausado'}
              </span>
            </div>
          </div>

          {/* Erro */}
          {state.error && (
            <p style={{ margin: 0, fontSize: '12px', color: '#dc2626' }}>{state.error}</p>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {state.dirty && (
              <button
                onClick={onSave}
                disabled={state.saving}
                style={{
                  height: '34px', padding: '0 16px', borderRadius: '8px',
                  background: 'var(--color-primary)', color: '#fff', border: 'none',
                  fontSize: '12px', fontWeight: 700,
                  cursor: state.saving ? 'wait' : 'pointer',
                  opacity: state.saving ? 0.7 : 1,
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'opacity 0.15s',
                }}
              >
                {state.saving ? (
                  <>
                    <div style={{
                      width: '11px', height: '11px',
                      border: '1.5px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Salvar
                  </>
                )}
              </button>
            )}

            {/* Remover dia */}
            <button
              onClick={onRemove}
              disabled={state.saving}
              title="Remover dia"
              style={{
                height: '34px', padding: '0 10px', borderRadius: '8px',
                background: 'transparent', color: '#94a3b8',
                border: '1.5px solid #e2e8f0',
                fontSize: '12px', fontWeight: 600,
                cursor: state.saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: '5px',
                marginLeft: state.dirty ? 0 : 'auto',
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WorkSchedulePage() {
  const params   = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug     = params.slug ?? clinicTokens.getSlug() ?? ''
  const id       = params.id ?? ''
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [days, setDays] = useState<DayState[]>([])
  const [initialized, setInitialized] = useState(false)

  // ── Busca profissional e horários em paralelo ──────────────────────────────

  const { data: professional, isLoading: loadingProf } = useQuery({
    queryKey: ['professional', id],
    queryFn:  () => professionalsApi.get(id),
    enabled:  !!id,
  })

  const { data: scheduleRecords, isLoading: loadingSched } = useQuery({
    queryKey: ['work-schedule', id],
    queryFn:  () => workScheduleApi.list(id),
    enabled:  !!id,
  })

  // ── Inicializa o estado local dos dias quando os dados chegam ─────────────

  useEffect(() => {
    if (scheduleRecords !== undefined && !initialized) {
      setDays(buildInitialState(scheduleRecords))
      setInitialized(true)
    }
  }, [scheduleRecords, initialized])

  // ── Upsert mutation ───────────────────────────────────────────────────────

  const upsertMutation = useMutation({
    mutationFn: ({ dayOfWeek, payload }: { dayOfWeek: number; payload: { startTime: string; endTime: string; slotIntervalMinutes: number } }) =>
      workScheduleApi.upsert(id, dayOfWeek, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['work-schedule', id] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (dayOfWeek: number) => workScheduleApi.remove(id, dayOfWeek),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['work-schedule', id] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: ({ dayOfWeek, active }: { dayOfWeek: number; active: boolean }) =>
      active ? workScheduleApi.activate(id, dayOfWeek) : workScheduleApi.deactivate(id, dayOfWeek),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['work-schedule', id] })
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  function setDay(dayOfWeek: number, patch: Partial<DayState>) {
    setDays((prev) =>
      prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)
    )
  }

  function handleToggleEnabled(dayOfWeek: number) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)!
    if (!day.enabled) {
      // Habilitar: marcar como dirty para que o usuário salve
      setDay(dayOfWeek, { enabled: true, active: true, dirty: true, error: null })
    } else {
      // Desabilitar: remove o registro (confirma visualmente antes)
      handleRemove(dayOfWeek)
    }
  }

  function handleToggleActive(dayOfWeek: number) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)!
    const newActive = !day.active

    setDay(dayOfWeek, { saving: true, error: null })

    activateMutation.mutate(
      { dayOfWeek, active: newActive },
      {
        onSuccess: () => setDay(dayOfWeek, { active: newActive, saving: false }),
        onError: () => setDay(dayOfWeek, { saving: false, error: 'Erro ao alterar status do dia.' }),
      },
    )
  }

  function handleChange(dayOfWeek: number, field: 'startTime' | 'endTime' | 'slotIntervalMinutes', value: string | number) {
    setDay(dayOfWeek, { [field]: value, dirty: true, error: null })
  }

  function handleSave(dayOfWeek: number) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)!

    // Validação client-side
    if (!day.startTime || !day.endTime) {
      setDay(dayOfWeek, { error: 'Preencha o horário de início e fim.' })
      return
    }
    if (day.startTime >= day.endTime) {
      setDay(dayOfWeek, { error: 'O horário de início deve ser anterior ao de fim.' })
      return
    }
    const slots = countSlots(day.startTime, day.endTime, day.slotIntervalMinutes)
    if (slots < 1) {
      setDay(dayOfWeek, { error: 'Nenhum slot gerado com esse intervalo. Ajuste os horários.' })
      return
    }

    setDay(dayOfWeek, { saving: true, error: null })

    upsertMutation.mutate(
      {
        dayOfWeek,
        payload: {
          startTime: day.startTime,
          endTime: day.endTime,
          slotIntervalMinutes: day.slotIntervalMinutes,
        },
      },
      {
        onSuccess: () => setDay(dayOfWeek, { saving: false, dirty: false, enabled: true }),
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          setDay(dayOfWeek, { saving: false, error: msg ?? 'Erro ao salvar horário.' })
        },
      },
    )
  }

  function handleRemove(dayOfWeek: number) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)!

    // Se nunca foi salvo (dirty e sem registro), apenas limpa o estado local
    if (day.dirty && !scheduleRecords?.find((r) => r.dayOfWeek === dayOfWeek)) {
      setDay(dayOfWeek, {
        enabled: false, active: false, dirty: false,
        startTime: '08:00', endTime: '18:00', slotIntervalMinutes: 30, error: null,
      })
      return
    }

    setDay(dayOfWeek, { saving: true, error: null })

    removeMutation.mutate(dayOfWeek, {
      onSuccess: () => setDay(dayOfWeek, {
        saving: false, enabled: false, active: false, dirty: false,
        startTime: '08:00', endTime: '18:00', slotIntervalMinutes: 30,
      }),
      onError: () => setDay(dayOfWeek, { saving: false, error: 'Erro ao remover o dia.' }),
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = loadingProf || loadingSched

  const enabledCount = days.filter((d) => d.enabled && d.active).length

  return (
    <div className="r-page" style={{ maxWidth: '760px', fontFamily: 'var(--font-sans)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px', animation: 'fadeUp 0.35s ease both' }}>
        <button
          onClick={() => void navigate({ to: '/app/$slug/professionals/$id/edit', params: { slug, id } })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: '#64748b', padding: 0,
            marginBottom: '12px', fontFamily: 'var(--font-sans)',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para o profissional
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(20px, 4vw, 26px)',
              fontWeight: 400,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              color: '#1a2530',
              letterSpacing: '-0.02em',
            }}>
              Horários de Trabalho
            </h1>
            {professional && (
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                {professional.name}
                {professional.specialty ? ` · ${professional.specialty}` : ''}
              </p>
            )}
          </div>

          {/* Resumo rápido */}
          {!isLoading && days.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '10px',
              background: enabledCount > 0 ? 'color-mix(in srgb, var(--color-primary) 8%, white)' : '#f8fafc',
              border: `1.5px solid ${enabledCount > 0 ? 'color-mix(in srgb, var(--color-primary) 25%, white)' : '#e2e8f0'}`,
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: enabledCount > 0 ? 'var(--color-primary)' : '#94a3b8',
              }} />
              <span style={{
                fontSize: '12.5px', fontWeight: 600,
                color: enabledCount > 0 ? 'var(--color-primary)' : '#94a3b8',
              }}>
                {enabledCount === 0
                  ? 'Nenhum dia configurado'
                  : `${enabledCount} dia${enabledCount !== 1 ? 's' : ''} ativo${enabledCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Aviso se nenhum dia configurado ─────────────────────────────── */}
      {!isLoading && enabledCount === 0 && initialized && (
        <div style={{
          marginBottom: '20px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <svg width="16" height="16" fill="none" stroke="#d97706" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
            <strong>Nenhum dia de trabalho configurado.</strong>{' '}
            Sem horários definidos, nenhum slot de agendamento será gerado para este profissional.
            Ative os dias abaixo para começar.
          </p>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DAYS.map((d) => (
            <div key={d.value} style={{
              height: '76px', borderRadius: '14px',
              background: 'linear-gradient(90deg, #f8fafc 25%, #f0f2f5 50%, #f8fafc 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }} />
          ))}
          <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      ) : (
        /* ── Grade de dias ──────────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DAYS.map((dayInfo) => {
            const state = days.find((d) => d.dayOfWeek === dayInfo.value)
            if (!state) return null
            return (
              <DayCard
                key={dayInfo.value}
                state={state}
                dayInfo={dayInfo}
                onToggleEnabled={() => handleToggleEnabled(dayInfo.value)}
                onToggleActive={() => handleToggleActive(dayInfo.value)}
                onChange={(field, value) => handleChange(dayInfo.value, field, value)}
                onSave={() => handleSave(dayInfo.value)}
                onRemove={() => handleRemove(dayInfo.value)}
              />
            )
          })}
        </div>
      )}

      {/* ── Dica de uso ─────────────────────────────────────────────────── */}
      {!isLoading && initialized && (
        <div style={{
          marginTop: '24px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #f0f2f5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <svg width="15" height="15" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>
            <strong>Toggle principal</strong> (direita do nome do dia) — adiciona ou remove o dia.{' '}
            <strong>Toggle "Ativo/Pausado"</strong> — mantém o horário salvo mas suspende a geração de slots temporariamente.
            As alterações de horário precisam ser confirmadas com o botão <em>Salvar</em>.
          </p>
        </div>
      )}
    </div>
  )
}
