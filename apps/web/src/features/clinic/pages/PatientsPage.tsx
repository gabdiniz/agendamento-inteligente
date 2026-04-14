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
    <tr
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <td className="px-6 py-4">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.name}</p>
        {age !== null && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{age} anos</p>
        )}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {patient.phone}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {patient.email ?? '—'}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {patient.city ?? '—'}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link to="/app/$slug/patients/$id" params={{ slug, id: patient.id }}>
            <Button variant="secondary" size="sm">Ver ficha</Button>
          </Link>
          <Link to="/app/$slug/patients/$id/edit" params={{ slug, id: patient.id }}>
            <Button variant="secondary" size="sm">Editar</Button>
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Pacientes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {data ? `${data.total} paciente${data.total !== 1 ? 's' : ''} cadastrado${data.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link to="/app/$slug/patients/new" params={{ slug }}>
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Paciente
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
        <Button type="submit" variant="secondary">Buscar</Button>
        {search && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
            Limpar
          </Button>
        )}
      </form>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm">{search ? 'Nenhum paciente encontrado.' : 'Ainda não há pacientes cadastrados.'}</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Paciente', 'Telefone', 'E-mail', 'Cidade', 'Cadastrado em', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <PatientRow key={p.id} patient={p} slug={slug} />
                ))}
              </tbody>
            </table>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Página {page} de {data.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Anterior</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Próxima</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
