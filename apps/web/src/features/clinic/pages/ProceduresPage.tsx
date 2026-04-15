// ─── Procedures Page ──────────────────────────────────────────────────────────
//
// Lista todos os procedimentos da clínica com ações de ativar/desativar,
// editar e excluir. Acessível em /configuracoes/procedimentos.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proceduresApi, type Procedure } from '@/lib/api/clinic.api'
import { clinicTokens } from '@/lib/api/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number | null) {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  procedure,
  onConfirm,
  onClose,
  loading,
}: {
  procedure: Procedure
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,20,30,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: '400px', padding: '32px',
        animation: 'fadeUp 0.2s ease',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
        }}>
          <svg width="22" height="22" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#1a2530' }}>
          Excluir procedimento?
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
          O procedimento <strong>{procedure.name}</strong> será removido permanentemente.
          Agendamentos existentes não são afetados.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, height: '42px', borderRadius: '10px',
            border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{
            flex: 1, height: '42px', borderRadius: '10px',
            border: 'none', background: '#dc2626', color: '#fff',
            fontSize: '14px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'var(--font-sans)',
          }}>
            {loading ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Procedure Row ────────────────────────────────────────────────────────────

function ProcedureRow({
  procedure, slug, onToggle, onDelete, isToggling,
}: {
  procedure: Procedure
  slug: string
  onToggle: (p: Procedure) => void
  onDelete: (p: Procedure) => void
  isToggling: boolean
}) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      {/* Nome + cor */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
            background: procedure.color ?? '#94a3b8',
          }} />
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>
              {procedure.name}
            </p>
            {procedure.description && (
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                {procedure.description.length > 60
                  ? procedure.description.slice(0, 60) + '...'
                  : procedure.description}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Duração */}
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
        {procedure.durationMinutes} min
      </td>

      {/* Preço */}
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
        {formatPrice(procedure.priceCents)}
      </td>

      {/* Status */}
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', borderRadius: '20px', padding: '4px 10px',
          background: procedure.isActive ? '#ebfbee' : '#fff1f1',
          color: procedure.isActive ? '#2f9e44' : '#c92a2a',
          fontSize: '12px', fontWeight: 600,
        }}>
          {procedure.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </td>

      {/* Ações */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <Link
            to="/app/$slug/configuracoes/procedimentos/$id/edit"
            params={{ slug, id: procedure.id }}
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
            onClick={() => onToggle(procedure)}
            disabled={isToggling}
            style={{
              padding: '5px 10px', borderRadius: '8px',
              background: procedure.isActive ? '#fef2f2' : '#ebfbee',
              color: procedure.isActive ? '#dc2626' : '#2f9e44',
              border: procedure.isActive ? '1px solid #fecaca' : '1px solid #b2f2bb',
              fontSize: '12px', fontWeight: 600,
              cursor: isToggling ? 'not-allowed' : 'pointer',
              opacity: isToggling ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {isToggling ? '...' : procedure.isActive ? 'Desativar' : 'Ativar'}
          </button>
          <button
            onClick={() => onDelete(procedure)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', borderRadius: '8px',
              background: '#fef2f2', color: '#dc2626',
              border: '1px solid #fecaca', cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProceduresPage() {
  const params      = useParams({ strict: false }) as { slug?: string }
  const slug        = params.slug ?? clinicTokens.getSlug() ?? ''
  const qc          = useQueryClient()
  const [togglingId, setTogglingId]     = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Procedure | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['procedures', slug, page],
    queryFn: () => proceduresApi.list({ page, limit: 20 }),
  })

  const toggleMutation = useMutation({
    mutationFn: (p: Procedure) => p.isActive ? proceduresApi.deactivate(p.id) : proceduresApi.activate(p.id),
    onMutate: (p) => setTogglingId(p.id),
    onSettled: () => { setTogglingId(null); void qc.invalidateQueries({ queryKey: ['procedures'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proceduresApi.delete(id),
    onSuccess: () => { setDeleteTarget(null); void qc.invalidateQueries({ queryKey: ['procedures'] }) },
  })

  const procedures = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="r-page" style={{ maxWidth: '1100px', fontFamily: 'var(--font-sans)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: '28px', animation: 'fadeUp 0.35s ease both',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '26px', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: '#1a2530', letterSpacing: '-0.02em',
          }}>
            Procedimentos
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
            {data ? `${data.total} procedimento${data.total !== 1 ? 's' : ''} cadastrado${data.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link
          to="/app/$slug/configuracoes/procedimentos/new"
          params={{ slug }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px',
            background: 'var(--color-primary)', color: '#fff',
            fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Novo procedimento
        </Link>
      </div>

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
              width: '32px', height: '32px', border: '2px solid #eaecef',
              borderTopColor: 'var(--color-primary)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: '13px', margin: 0 }}>Carregando procedimentos...</p>
          </div>
        ) : procedures.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24"
              style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>
              Nenhum procedimento cadastrado
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              Crie o primeiro procedimento para começar a usar o agendamento.
            </p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Procedimento', 'Duração', 'Preço', 'Status', ''].map((h) => (
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
                {procedures.map((p) => (
                  <ProcedureRow
                    key={p.id}
                    procedure={p}
                    slug={slug}
                    onToggle={(proc) => toggleMutation.mutate(proc)}
                    onDelete={setDeleteTarget}
                    isToggling={togglingId === p.id}
                  />
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
                  {[['← Anterior', -1], ['Próxima →', 1]].map(([label, dir]) => (
                    <button
                      key={label as string}
                      onClick={() => setPage((p) => p + (dir as number))}
                      disabled={dir === -1 ? page <= 1 : page >= totalPages}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                        border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
                        cursor: (dir === -1 ? page <= 1 : page >= totalPages) ? 'not-allowed' : 'pointer',
                        opacity: (dir === -1 ? page <= 1 : page >= totalPages) ? 0.5 : 1,
                        fontFamily: 'var(--font-sans)',
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          procedure={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </div>
  )
}
