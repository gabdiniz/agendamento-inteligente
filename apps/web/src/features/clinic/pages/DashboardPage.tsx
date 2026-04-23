// ─── Dashboard Page ───────────────────────────────────────────────────────────
//
// Resumo do dia + métricas da semana.
// Cards com delta vs ontem, gráfico de barras (7 dias), donut de status,
// contagem de lista de espera e agenda do dia.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  appointmentsApi,
  patientsApi,
  professionalsApi,
  waitlistApi,
  type Appointment,
} from '@/lib/api/clinic.api'
import { useAuthStore } from '@/stores/auth.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Retorna label curto para exibição no eixo X do gráfico */
function dayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:       'Agendado',
  PATIENT_PRESENT: 'Chegou',
  IN_PROGRESS:     'Em atendimento',
  COMPLETED:       'Concluído',
  CANCELED:        'Cancelado',
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  SCHEDULED:       { background: '#f0f4ff', color: '#3b5bdb', border: '1px solid #bac8ff' },
  PATIENT_PRESENT: { background: '#ebfbee', color: '#2f9e44', border: '1px solid #b2f2bb' },
  IN_PROGRESS:     { background: '#fff8eb', color: '#e67700', border: '1px solid #ffec99' },
  COMPLETED:       { background: '#f3f0ff', color: '#6741d9', border: '1px solid #d0bfff' },
  CANCELED:        { background: '#fff5f5', color: '#c92a2a', border: '1px solid #ffc9c9' },
}

// Cores do donut de status
const STATUS_CHART_COLORS: Record<string, string> = {
  SCHEDULED:       '#3b5bdb',
  PATIENT_PRESENT: '#2f9e44',
  IN_PROGRESS:     '#e67700',
  COMPLETED:       '#6741d9',
  CANCELED:        '#c92a2a',
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  iconColor: string
  delta?: { value: number; label: string }  // positivo = subiu, negativo = caiu
  loading?: boolean
  delay?: number
}

function StatCard({ label, value, icon, accent, iconColor, delta, loading, delay = 0 }: StatCardProps) {
  const deltaPositive = (delta?.value ?? 0) >= 0
  const deltaColor   = deltaPositive ? '#2f9e44' : '#c92a2a'
  const deltaBg      = deltaPositive ? '#ebfbee' : '#fff5f5'
  const deltaBorder  = deltaPositive ? '#b2f2bb' : '#ffc9c9'
  const deltaSign    = deltaPositive ? '+' : ''

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #eaecef',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      animation: 'fadeUp 0.4s ease both',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        {delta !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: deltaColor,
            background: deltaBg, padding: '3px 8px', borderRadius: 20,
            border: `1px solid ${deltaBorder}`,
          }}>
            {deltaSign}{delta.value} {delta.label}
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="shimmer" style={{ height: 28, width: 60, borderRadius: 6, marginBottom: 6 }} />
        ) : (
          <p style={{ fontSize: 28, fontWeight: 700, color: '#1a2530', margin: '0 0 3px', letterSpacing: '-0.02em' }}>
            {value}
          </p>
        )}
        <p style={{ fontSize: 12.5, color: '#8a99a6', margin: 0, fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { background: '#f1f3f5', color: '#495057', border: '1px solid #dee2e6' }
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({ apt, index }: { apt: Appointment; index: number }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5', animation: 'fadeUp 0.3s ease both', animationDelay: `${index * 40}ms` }}>
      <td style={{ padding: '14px 20px' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 600,
          color: '#3b5bdb', background: '#f0f4ff', padding: '3px 8px', borderRadius: 6,
        }}>
          {formatTime(apt.startTime)}
        </span>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a2530', margin: '0 0 2px' }}>{apt.patient.name}</p>
        <p style={{ fontSize: 11, color: '#8a99a6', margin: 0 }}>{apt.patient.phone}</p>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: apt.professional.color
              ? `color-mix(in srgb, ${apt.professional.color} 20%, white)`
              : 'color-mix(in srgb, var(--color-primary) 15%, white)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            color: apt.professional.color ?? 'var(--color-primary)',
            flexShrink: 0,
          }}>
            {apt.professional.name.charAt(0)}
          </div>
          <span style={{ fontSize: 13, color: '#2d3748' }}>{apt.professional.name}</span>
        </div>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <span style={{ fontSize: 13, color: '#4a5568' }}>{apt.procedure.name}</span>
        <span style={{ fontSize: 11, color: '#b0bbc6', marginLeft: 6 }}>{apt.procedure.durationMinutes} min</span>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <StatusBadge status={apt.status} />
      </td>
    </tr>
  )
}

