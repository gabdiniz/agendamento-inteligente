// ─── Users Page ───────────────────────────────────────────────────────────────
//
// Gestão de usuários da clínica (acesso exclusivo do GESTOR).
// Lista usuários, cria novos (RECEPCAO / PROFISSIONAL / GESTOR) e
// permite ativar/desativar contas.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usersApi,
  professionalsApi,
  type ClinicUserRecord,
  type CreateUserPayload,
  type UserRole,
} from '@/lib/api/clinic.api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  GESTOR:        'Gestor',
  RECEPCAO:      'Recepção',
  PROFISSIONAL:  'Profissional',
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  GESTOR:       { bg: '#eff6ff', color: '#1d4ed8' },
  RECEPCAO:     { bg: '#f0fdf4', color: '#15803d' },
  PROFISSIONAL: { bg: '#fdf4ff', color: '#7e22ce' },
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'color-mix(in srgb, var(--color-primary) 15%, white)',
      color: 'var(--color-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const { bg, color } = ROLE_COLOR[role] ?? { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '11.5px', fontWeight: 600, background: bg, color,
    }}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

interface UserFormData {
  name: string
  email: string
  password: string
  phone: string
  role: UserRole
  professionalId: string
}

const EMPTY_FORM: UserFormData = {
  name: '', email: '', password: '', phone: '', role: 'RECEPCAO', professionalId: '',
}

