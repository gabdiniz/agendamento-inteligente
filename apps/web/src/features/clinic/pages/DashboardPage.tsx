// ─── Dashboard Page ───────────────────────────────────────────────────────────
//
// Resumo do dia: agendamentos de hoje, total de pacientes, profissionais ativos.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { appointmentsApi, patientsApi, professionalsApi, type Appointment } from '@/lib/api/clinic.api'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/auth.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

function formatTime(iso: string) {
  // API retorna "1970-01-01THH:MM:SS.000Z" — extrai HH:MM
  return new Date(iso).toISOString().substring(11, 16)
}

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  SCHEDULED: 'neutral',
  CONFIRMED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'warning',
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({ apt }: { apt: Appointment }) {
  const variant = statusVariant[apt.status] ?? 'neutral'
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {formatTime(apt.startTime)}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{apt.patient.name}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{apt.patient.phone}</p>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {apt.professional.name}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {apt.procedure.name}
      </td>
      <td className="px-4 py-3">
        <Badge variant={variant}>{statusLabel[apt.status] ?? apt.status}</Badge>
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
    queryKey: ['patients', { page: 1, limit: 1 }],
    queryFn: () => patientsApi.list({ limit: 1 }),
  })

  const { data: professionals } = useQuery({
    queryKey: ['professionals', { page: 1, limit: 1 }],
    queryFn: () => professionalsApi.list({ limit: 1 }),
  })

  const apts = todayApts?.data ?? []
  const confirmed = apts.filter((a) => a.status === 'CONFIRMED' || a.status === 'SCHEDULED').length
  const completed = apts.filter((a) => a.status === 'COMPLETED').length

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Agendamentos hoje"
          value={apts.length}
          color="var(--color-primary-light)"
          icon={
            <svg className="w-6 h-6" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Confirmados/Pendentes"
          value={confirmed}
          color="var(--success-50)"
          icon={
            <svg className="w-6 h-6" style={{ color: 'var(--success-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Concluídos hoje"
          value={completed}
          color="var(--brand-50)"
          icon={
            <svg className="w-6 h-6" style={{ color: 'var(--brand-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          label="Total de pacientes"
          value={patients?.total ?? '—'}
          color="var(--warning-50)"
          icon={
            <svg className="w-6 h-6" style={{ color: 'var(--warning-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      {/* Agendamentos do dia */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            Agenda de hoje
          </h2>
        </div>

        {loadingApts ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : apts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Nenhum agendamento para hoje.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                {['Horário', 'Paciente', 'Profissional', 'Procedimento', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apts.map((apt) => (
                <AppointmentRow key={apt.id} apt={apt} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