// ─── Bar Chart custom tooltip ─────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a2530', borderRadius: 10, padding: '8px 14px',
      fontSize: 12, color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <p style={{ margin: '0 0 2px', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, color: '#94a3b8' }}>{payload[0]?.value} agendamentos</p>
    </div>
  )
}

// ─── Donut custom tooltip ─────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a2530', borderRadius: 10, padding: '8px 14px',
      fontSize: 12, color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <p style={{ margin: '0 0 2px', fontWeight: 700 }}>{STATUS_LABEL[payload[0]?.name ?? ''] ?? payload[0]?.name}</p>
      <p style={{ margin: 0, color: '#94a3b8' }}>{payload[0]?.value} agendamentos</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuthStore()
  const today     = todayISO()
  const yesterday = offsetDate(-1)
  // últimos 7 dias: D-6 até hoje
  const weekStart = offsetDate(-6)

  // ── Queries ──────────────────────────────────────────────────────────────

  /** Agendamentos de hoje */
  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['appointments', { date: today }],
    queryFn: () => appointmentsApi.list({ scheduledDate: today, limit: 100 }),
  })

  /** Agendamentos de ontem (para delta) */
  const { data: yesterdayData } = useQuery({
    queryKey: ['appointments', { date: yesterday }],
    queryFn: () => appointmentsApi.list({ scheduledDate: yesterday, limit: 100 }),
  })

  /** Agendamentos dos últimos 7 dias (para gráfico de barras + donut) */
  const { data: weekData, isLoading: loadingWeek } = useQuery({
    queryKey: ['appointments-week', { start: weekStart, end: today }],
    queryFn: () => appointmentsApi.list({ startDate: weekStart, endDate: today, limit: 500 }),
    staleTime: 5 * 60_000,
  })

  /** Pacientes — só total */
  const { data: patientsData } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => patientsApi.list({ limit: 1 }),
    staleTime: 5 * 60_000,
  })

  /** Profissionais — só total */
  const { data: profsData } = useQuery({
    queryKey: ['professionals-count'],
    queryFn: () => professionalsApi.list({ limit: 1 }),
    staleTime: 5 * 60_000,
  })

  /** Lista de espera — apenas entradas WAITING */
  const { data: waitlistData } = useQuery({
    queryKey: ['waitlist-waiting'],
    queryFn: () => waitlistApi.list({ status: 'WAITING', limit: 1 }),
    staleTime: 5 * 60_000,
  })

  // ── Derivações ───────────────────────────────────────────────────────────

  const apts          = todayData?.data ?? []
  const yesterdayApts = yesterdayData?.data ?? []
  const weekApts      = weekData?.data ?? []

  const todayCount     = apts.length
  const yesterdayCount = yesterdayApts.length
  const deltaTodayVsYesterday = todayCount - yesterdayCount

  const todayCompleted  = apts.filter(a => a.status === 'COMPLETED').length
  const yesterdayCompleted = yesterdayApts.filter(a => a.status === 'COMPLETED').length
  const deltaCompleted  = todayCompleted - yesterdayCompleted

  const waitingCount = waitlistData?.total ?? 0

  // Gráfico de barras: quantidade por dia nos últimos 7 dias
  const barData: { day: string; total: number }[] = []
  for (let i = -6; i <= 0; i++) {
    const date = offsetDate(i)
    const count = weekApts.filter(a => a.scheduledDate === date).length
    barData.push({ day: dayLabel(date), total: count })
  }

  // Donut: distribuição de status nos últimos 7 dias
  const statusCounts: Record<string, number> = {}
  for (const apt of weekApts) {
    statusCounts[apt.status] = (statusCounts[apt.status] ?? 0) + 1
  }
  const donutData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        .shimmer {
          background: linear-gradient(90deg, #f0f2f5 25%, #e2e8f0 50%, #f0f2f5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 768px) {
          .dashboard-charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="r-page" style={{ minHeight: '100%', fontFamily: 'var(--font-sans)' }}>

        {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28, animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4vw, 26px)',
                fontStyle: 'italic', color: '#1a2530', margin: '0 0 4px', lineHeight: 1.2,
              }}>
                {greeting()}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p style={{ fontSize: 13, color: '#8a99a6', margin: 0, textTransform: 'capitalize' }}>
                {todayFormatted}
              </p>
            </div>
            <div style={{
              padding: '8px 14px', borderRadius: 10, background: '#fff',
              border: '1px solid #eaecef', fontSize: 12, fontWeight: 600, color: '#4a5568',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexShrink: 0,
            }}>
              <svg width="14" height="14" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Hoje
            </div>
          </div>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          <StatCard
            label="Agendamentos hoje"
            value={todayCount}
            loading={loadingToday}
            accent="color-mix(in srgb, var(--color-primary) 12%, white)"
            iconColor="var(--color-primary)"
            delta={{ value: deltaTodayVsYesterday, label: 'vs ontem' }}
            icon={
              <svg width="20" height="20" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            delay={0}
          />
          <StatCard
            label="Concluídos hoje"
            value={todayCompleted}
            loading={loadingToday}
            accent="#f3f0ff"
            iconColor="#6741d9"
            delta={{ value: deltaCompleted, label: 'vs ontem' }}
            icon={
              <svg width="20" height="20" fill="none" stroke="#6741d9" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
              </svg>
            }
            delay={60}
          />
          <StatCard
            label="Total de pacientes"
            value={patientsData?.total ?? '—'}
            accent="#fff8eb"
            iconColor="#e67700"
            icon={
              <svg width="20" height="20" fill="none" stroke="#e67700" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            delay={120}
          />
          <StatCard
            label="Aguardando vaga"
            value={waitingCount}
            accent="#fffbeb"
            iconColor="#d97706"
            icon={
              <svg width="20" height="20" fill="none" stroke="#d97706" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            delay={180}
          />
        </div>

        {/* ── Gráficos ────────────────────────────────────────────────────────── */}
        <div className="dashboard-charts-grid">
          {/* Gráfico de barras — 7 dias */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #eaecef',
            padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            animation: 'fadeUp 0.4s ease 0.15s both',
          }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#1a2530' }}>
                Agendamentos — últimos 7 dias
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                {weekApts.length} total no período
              </p>
            </div>

            {loadingWeek ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600, style: { textTransform: 'capitalize' } }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    width={30}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}
                    fill="var(--color-primary)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut — distribuição de status */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #eaecef',
            padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            animation: 'fadeUp 0.4s ease 0.2s both',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#1a2530' }}>
                Status — 7 dias
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Distribuição por status</p>
            </div>

            {loadingWeek ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : donutData.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <svg width="32" height="32" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sem dados</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={42} outerRadius={64}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map(entry => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_CHART_COLORS[entry.name] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legenda */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {donutData.map(entry => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: STATUS_CHART_COLORS[entry.name] ?? '#94a3b8',
                          display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {STATUS_LABEL[entry.name] ?? entry.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2530' }}>
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Agenda do dia ──────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #eaecef',
          overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          animation: 'fadeUp 0.4s ease 0.25s both',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #f0f2f5',
          }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a2530', margin: '0 0 2px' }}>
                Agenda de hoje
              </h2>
              <p style={{ fontSize: 12, color: '#8a99a6', margin: 0 }}>
                {apts.length > 0 ? `${apts.length} agendamento${apts.length !== 1 ? 's' : ''}` : 'Nenhum agendamento'}
              </p>
            </div>
            {apts.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: `${apts.filter(a => ['SCHEDULED','PATIENT_PRESENT','IN_PROGRESS'].includes(a.status)).length} ativos`, color: '#2f9e44', bg: '#ebfbee' },
                  { label: `${todayCompleted} concluídos`, color: '#6741d9', bg: '#f3f0ff' },
                ].map(({ label, color, bg }) => (
                  <span key={label} style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '3px 10px', borderRadius: 20 }}>
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {loadingToday ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#b0bbc6' }}>
              <div style={{ width: 32, height: 32, border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, margin: 0 }}>Carregando agenda...</p>
            </div>
          ) : apts.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center', color: '#b0bbc6' }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#4a5568', margin: '0 0 4px' }}>Dia livre por enquanto</p>
              <p style={{ fontSize: 13, margin: 0 }}>Nenhum agendamento para hoje.</p>
            </div>
          ) : (
            <div className="r-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                    {['Horário', 'Paciente', 'Profissional', 'Procedimento', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '10px 20px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: '#8a99a6',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apts.map((apt, i) => (
                    <AppointmentRow key={apt.id} apt={apt} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé info */}
        {profsData && (
          <p style={{ fontSize: 11.5, color: '#b0bbc6', marginTop: 16, textAlign: 'right' }}>
            {profsData.total} profissional{profsData.total !== 1 ? 'is' : ''} ativo{profsData.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </>
  )
}
