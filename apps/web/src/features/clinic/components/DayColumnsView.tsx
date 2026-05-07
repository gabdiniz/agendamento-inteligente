// ─── DayColumnsView ────────────────────────────────────────────────────────────
//
// Visao de dia com multiplas colunas — uma por profissional.
// Paginacao responsiva: quantas colunas cabem no container sao exibidas por vez.
// Clique em slot vazio -> criar agendamento; clique em bloco -> detalhe.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import type { Appointment, Professional } from '@/lib/api/clinic.api'

// ─── Config ───────────────────────────────────────────────────────────────────

const HOUR_HEIGHT     = 64        // px por hora
const START_HOUR      = 6         // 06:00
const END_HOUR        = 22        // 22:00
const TOTAL_HOURS     = END_HOUR - START_HOUR
const TOTAL_HEIGHT    = TOTAL_HOURS * HOUR_HEIGHT
const TIME_AXIS_WIDTH = 52        // px da coluna de horarios

// ─── Helpers de tempo ─────────────────────────────────────────────────────────

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return ((h! - START_HOUR) * 60 + m!) * (HOUR_HEIGHT / 60)
}

function durationToHeight(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const mins = (eh! * 60 + em!) - (sh! * 60 + sm!)
  return Math.max(mins * (HOUR_HEIGHT / 60), 22)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(d)
}

function getNowY(): number {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  return (mins - START_HOUR * 60) * (HOUR_HEIGHT / 60)
}

// ─── Colunas visiveis por tamanho de container ───────────────────────────────

function useColumnsPerPage(ref: React.RefObject<HTMLDivElement | null>): number {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const w = el.offsetWidth - TIME_AXIS_WIDTH
      if (w < 280)       setCols(1)
      else if (w < 480)  setCols(2)
      else if (w < 720)  setCols(3)
      else if (w < 1050) setCols(4)
      else               setCols(5)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return cols
}

