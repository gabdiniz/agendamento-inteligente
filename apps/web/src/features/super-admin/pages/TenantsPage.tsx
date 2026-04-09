// ─── Super Admin — Tenants Page ───────────────────────────────────────────────
//
// Lista todas as clínicas (tenants) com busca, paginação,
// e ações de ativar/desativar. Botão para cadastrar nova clínica.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminApi, type Tenant } from '@/lib/api/super-admin.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

// ─── Sub-components ───────────────────────────────────────────────────────────

function TenantRow({
  tenant,
  onToggle,
  isToggling,
}: {
  tenant: Tenant
  onToggle: (tenant: Tenant) => void
  isToggling: boolean
}) {
  return (
    <tr
      style={{
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      {/* Nome + slug */}
      <td className="px-6 py-4">
        <div className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
          {tenant.name}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
          /{tenant.slug}
        </div>
      </td>

      {/* Contato */}
      <td className="px-6 py-4">
        <div className="text-sm" style={{ color: 'var(--gray-700)' }}>
          {tenant.email}
        </div>
        {tenant.phone && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
            {tenant.phone}
          </div>
        )}
      </td>

      {/* Plano */}
      <td className="px-6 py-4">
        <span
          className="text-xs font-medium px-2 py-1 rounded"
          style={{
            background: 'var(--brand-50)',
            color: 'var(--brand-700)',
          }}
        >
          {tenant.planType}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <Badge variant={tenant.isActive ? 'success' : 'danger'}>
          {tenant.isActive ? 'Ativa' : 'Inativa'}
        </Badge>
      </td>

      {/* Data de criação */}
      <td className="px-6 py-4 text-sm" style={{ color: 'var(--gray-500)' }}>
        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
      </td>

      {/* Ações */}
      <td className="px-6 py-4 text-right">
        <Button
          variant={tenant.isActive ? 'danger' : 'secondary'}
          size="sm"
          loading={isToggling}
          onClick={() => onToggle(tenant)}
        >
          {tenant.isActive ? 'Desativar' : 'Ativar'}
        </Button>
      </td>
    </tr>
  )
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--gray-100)' }}>
      <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TenantsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-tenants', { page, search }],
    queryFn: () => superAdminApi.listTenants({ page, limit: 10, search: search || undefined }),
  })

  const toggleMutation = useMutation({
    mutationFn: (tenant: Tenant) =>
      tenant.isActive
        ? superAdminApi.deactivateTenant(tenant.id)
        : superAdminApi.activateTenant(tenant.id),
    onMutate: (tenant) => setTogglingId(tenant.id),
    onSettled: () => {
      setTogglingId(null)
      void queryClient.invalidateQueries({ queryKey: ['sa-tenants'] })
    },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const tenants = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="p-8">
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>
            Clínicas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--gray-500)' }}>
            {meta ? `${meta.total} clínica${meta.total !== 1 ? 's' : ''} cadastrada${meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link to="/super-admin/tenants/new">
          <Button
            variant="primary"
            style={{ background: 'var(--admin-color-primary)' }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Clínica
          </Button>
        </Link>
      </div>

      {/* ── Busca ─────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--gray-400)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou slug..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              border: '1px solid var(--gray-200)',
              background: '#ffffff',
              color: 'var(--gray-900)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-color-primary)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <Button type="submit" variant="secondary" size="md">
          Buscar
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
          >
            Limpar
          </Button>
        )}
      </form>

      {/* ── Tabela ────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: '1px solid var(--gray-200)',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--gray-400)' }}>
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando clínicas...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--danger-500)' }}>
            Erro ao carregar clínicas. Tente novamente.
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--gray-400)' }}>
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18" />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--gray-500)' }}>
              {search ? 'Nenhuma clínica encontrada.' : 'Ainda não há clínicas cadastradas.'}
            </p>
            {!search && (
              <Link to="/super-admin/tenants/new" className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  style={{ background: 'var(--admin-color-primary)' }}
                >
                  Cadastrar primeira clínica
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                  {['Nome', 'Contato', 'Plano', 'Status', 'Criada em', ''].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--gray-500)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <TenantRow
                    key={tenant.id}
                    tenant={tenant}
                    onToggle={(t) => toggleMutation.mutate(t)}
                    isToggling={togglingId === tenant.id}
                  />
                ))}
              </tbody>
            </table>
            {meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
