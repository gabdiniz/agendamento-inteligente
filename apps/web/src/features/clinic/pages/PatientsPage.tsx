// ─── Patients Page ────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { patientsApi, type Patient } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'

function PatientRow({ patient, slug }: { patient: Patient; slug: string }) {
  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      <td style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>
          {patient.name}
        </p>
        {age !== null && (
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{age} anos</p>
        )}
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4a5568' }}>
        {patient.phone}
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4a5568' }}>
        {patient.email ?? '—'}
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
        {patient.city ?? '—'}
      </td>
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
        {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <Link
            to="/app/$slug/patients/$id"
            params={{ slug, id: patient.id }}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '5px 10px', borderRadius: '8px',
              background: '#f8fafc', color: '#374151',
              border: '1px solid #e2e8f0',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Ver ficha
          </Link>
          <Link
            to="/app/$slug/patients/$id/edit"
            params={{ slug, id: patient.id }}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '5px 10px', borderRadius: '8px',
              background: '#f8fafc', color: '#374151',
              border: '1px solid #e2e8f0',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Editar
          </Link>
        </div>
      </td>
    </tr>
  )
}

export function PatientsPage() {
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? clinicTokens.getSlug() ?? ''
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { page, search }],
    queryFn: () => patientsApi.list({ page, limit: 20, search: search || undefined }),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const patients = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', animation: 'fadeUp 0.35s ease both' }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '26px', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: '#1a2530', letterSpacing: '-0.02em',
          }}>
            Pacientes
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
            {data ? `${data.total} paciente${data.total !== 1 ? 's' : ''} cadastrado${data.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link to="/app/$slug/patients/new" params={{ slug }} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '9px 18px', borderRadius: '10px',
          background: 'var(--color-primary)', color: '#fff',
          fontSize: '13.5px', fontWeight: 600,
          textDecoration: 'none',
          boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)',
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Novo Paciente
        </Link>
      </div>

      {/* Busca e Filtros */}
      <form onSubmit={handleSearch} style={{
        display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end',
        padding: '16px', background: '#fff', borderRadius: '14px',
        border: '1px solid #f0f2f5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxWidth: '320px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Buscar Paciente
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
              position: 'absolute', left: '10px', color: '#94a3b8'
            }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Nome ou telefone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%', paddingLeft: '36px', paddingRight: '12px', height: '36px',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                fontSize: '13px', color: '#1a2530',
                background: '#fff', outline: 'none', fontFamily: 'var(--font-sans)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            style={{
              padding: '8px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
                border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </form>

      {/* Tabela */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #f0f2f5',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '60px 32px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '2px solid #eaecef',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: '13px', margin: 0 }}>Carregando pacientes...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>
              {search ? 'Nenhum paciente encontrado' : 'Ainda não há pacientes'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              {search ? 'Tente outro termo de busca.' : 'Crie o primeiro paciente para começar.'}
            </p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Paciente', 'Telefone', 'E-mail', 'Cidade', 'Cadastrado em', ''].map((h) => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: 700,
                      color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <PatientRow key={p.id} patient={p} slug={slug} />
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderTop: '1px solid #f0f2f5',
              }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Página {page} de {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
                      cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.5 : 1,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
