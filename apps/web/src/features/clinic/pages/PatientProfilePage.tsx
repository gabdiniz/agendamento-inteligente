// ─── PatientProfilePage ───────────────────────────────────────────────────────

import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { patientsApi, appointmentsApi } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

const GENDER_LABEL: Record<string, string> = {
  MALE:             'Masculino',
  FEMALE:           'Feminino',
  OTHER:            'Outro',
  PREFER_NOT_TO_SAY:'Prefiro não informar',
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:       'Agendado',
  PATIENT_PRESENT: 'Paciente Presente',
  IN_PROGRESS:     'Em Atendimento',
  COMPLETED:       'Concluído',
  CANCELED:        'Cancelado',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SCHEDULED:       { bg: '#eff6ff', color: '#1d4ed8' },
  PATIENT_PRESENT: { bg: '#f0fdf4', color: '#15803d' },
  IN_PROGRESS:     { bg: '#faf5ff', color: '#7e22ce' },
  COMPLETED:       { bg: '#f0fdf4', color: '#166534' },
  CANCELED:        { bg: '#fef2f2', color: '#b91c1c' },
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '14px', color: value ? '#1a2530' : '#cbd5e1' }}>
        {value ?? '—'}
      </p>
    </div>
  )
}

export function PatientProfilePage() {
  const params = useParams({ strict: false }) as { slug?: string; id?: string }
  const slug   = params.slug ?? clinicTokens.getSlug() ?? ''
  const id     = params.id ?? ''

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn:  () => patientsApi.get(id),
    enabled:  !!id,
  })

  const { data: aptsData } = useQuery({
    queryKey: ['appointments-patient', id],
    queryFn:  () => appointmentsApi.list({ patientId: id, limit: 50 }),
    enabled:  !!id,
  })

  const age = patient?.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>Carregando...</div>
  }

  if (!patient) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#ef4444', fontFamily: 'var(--font-sans)' }}>Paciente não encontrado.</div>
  }

  const appointments = aptsData?.data ?? []

  return (
    <div className="r-page" style={{ maxWidth: '860px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link
          to="/app/$slug/$section"
          params={{ slug, section: 'patients' }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            border: '1px solid #e2e8f0', background: '#fff', textDecoration: 'none',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
        >
          <svg width="14" height="14" fill="none" stroke="#64748b" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 400, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#1a2530', letterSpacing: '-0.02em' }}>
            {patient.name}
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            {age !== null ? `${age} anos · ` : ''}{patient.phone}
          </p>
        </div>
        <Link
          to="/app/$slug/patients/$id/edit"
          params={{ slug, id }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px',
            border: '1.5px solid #e2e8f0', background: '#fff',
            color: '#374151', fontSize: '13px', fontWeight: 600,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110 14H8v-2a2 2 0 01.586-1.414z" />
          </svg>
          Editar
        </Link>
      </div>

      {/* ── Dados pessoais ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #f0f2f5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        padding: '24px', marginBottom: '24px',
      }}>
        <p style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Dados Pessoais
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
          <Field label="E-mail"      value={patient.email} />
          <Field label="Telefone"    value={patient.phone} />
          <Field label="Nascimento"  value={patient.birthDate ? new Date(patient.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
          <Field label="Gênero"      value={patient.gender ? GENDER_LABEL[patient.gender] : null} />
          <Field label="Cidade"      value={patient.city} />
          <Field label="Cadastrado em" value={new Date(patient.createdAt).toLocaleDateString('pt-BR')} />
        </div>
        {patient.notes && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f2f5' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Observações
            </p>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: 1.6 }}>
              {patient.notes}
            </p>
          </div>
        )}
      </div>

      {/* ── Histórico de agendamentos ────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #f0f2f5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1a2530' }}>
            Histórico de Agendamentos
            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 400, color: '#94a3b8' }}>
              {appointments.length} registro{appointments.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>

        {appointments.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            Nenhum agendamento encontrado.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafbfc' }}>
                {['Data', 'Horário', 'Profissional', 'Procedimento', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => {
                const st = STATUS_STYLE[apt.status] ?? { bg: '#f1f5f9', color: '#475569' }
                return (
                  <tr key={apt.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                      {apt.scheduledDate.split('-').reverse().join('/')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                      {apt.startTime.slice(0, 5)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                      {apt.professional.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                      {apt.procedure.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', borderRadius: '20px', padding: '3px 10px',
                        background: st.bg, color: st.color,
                        fontSize: '12px', fontWeight: 600,
                      }}>
                        {STATUS_LABEL[apt.status] ?? apt.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