// ─── Estilos reutilizaveis ────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: '8px',
  border: '1.5px solid #e2e8f0', background: '#fff',
  color: '#374151', cursor: 'pointer', flexShrink: 0,
  fontFamily: 'var(--font-sans)',
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DayColumnsViewProps {
  date: string
  professionals: Professional[]
  appointments: Appointment[]
  loading: boolean
  onDateChange: (date: string) => void
  onAppointmentClick: (apt: Appointment) => void
  onNewAppointment: (date: string, time: string, professionalId: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────

export function DayColumnsView({
  date,
  professionals,
  appointments,
  loading,
  onDateChange,
  onAppointmentClick,
  onNewAppointment,
}: DayColumnsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const columnsPerPage = useColumnsPerPage(containerRef)
  const [page, setPage] = useState(0)

  // Reset pagina quando o numero de profissionais ou colunas muda
  useEffect(() => { setPage(0) }, [professionals.length, columnsPerPage])

  const totalPages   = Math.ceil(Math.max(professionals.length, 1) / columnsPerPage)
  const visibleProfs = professionals.slice(
    page * columnsPerPage,
    (page + 1) * columnsPerPage,
  )

  // Agrupamento: professional.id -> lista de agendamentos
  const byProf: Record<string, Appointment[]> = {}
  for (const apt of appointments) {
    if (!byProf[apt.professional.id]) byProf[apt.professional.id] = []
    byProf[apt.professional.id]!.push(apt)
  }

  // Indicador de hora atual
  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday  = date === todayStr
  const [nowY, setNowY] = useState(getNowY)
  useEffect(() => {
    if (!isToday) return
    const t = setInterval(() => setNowY(getNowY()), 60_000)
    return () => clearInterval(t)
  }, [isToday])

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

  return (
    <div style={{ position: 'relative', fontFamily: 'var(--font-sans)' }}>

      {/* ── Barra de navegacao ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
      }}>

        {/* Navegacao de data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onDateChange(addDays(date, -1))}
            style={navBtn}
            title="Dia anterior"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => onDateChange(todayStr)}
            style={{
              ...navBtn,
              width: 'auto', padding: '0 14px',
              fontWeight: 700, fontSize: '12.5px',
              background: isToday ? 'var(--color-primary)' : '#fff',
              color:      isToday ? '#fff' : '#374151',
              border:     isToday ? '1.5px solid var(--color-primary)' : '1.5px solid #e2e8f0',
            }}
          >
            Hoje
          </button>

          <span style={{
            fontSize: '15px', fontWeight: 700, color: '#1a2530',
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            textTransform: 'capitalize',
          }}>
            {formatDayLabel(date)}
          </span>

          <button
            onClick={() => onDateChange(addDays(date, 1))}
            style={navBtn}
            title="Proximo dia"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Paginacao de profissionais */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {page * columnsPerPage + 1}
              {' – '}
              {Math.min((page + 1) * columnsPerPage, professionals.length)}
              {' de '}
              {professionals.length}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ ...navBtn, opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ ...navBtn, opacity: page >= totalPages - 1 ? 0.4 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Grid principal ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          border: '1px solid #f0f2f5', borderRadius: '12px',
          overflow: 'hidden', background: '#fff',
        }}
      >

        {/* Cabecalho: nomes dos profissionais */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #f0f2f5',
          background: '#fafbfc',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          {/* Espacador do eixo de tempo */}
          <div style={{
            width: `${TIME_AXIS_WIDTH}px`, flexShrink: 0,
            borderRight: '1px solid #f0f2f5',
          }} />

          {/* Colunas de profissionais */}
          {visibleProfs.map((prof, idx) => (
            <div
              key={prof.id}
              style={{
                flex: 1, minWidth: 0,
                padding: '10px 6px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '4px',
                borderRight: idx < visibleProfs.length - 1 ? '1px solid #f0f2f5' : 'none',
              }}
            >
              {/* Avatar */}
              {prof.avatarUrl ? (
                <img
                  src={`${(import.meta.env.VITE_API_URL as string) ?? ''}${prof.avatarUrl}`}
                  alt={prof.name}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: prof.color ?? 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '12px', fontWeight: 700,
                }}>
                  {prof.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#1a2530',
                textAlign: 'center', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}>
                {prof.name}
              </span>

              {prof.specialty && (
                <span style={{
                  fontSize: '10px', color: '#94a3b8',
                  textAlign: 'center', lineHeight: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}>
                  {prof.specialty}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Corpo com scroll vertical */}
        <div style={{ overflowY: 'auto', maxHeight: '68vh' }}>
          <div style={{ display: 'flex' }}>

            {/* Eixo de tempo (coluna esquerda) */}
            <div style={{
              width: `${TIME_AXIS_WIDTH}px`, flexShrink: 0,
              borderRight: '1px solid #f0f2f5', background: '#fff',
            }}>
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    height: `${HOUR_HEIGHT}px`,
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    paddingRight: '8px', paddingTop: '4px',
                    borderBottom: '1px solid #f8fafc',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', lineHeight: 1 }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Area das colunas */}
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>

              {/* Indicador de hora atual */}
              {isToday && nowY >= 0 && nowY <= TOTAL_HEIGHT && (
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  top: `${nowY}px`, height: '2px',
                  background: 'var(--color-primary)',
                  zIndex: 6, pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute', left: '-5px', top: '-5px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: 'var(--color-primary)',
                  }} />
                </div>
              )}

              {/* Estado vazio */}
              {visibleProfs.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: `${TOTAL_HEIGHT}px`, color: '#94a3b8', fontSize: '13px',
                }}>
                  Nenhum profissional ativo
                </div>
              )}

              {/* Colunas de profissionais */}
              {visibleProfs.map((prof, idx) => {
                const profApts = byProf[prof.id] ?? []
                const isLast  = idx === visibleProfs.length - 1

                return (
                  <div
                    key={prof.id}
                    onClick={(e) => {
                      // Clique em area vazia -> novo agendamento
                      const rect     = e.currentTarget.getBoundingClientRect()
                      const yOff     = e.clientY - rect.top
                      const totalMin = Math.round((yOff / HOUR_HEIGHT) * 60) + START_HOUR * 60
                      const hh       = Math.floor(totalMin / 60)
                      const mm       = Math.floor((totalMin % 60) / 30) * 30
                      if (hh >= START_HOUR && hh < END_HOUR) {
                        onNewAppointment(
                          date,
                          `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
                          prof.id,
                        )
                      }
                    }}
                    style={{
                      flex: 1, minWidth: 0,
                      position: 'relative',
                      height: `${TOTAL_HEIGHT}px`,
                      borderRight: isLast ? 'none' : '1px solid #f0f2f5',
                      cursor: 'cell',
                    }}
                  >
                    {/* Linhas de hora */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{
                          position: 'absolute', left: 0, right: 0,
                          top: `${(h - START_HOUR) * HOUR_HEIGHT}px`,
                          borderTop: '1px solid #f0f2f5',
                          height: `${HOUR_HEIGHT}px`,
                          pointerEvents: 'none',
                        }}
                      >
                        {/* Linha de meia hora (tracejada) */}
                        <div style={{
                          position: 'absolute', left: 0, right: 0,
                          top: `${HOUR_HEIGHT / 2}px`,
                          borderTop: '1px dashed #f5f7fa',
                          pointerEvents: 'none',
                        }} />
                      </div>
                    ))}

                    {/* Blocos de agendamento */}
                    {profApts.map((apt) => {
                      const y          = timeToY(apt.startTime)
                      const h          = durationToHeight(apt.startTime, apt.endTime)
                      const color      = apt.procedure.color ?? apt.professional.color ?? 'var(--color-primary)'
                      const isCanceled = apt.status === 'CANCELED'

                      return (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick(apt)
                          }}
                          title={`${apt.patient.name} - ${apt.startTime.slice(0,5)} ate ${apt.endTime.slice(0,5)}`}
                          style={{
                            position: 'absolute',
                            left: '3px', right: '3px',
                            top: `${y}px`,
                            height: `${h}px`,
                            background: color,
                            borderRadius: '6px',
                            padding: '3px 6px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            zIndex: 4,
                            opacity: isCanceled ? 0.35 : 1,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                            transition: 'box-shadow 0.15s, transform 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isCanceled) {
                              const el = e.currentTarget as HTMLElement
                              el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.28)'
                              el.style.transform = 'scale(1.01)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLElement
                            el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.18)'
                            el.style.transform = 'scale(1)'
                          }}
                        >
                          <div style={{
                            fontSize: '11px', fontWeight: 700, color: '#fff',
                            lineHeight: 1.3, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {apt.patient.name}
                          </div>
                          {h > 34 && (
                            <div style={{
                              fontSize: '10px', color: 'rgba(255,255,255,0.88)',
                              lineHeight: 1.2, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {apt.procedure.name}
                            </div>
                          )}
                          {h > 50 && (
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>
                              {apt.startTime.slice(0, 5)}
                              {' – '}
                              {apt.endTime.slice(0, 5)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spinner de carregamento */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.65)', borderRadius: '12px',
        }}>
          <div style={{
            width: '24px', height: '24px',
            border: '2px solid #e2e8f0',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
    </div>
  )
}
