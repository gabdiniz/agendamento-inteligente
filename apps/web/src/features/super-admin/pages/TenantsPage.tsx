// ─── Super Admin — Tenants Page ───────────────────────────────────────────────
//
// Lista todas as clínicas (tenants) com busca, paginação,
// ações de ativar/desativar, edição e deleção com modais de confirmação.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminApi, type Tenant, type UpdateTenantPayload } from '@/lib/api/super-admin.api'

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '40px',
  padding: '0 12px',
  border: '1.5px solid #e2e8f0', borderRadius: '10px',
  fontSize: '13.5px', color: '#1a2530',
  background: '#fff', outline: 'none',
  fontFamily: 'var(--font-sans)',
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  tenant,
  onConfirm,
  onClose,
  loading,
}: {
  tenant: Tenant
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15, 20, 30, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: '420px',
        padding: '32px',
        animation: 'fadeUp 0.2s ease',
      }}>
        {/* Ícone de alerta */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: '#fef2f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <svg width="22" height="22" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h3 style={{
          margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#1a2530',
          fontFamily: 'var(--font-sans)',
        }}>
          Excluir clínica?
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
          Você está prestes a excluir permanentemente a clínica:
        </p>
        <div style={{
          padding: '12px 14px', borderRadius: '10px',
          background: '#fafbfc', border: '1px solid #f0f2f5',
          marginBottom: '20px',
        }}>
          <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#1a2530' }}>
            {tenant.name}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
            /{tenant.slug} · {tenant.email}
          </p>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>
          ⚠️ Esta ação é irreversível. Todos os dados serão perdidos.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, height: '42px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#4a5568', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: '42px', borderRadius: '10px',
              border: 'none', background: '#dc2626',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Tenant Modal ────────────────────────────────────────────────────────