function UserModal({
  mode,
  initial,
  onClose,
  onSave,
  loading,
  error,
  professionals,
}: {
  mode: 'create' | 'edit'
  initial?: Partial<UserFormData> & { id?: string }
  onClose: () => void
  onSave: (data: UserFormData) => void
  loading: boolean
  error: string
  professionals: { id: string; name: string; specialty: string | null; userId: string | null }[]
}) {
  const [form, setForm] = useState<UserFormData>({ ...EMPTY_FORM, ...initial })
  const [showPassword, setShowPassword] = useState(false)

  function set(key: keyof UserFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  // Profissionais sem vínculo de usuário (ou o profissional atual se editando)
  const availableProfessionals = professionals.filter(
    (p) => !p.userId || p.id === (initial as { professionalId?: string })?.professionalId
  )

  const isCreate = mode === 'create'

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12.5px', fontWeight: 600,
    color: '#374151', marginBottom: '6px',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '13.5px',
    fontFamily: 'var(--font-sans)', color: '#1a2530',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

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
        width: '100%', maxWidth: '480px',
        animation: 'fadeUp 0.2s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px 0',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1a2530' }}>
              {isCreate ? 'Novo usuário' : 'Editar usuário'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              {isCreate ? 'Crie uma conta de acesso ao painel' : 'Atualize os dados do usuário'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #eaecef',
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          {/* Nome */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nome completo *</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex: Maria Silva"
              required
              minLength={2}
            />
          </div>

          {/* Email */}
          {isCreate && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>E-mail *</label>
              <input
                type="email"
                style={inputStyle}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="usuario@clinica.com"
                required
              />
            </div>
          )}

          {/* Senha (só na criação) */}
          {isCreate && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Senha *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0,
                  }}
                >
                  {showPassword
                    ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Telefone */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Telefone</label>
            <input
              style={inputStyle}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Role (só na criação) */}
          {isCreate && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Perfil de acesso *</label>
              <select
                style={{ ...inputStyle, appearance: 'none' }}
                value={form.role}
                onChange={(e) => set('role', e.target.value as UserRole)}
                required
              >
                <option value="RECEPCAO">Recepção — agenda e pacientes</option>
                <option value="PROFISSIONAL">Profissional — visualizar agenda e atualizar status</option>
                <option value="GESTOR">Gestor — acesso total</option>
              </select>
            </div>
          )}

          {/* Vincular a Profissional (só criação, só para PROFISSIONAL) */}
          {isCreate && form.role === 'PROFISSIONAL' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Vincular a perfil profissional</label>
              <select
                style={{ ...inputStyle, appearance: 'none' }}
                value={form.professionalId}
                onChange={(e) => set('professionalId', e.target.value)}
              >
                <option value="">— não vincular agora —</option>
                {availableProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.specialty ? ` — ${p.specialty}` : ''}
                  </option>
                ))}
              </select>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Opcional. Vincula a conta de login ao perfil de profissional da clínica.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: '13px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: '1.5px solid #e2e8f0', background: 'transparent',
                fontSize: '13.5px', fontWeight: 600, color: '#64748b',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: '10px',
                border: 'none', background: loading ? '#94a3b8' : 'var(--color-primary)',
                fontSize: '13.5px', fontWeight: 600, color: '#fff',
                cursor: loading ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {loading ? 'Salvando...' : isCreate ? 'Criar usuário' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Deactivate Confirm Modal ─────────────────────────────────────────────────

function ToggleModal({
  user,
  onConfirm,
  onClose,
  loading,
}: {
  user: ClinicUserRecord
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  const isDeactivating = user.isActive
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
          width: '48px', height: '48px', borderRadius: '14px',
          background: isDeactivating ? '#fef2f2' : '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
        }}>
          {isDeactivating
            ? <svg width="22" height="22" fill="none" stroke="#dc2626" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            : <svg width="22" height="22" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#1a2530' }}>
          {isDeactivating ? 'Desativar usuário?' : 'Reativar usuário?'}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
          {isDeactivating
            ? `${user.name} perderá acesso ao painel imediatamente. O histórico será preservado.`
            : `${user.name} voltará a ter acesso ao painel da clínica.`
          }
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', background: 'transparent',
              fontSize: '13.5px', fontWeight: 600, color: '#64748b',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: loading ? '#94a3b8' : isDeactivating ? '#dc2626' : '#16a34a',
              fontSize: '13.5px', fontWeight: 600, color: '#fff',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? 'Aguarde...' : isDeactivating ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const qc = useQueryClient()

  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClinicUserRecord | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ClinicUserRecord | null>(null)
  const [formError, setFormError] = useState('')

  // ── Debounce de search ───────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    const t = setTimeout(() => { setSearch(value); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.list({ page, limit: 20, search: search || undefined }),
  })

  const { data: profsData } = useQuery({
    queryKey: ['professionals-for-users'],
    queryFn: () => professionalsApi.list({ limit: 200, isActive: true }),
    staleTime: 60_000,
  })

  const professionals = (profsData?.data ?? []) as {
    id: string; name: string; specialty: string | null; userId: string | null
  }[]

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      setFormError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erro ao criar usuário.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name, phone }: { id: string; name: string; phone: string }) =>
      usersApi.update(id, { name, phone: phone || null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      setEditTarget(null)
      setFormError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erro ao atualizar usuário.')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? usersApi.deactivate(id) : usersApi.activate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      setToggleTarget(null)
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleCreateSave(form: UserFormData) {
    setFormError('')
    createMutation.mutate({
      name:  form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role:  form.role,
      professionalId: form.professionalId || undefined,
    })
  }

  function handleEditSave(form: UserFormData) {
    if (!editTarget) return
    setFormError('')
    updateMutation.mutate({ id: editTarget.id, name: form.name, phone: form.phone })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const users   = data?.data ?? []
  const total   = data?.total ?? 0
  const totalPg = data?.totalPages ?? 1

  return (
    <div style={{ padding: '28px', maxWidth: '1000px', margin: '0 auto', animation: 'fadeUp 0.25s ease' }}>
      {/* ── Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2530' }}>
            Usuários
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
            Contas de acesso ao painel da clínica
          </p>
        </div>
        <button
          onClick={() => { setFormError(''); setCreateOpen(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '10px',
            background: 'var(--color-primary)', border: 'none',
            fontSize: '13.5px', fontWeight: 600, color: '#fff',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo usuário
        </button>
      </div>

      {/* ── Search */}
      <div style={{
        background: '#fff', borderRadius: '14px',
        border: '1px solid #eaecef',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        padding: '16px 20px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: '13.5px', color: '#1a2530',
            fontFamily: 'var(--font-sans)', background: 'transparent',
          }}
        />
        {total > 0 && (
          <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>
            {total} usuário{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #eaecef',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {/* Head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 200px 160px 100px 100px',
          padding: '12px 20px',
          borderBottom: '1px solid #f0f2f5',
          background: '#f8fafc',
        }}>
          {['Usuário', 'E-mail', 'Perfil', 'Profissional', 'Ações'].map((h) => (
            <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Skeleton */}
        {isLoading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px 160px 100px 100px',
                padding: '16px 20px', alignItems: 'center', gap: '12px',
                borderBottom: '1px solid #f8fafc',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Skeleton width={36} height={36} />
                  <Skeleton width={120} height={14} />
                </div>
                <Skeleton height={14} />
                <Skeleton width={80} height={22} />
                <Skeleton width={70} height={14} />
                <Skeleton width={60} height={30} />
              </div>
            ))}
          </>
        )}

        {/* Rows */}
        {!isLoading && users.map((user, idx) => {
          const role = user.roles[0]?.role ?? 'RECEPCAO'
          return (
            <div
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px 160px 100px 100px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < users.length - 1 ? '1px solid #f8fafc' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fafbfc' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Nome + status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <Avatar name={user.name} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#1a2530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </p>
                  {!user.isActive && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>inativo</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <span style={{ fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>

              {/* Role */}
              <div>
                <RoleBadge role={role} />
              </div>

              {/* Professional */}
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                {user.professional ? user.professional.name : '—'}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => { setFormError(''); setEditTarget(user) }}
                  title="Editar"
                  style={{
                    width: 32, height: 32, borderRadius: '8px',
                    border: '1px solid #e2e8f0', background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#64748b',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setToggleTarget(user)}
                  title={user.isActive ? 'Desativar' : 'Reativar'}
                  style={{
                    width: 32, height: 32, borderRadius: '8px',
                    border: `1px solid ${user.isActive ? '#fecaca' : '#bbf7d0'}`,
                    background: user.isActive ? '#fef2f2' : '#f0fdf4',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: user.isActive ? '#dc2626' : '#16a34a',
                  }}
                >
                  {user.isActive
                    ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    : <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  }
                </button>
              </div>
            </div>
          )
        })}

        {/* Empty */}
        {!isLoading && users.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              {search ? 'Nenhum usuário encontrado para essa busca.' : 'Nenhum usuário cadastrado.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination */}
      {totalPg > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151',
              fontSize: '13px', cursor: page === 1 ? 'default' : 'pointer', fontWeight: 600,
            }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Página {page} de {totalPg}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPg, p + 1))}
            disabled={page === totalPg}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: page === totalPg ? '#f8fafc' : '#fff', color: page === totalPg ? '#cbd5e1' : '#374151',
              fontSize: '13px', cursor: page === totalPg ? 'default' : 'pointer', fontWeight: 600,
            }}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* ── Modals */}
      {createOpen && (
        <UserModal
          mode="create"
          onClose={() => { setCreateOpen(false); setFormError('') }}
          onSave={handleCreateSave}
          loading={createMutation.isPending}
          error={formError}
          professionals={professionals}
        />
      )}

      {editTarget && (
        <UserModal
          mode="edit"
          initial={{ name: editTarget.name, phone: editTarget.phone ?? '' }}
          onClose={() => { setEditTarget(null); setFormError('') }}
          onSave={handleEditSave}
          loading={updateMutation.isPending}
          error={formError}
          professionals={professionals}
        />
      )}

      {toggleTarget && (
        <ToggleModal
          user={toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={() => toggleMutation.mutate({ id: toggleTarget.id, isActive: toggleTarget.isActive })}
          loading={toggleMutation.isPending}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
