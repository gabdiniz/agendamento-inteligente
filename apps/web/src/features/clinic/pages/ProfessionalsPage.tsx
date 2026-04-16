// ─── Professionals Page ───────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { professionalsApi, type Professional } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

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
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar colorido */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: prof.color ?? 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '14px', fontWeight: 700,
          }}>
            {prof.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>
              {prof.name}
            </p>
            {prof.specialty && (
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{prof.specialty}</p>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', borderRadius: '20px', padding: '4px 10px',
          background: prof.isActive ? '#ebfbee' : '#fff1f1',
          color: prof.isActive ? '#2f9e44' : '#c92a2a',
          fontSize: '12px', fontWeight: 600,
        }}>
          {prof.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {/* Horários de trabalho */}
          <Link
            to="/app/$slug/professionals/$id/schedule"
            params={{ slug, id: prof.id }}
            title="Horários de trabalho"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', borderRadius: '8px',
              background: '#f0f4ff', color: '#3b5bdb',
              border: '1px solid #c5d0f5',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
          <Link
            to="/app/$slug/professionals/$id/edit"
            params={{ slug, id: prof.id }}
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
          <button
            onClick={() => onToggle(prof)}
            disabled={isToggling}
            style={{
              padding: '5px 10px', borderRadius: '8px',
              background: prof.isActive ? '#fef2f2' : '#ebfbee',
              color: prof.isActive ? '#dc2626' : '#2f9e44',
              border: prof.isActive ? '1px solid #fecaca' : '1px solid #b2f2bb',
              fontSize: '12px', fontWeight: 600, cursor: isToggling ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: isToggling ? 0.7 : 1,
            }}
          >
            {isToggling ? 'Processando...' : prof.isActive ? 'Desativar' : 'Ativar'}
          </button>
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
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="r-page" style={{ maxWidth: '1200px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', animation: 'fadeUp 0.35s ease both' }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '26px', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: '#1a2530', letterSpacing: '-0.02em',
          }}>
            Profissionais
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
            {data ? `${data.total} profissional${data.total !== 1 ? 'is' : ''}` : ''}
          </p>
        </div>
        <Link to="/app/$slug/professionals/new" params={{ slug }} style={{
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
          Novo Profissional
        </Link>
      </div>

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
            <p style={{ fontSize: '13px', margin: 0 }}>Carregando profissionais...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : profs.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>
              Nenhum profissional cadastrado
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              Crie o primeiro profissional para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="r-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Profissional', 'Status', ''].map((h) => (
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
            </div>
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
