// ─── Dashboard Page ───────────────────────────────────────────────────────────
//
// Resumo do dia: agendamentos, status, pacientes.
// Redesign: header clean com saudação, stat cards refinados, tabela polida.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { appointmentsApi, patientsApi, professionalsApi, type Appointment } from '@/lib/api/clinic.api'
import { useAuthStore } from '@/stores/auth.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

function formatTime(t: string) {
  // startTime/endTime já chegam como "HH:MM" do backend — não precisa de Date
  return t.slice(0, 5)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
}

const statusStyle: Record<string, React.CSSProperties> = {
  SCHEDULED: { background: '#f0f4ff', color: '#3b5bdb', border: '1px solid #bac8ff' },
  CONFIRMED: { background: '#ebfbee', color: '#2f9e44', border: '1px solid #b2f2bb' },
  COMPLETED: { background: '#f3f0ff', color: '#6741d9', border: '1px solid #d0bfff' },
  CANCELLED: { background: '#fff5f5', color: '#c92a2a', border: '1px solid #ffc9c9' },
  NO_SHOW:   { background: '#fff8eb', color: '#e67700', border: '1px solid #ffec99' },
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
  delta,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  delta?: string
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px',
      border: '1px solid #eaecef',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
      animation: 'fadeUp 0.4s ease both',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '10px',
          background: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
        {delta && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2f9e44', background: '#ebfbee', padding: '3px 8px', borderRadius: '20px', border: '1px solid #b2f2bb' }}>
            {delta}
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: '28px', fontWeight: 700, color: '#1a2530', margin: '0 0 3px', letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
          {value}
        </p>
        <p style={{ fontSize: '12.5px', color: '#8a99a6', margin: 0, fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = statusStyle[status] ?? { background: '#f1f3f5', color: '#495057', border: '1px solid #dee2e6' }
  return (
    <span style={{
      ...s,
      fontSize: '11px',
      fontWeight: 600,
      padding: '3px 9px',
      borderRadius: '20px',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {statusLabel[status] ?? status}
    </span>
  )
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({ apt, index }: { apt: Appointment; index: number }) {
  return (
    <tr style={{
      borderBottom: '1px solid #f0f2f5',
      animation: 'fadeUp 0.3s ease both',
      animationDelay: `${index * 40}ms`,
    }}>
      <td style={{ padding: '14px 20px' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '13px',
          fontWeight: 600,
          color: '#3b5bdb',
          background: '#f0f4ff',
          padding: '3px 8px',
          borderRadius: '6px',
        }}>
          {formatTime(apt.startTime)}
        </span>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a2530', margin: '0 0 2px' }}>{apt.patient.name}</p>
        <p style={{ fontSize: '11px', color: '#8a99a6', margin: 0 }}>{apt.patient.phone}</p>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '50%',
            background: apt.professional.color
              ? `color-mix(in srgb, ${apt.professional.color} 20%, white)`
              : 'color-mix(in srgb, var(--color-primary) 15%, white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: apt.professional.color ?? 'var(--color-primary)',
            flexShrink: 0,
          }}>
            {apt.professional.name.charAt(0)}
          </div>
          <span style={{ fontSize: '13px', color: '#2d3748' }}>{apt.professional.name}</span>
        </div>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <span style={{ fontSize: '13px', color: '#4a5568' }}>{apt.procedure.name}</span>
        <span style={{ fontSize: '11px', color: '#b0bbc6', marginLeft: '6px' }}>
          {apt.procedure.durationMinutes} min
        </span>
      </td>
      <td style={{ padding: '14px 20px' }}>
        <StatusBadge status={apt.status} />
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuthStore()
  const today = todayISO()

  const { data: todayApts, isLoading: loadingApts } = useQuery({
    queryKey: ['appointments', { date: today }],
    queryFn: () => appointmentsApi.list({ date: today, limit: 50 }),
  })

  const { data: patients } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => patientsApi.list({ limit: 1 }),
  })

  const { data: profs } = useQuery({
    queryKey: ['professionals-count'],
    queryFn: () => professionalsApi.list({ limit: 1 }),
  })

  const apts = todayApts?.data ?? []
  const confirmed = apts.filter((a) => ['CONFIRMED', 'SCHEDULED'].includes(a.status)).length
  const completed = apts.filter((a) => a.status === 'COMPLETED').length

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div style={{ padding: '32px', minHeight: '100%', fontFamily: 'var(--font-sans)' }}>

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px', animation: 'fadeUp 0.35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '26px',
              fontStyle: 'italic',
              color: '#1a2530',
              margin: '0 0 4px',
              lineHeight: 1.2,
            }}>
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: '13px', color: '#8a99a6', margin: 0, textTransform: 'capitalize' }}>
              {todayFormatted}
            </p>
          </div>

          {/* Badge de hoje */}
          <div style={{
            padding: '8px 14px',
            borderRadius: '10px',
            background: '#fff',
            border: '1px solid #eaecef',
            fontSize: '12px',
            fontWeight: 600,
            color: '#4a5568',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <svg width="14" height="14" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Hoje
          </div>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <StatCard
          label="Agendamentos hoje"
          value={apts.length}
          accent="color-mix(in srgb, var(--color-primary) 12%, white)"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Pendentes / Confirmados"
          value={confirmed}
          accent="#ebfbee"
          icon={
            <svg width="20" height="20" fill="none" stroke="#2f9e44" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Concluídos hoje"
          value={completed}
          accent="#f3f0ff"
          icon={
            <svg width="20" height="20" fill="none" stroke="#6741d9" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          label="Total de pacientes"
          value={patients?.total ?? '—'}
          accent="#fff8eb"
          icon={
            <svg width="20" height="20" fill="none" stroke="#e67700" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      {/* ── Tabela de agendamentos ────────────────────────────── */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #eaecef',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        animation: 'fadeUp 0.4s ease both',
        animationDelay: '120ms',
      }}>
        {/* Cabeçalho da tabela */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #f0f2f5',
        }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1a2530', margin: '0 0 2px' }}>
              Agenda de hoje
            </h2>
            <p style={{ fontSize: '12px', color: '#8a99a6', margin: 0 }}>
              {apts.length > 0 ? `${apts.length} agendamento${apts.length !== 1 ? 's' : ''}` : 'Nenhum agendamento'}
            </p>
          </div>
          {apts.length > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: `${confirmed} ativos`, color: '#2f9e44', bg: '#ebfbee' },
                { label: `${completed} concluídos`, color: '#6741d9', bg: '#f3f0ff' },
              ].map(({ label, color, bg }) => (
                <span key={label} style={{
                  fontSize: '11px', fontWeight: 600,
                  color, background: bg,
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}>
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {loadingApts ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#b0bbc6' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '2px solid #eaecef',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: '13px', margin: 0 }}>Carregando agenda...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : apts.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center', color: '#b0bbc6' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#4a5568', margin: '0 0 4px' }}>
              Dia livre por enquanto
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>Nenhum agendamento para hoje.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Horário', 'Paciente', 'Profissional', 'Procedimento', 'Status'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 20px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#8a99a6',
                    }}>
                      {h}
                    </th>
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
      {profs && (
        <p style={{ fontSize: '11.5px', color: '#b0bbc6', marginTop: '16px', textAlign: 'right' }}>
          {profs.total} profissional{profs.total !== 1 ? 'is' : ''} ativo{profs.total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
