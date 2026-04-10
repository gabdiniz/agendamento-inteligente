// ─── Professionals Page ───────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { professionalsApi, type Professional } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

function ProfessionalRow({
  prof,
  slug,
  onToggle,
  isToggling,
}: {
  prof: Professional
  slug: string
  onToggle: (p: Professional) => void
  isToggling: boolean
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar colorido */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: prof.color ?? 'var(--color-primary)' }}
          >
            {prof.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{prof.name}</p>
            {prof.specialty && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{prof.specialty}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant={prof.isActive ? 'success' : 'danger'}>
          {prof.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link to="/app/$slug/professionals/$id/edit" params={{ slug, id: prof.id }}>
            <Button variant="secondary" size="sm">Editar</Button>
          </Link>
          <Button
            variant={prof.isActive ? 'danger' : 'secondary'}
            size="sm"
            loading={isToggling}
            onClick={() => onToggle(prof)}
          >
            {prof.isActive ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function ProfessionalsPage() {
  const queryClient = useQueryClient()
  const params = useParams({ strict: false }) as { slug?: string }
  const slug = params.slug ?? clinicTokens.getSlug() ?? ''
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['professionals', { page }],
    queryFn: () => professionalsApi.list({ page, limit: 20 }),
  })

  const toggleMutation = useMutation({
    mutationFn: (p: Professional) =>
      p.isActive ? professionalsApi.deactivate(p.id) : professionalsApi.activate(p.id),
    onMutate: (p) => setTogglingId(p.id),
    onSettled: () => {
      setTogglingId(null)
      void queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
  })

  const profs = data?.data ?? []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Profissionais</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {data ? `${data.total} profissional${data.total !== 1 ? 'is' : ''}` : ''}
          </p>
        </div>
        <Link to="/app/$slug/professionals/new" params={{ slug }}>
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Profissional
          </Button>
        </Link>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando...
          </div>
        ) : profs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm mb-3">Nenhum profissional cadastrado.</p>
            <Link to="/app/$slug/professionals/new" params={{ slug }}>
              <Button variant="primary" size="sm">Cadastrar primeiro profissional</Button>
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Profissional', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profs.map((p) => (
                  <ProfessionalRow
                    key={p.id}
                    prof={p}
                    slug={slug}
                    onToggle={(prof) => toggleMutation.mutate(prof)}
                    isToggling={togglingId === p.id}
                  />
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