function EditTenantModal({
  tenant,
  onSave,
  onClose,
  loading,
}: {
  tenant: Tenant
  onSave: (payload: UpdateTenantPayload) => void
  onClose: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<UpdateTenantPayload>({
    name:     tenant.name,
    email:    tenant.email,
    phone:    tenant.phone ?? '',
    address:  tenant.address ?? '',
    planType: (tenant.planType as 'BASIC' | 'PRO') ?? 'BASIC',
  })
  const [error, setError] = useState<string | null>(null)

  // Sync se o tenant mudar (troca de linha)
  useEffect(() => {
    setForm({
      name:     tenant.name,
      email:    tenant.email,
      phone:    tenant.phone ?? '',
      address:  tenant.address ?? '',
      planType: (tenant.planType as 'BASIC' | 'PRO') ?? 'BASIC',
    })
    setError(null)
  }, [tenant.id])

  function handleChange(field: keyof UpdateTenantPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name?.trim()) { setError('Nome é obrigatório.'); return }
    if (!form.email?.trim()) { setError('E-mail é obrigatório.'); return }

    onSave({
      name:     form.name.trim(),
      email:    form.email.trim(),
      phone:    form.phone?.trim() || null,
      address:  form.address?.trim() || null,
      planType: form.planType,
    })
  }

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '6px',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15, 20, 30, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: '520px',
        animation: 'fadeUp 0.22s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Cabeçalho do modal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px 20px',
          borderBottom: '1px solid #f0f2f5',
        }}>
          <div>
            <h3 style={{
              margin: '0 0 3px', fontSize: '17px', fontWeight: 700, color: '#1a2530',
              fontFamily: 'var(--font-sans)',
            }}>
              Editar Clínica
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              /{tenant.slug}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="#64748b" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Nome */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabelStyle}>Nome da clínica *</label>
              <input
                value={form.name ?? ''}
                onChange={(e) => handleChange('name', e.target.value)}
                style={inputStyle}
                placeholder="Ex: Clínica São Lucas"
              />
            </div>

            {/* E-mail */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabelStyle}>E-mail *</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
                style={inputStyle}
                placeholder="contato@clinica.com.br"
              />
            </div>

            {/* Telefone */}
            <div>
              <label style={fieldLabelStyle}>Telefone</label>
              <input
                value={form.phone ?? ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                style={inputStyle}
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Plano */}
            <div>
              <label style={fieldLabelStyle}>Plano</label>
              <select
                value={form.planType ?? 'BASIC'}
                onChange={(e) => handleChange('planType', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
              </select>
            </div>

            {/* Endereço */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabelStyle}>Endereço</label>
              <input
                value={form.address ?? ''}
                onChange={(e) => handleChange('address', e.target.value)}
                style={inputStyle}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1, height: '42px', borderRadius: '10px',
                border: '1.5px solid #e2e8f0', background: '#fff',
                color: '#4a5568', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, height: '42px', borderRadius: '10px',
                border: 'none',
                background: 'var(--admin-color-primary)',
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tenant Row ───────────────────────────────────────────────────────────────

function TenantRow({
  tenant,
  onToggle,
  onEdit,
  onDelete,
  isToggling,
}: {
  tenant: Tenant
  onToggle: (tenant: Tenant) => void
  onEdit:   (tenant: Tenant) => void
  onDelete: (tenant: Tenant) => void
  isToggling: boolean
}) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
      {/* Nome + slug */}
      <td style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>
          {tenant.name}
        </p>
        <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
          /{tenant.slug}
        </p>
      </td>

      {/* Contato */}
      <td style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#374151' }}>{tenant.email}</p>
        {tenant.phone && (
          <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>{tenant.phone}</p>
        )}
      </td>

      {/* Plano */}
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
          background: 'var(--admin-color-primary-light)',
          color: 'var(--admin-color-primary)',
          fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {tenant.planType}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block', borderRadius: '20px', padding: '4px 10px',
          background: tenant.isActive ? '#ebfbee' : '#fff1f1',
          color: tenant.isActive ? '#2f9e44' : '#c92a2a',
          fontSize: '12px', fontWeight: 600,
        }}>
          {tenant.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </td>

      {/* Data criação */}
      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
      </td>

      {/* Ações */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {/* Editar */}
          <button
            onClick={() => onEdit(tenant)}
            title="Editar clínica"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '8px',
              background: '#f8fafc', color: '#374151',
              border: '1px solid #e2e8f0',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110 14H8v-2a2 2 0 01.586-1.414z" />
            </svg>
            Editar
          </button>

          {/* Ativar / Desativar */}
          <button
            onClick={() => onToggle(tenant)}
            disabled={isToggling}
            style={{
              padding: '5px 10px', borderRadius: '8px',
              background: tenant.isActive ? '#fef2f2' : '#ebfbee',
              color: tenant.isActive ? '#dc2626' : '#2f9e44',
              border: tenant.isActive ? '1px solid #fecaca' : '1px solid #b2f2bb',
              fontSize: '12px', fontWeight: 600,
              cursor: isToggling ? 'not-allowed' : 'pointer',
              opacity: isToggling ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {isToggling ? '...' : tenant.isActive ? 'Desativar' : 'Ativar'}
          </button>

          {/* Excluir */}
          <button
            onClick={() => onDelete(tenant)}
            title="Excluir clínica"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', borderRadius: '8px',
              background: '#fef2f2', color: '#dc2626',
              border: '1px solid #fecaca',
              cursor: 'pointer', flexShrink: 0,
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

// ─── Pagination ───────────────────────────────────────────────────────────────

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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderTop: '1px solid #f0f2f5',
    }}>
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
        Página {page} de {totalPages}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            opacity: page <= 1 ? 0.5 : 1, fontFamily: 'var(--font-sans)',
          }}
        >
          ← Anterior
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            opacity: page >= totalPages ? 0.5 : 1, fontFamily: 'var(--font-sans)',
          }}
        >
          Próxima →
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TenantsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage]               = useState(1)
  const [togglingId, setTogglingId]   = useState<string | null>(null)

  // Modal de edição
  const [editTarget, setEditTarget]   = useState<Tenant | null>(null)
  // Modal de deleção
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)

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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantPayload }) =>
      superAdminApi.updateTenant(id, payload),
    onSuccess: () => {
      setEditTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['sa-tenants'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.deleteTenant(id),
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['sa-tenants'] })
    },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const tenants    = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.totalPages ?? 1

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-sans)' }}>

      {/* ── Cabeçalho ───────────────────────────────────────────── */}
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
            Clínicas
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
            {meta ? `${meta.total} clínica${meta.total !== 1 ? 's' : ''} cadastrada${meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link
          to="/super-admin/tenants/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px',
            background: 'var(--admin-color-primary)', color: '#fff',
            fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(99,184,153,0.3)',
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nova Clínica
        </Link>
      </div>

      {/* ── Busca ──────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} style={{
        display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end',
        padding: '16px', background: '#fff', borderRadius: '14px',
        border: '1px solid #f0f2f5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxWidth: '320px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Buscar
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: '10px', color: '#94a3b8' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Nome, slug ou e-mail..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--admin-color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,184,153,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" style={{
            padding: '8px 16px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
            border: 'none', background: 'var(--admin-color-primary)', color: '#fff',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              style={{
                padding: '8px 14px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
                border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </form>

      {/* ── Tabela ─────────────────────────────────────────────── */}
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
              borderTopColor: 'var(--admin-color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: '13px', margin: 0 }}>Carregando clínicas...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : isError ? (
          <div style={{ padding: '60px 32px', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>
            Erro ao carregar clínicas. Tente novamente.
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24"
              style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18" />
            </svg>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>
              {search ? 'Nenhuma clínica encontrada' : 'Ainda não há clínicas cadastradas'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              {search ? 'Tente outro termo de busca.' : 'Cadastre a primeira clínica para começar.'}
            </p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                  {['Nome', 'Contato', 'Plano', 'Status', 'Criada em', ''].map((h) => (
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
                {tenants.map((tenant) => (
                  <TenantRow
                    key={tenant.id}
                    tenant={tenant}
                    onToggle={(t) => toggleMutation.mutate(t)}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    isToggling={togglingId === tenant.id}
                  />
                ))}
              </tbody>
            </table>
            <Pagination page={meta?.page ?? 1} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── Modal: Editar ────────────────────────────────────────── */}
      {editTarget && (
        <EditTenantModal
          tenant={editTarget}
          onClose={() => setEditTarget(null)}
          loading={updateMutation.isPending}
          onSave={(payload) => updateMutation.mutate({ id: editTarget.id, payload })}
        />
      )}

      {/* ── Modal: Confirmar Deleção ──────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          tenant={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </div>
  )
}
