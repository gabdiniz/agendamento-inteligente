// ─── WhatsApp Page ────────────────────────────────────────────────────────────
//
// Configuração e monitoramento da integração WhatsApp via Z-API.
// Exclusivo para GESTOR. 3 abas:
//   1. Conexão    → toggle, credenciais Z-API, lembrete, teste
//   2. Templates  → edição dos 4 templates com preview ao vivo
//   3. Histórico  → tabela de jobs enviados/pendentes/falhos
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  whatsappApi,
  type WhatsappConfig,
  type WhatsappTemplate,
  type WhatsappJob,
} from '@/lib/api/clinic.api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'connection' | 'templates' | 'history'

const EVENT_LABEL: Record<string, string> = {
  CONFIRMATION: 'Confirmação',
  REMINDER:     'Lembrete',
  CANCELLATION: 'Cancelamento',
  RESCHEDULE:   'Reagendamento',
}

const EVENT_ICON: Record<string, string> = {
  CONFIRMATION: '✅',
  REMINDER:     '⏰',
  CANCELLATION: '❌',
  RESCHEDULE:   '🔄',
}

const EVENT_COLOR: Record<string, { bg: string; color: string }> = {
  CONFIRMATION: { bg: '#f0fdf4', color: '#15803d' },
  REMINDER:     { bg: '#fffbeb', color: '#b45309' },
  CANCELLATION: { bg: '#fef2f2', color: '#dc2626' },
  RESCHEDULE:   { bg: '#eff6ff', color: '#1d4ed8' },
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:  'Pendente',
  SENDING:  'Enviando',
  SENT:     'Enviado',
  FAILED:   'Falhou',
  CANCELED: 'Cancelado',
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: '#fffbeb', color: '#92400e' },
  SENDING:  { bg: '#eff6ff', color: '#1d4ed8' },
  SENT:     { bg: '#f0fdf4', color: '#15803d' },
  FAILED:   { bg: '#fef2f2', color: '#dc2626' },
  CANCELED: { bg: '#f8fafc', color: '#64748b' },
}

const TEMPLATE_VARS = [
  { label: '{{nome_paciente}}', desc: 'Nome do paciente' },
  { label: '{{clinica}}',       desc: 'Nome da clínica' },
  { label: '{{data}}',          desc: 'Data do agendamento' },
  { label: '{{hora}}',          desc: 'Horário' },
  { label: '{{profissional}}',  desc: 'Nome do profissional' },
  { label: '{{procedimento}}',  desc: 'Nome do procedimento' },
]

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '40px',
  padding: '0 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
  fontSize: '13.5px', color: '#1a2530', background: '#fff', outline: 'none',
  fontFamily: 'var(--font-sans)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '6px',
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '16px',
  border: '1px solid #f0f2f5',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  padding: '24px',
  marginBottom: '16px',
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '999px',
        background: checked ? 'var(--color-primary)' : '#e2e8f0',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s ease',
        flexShrink: 0, opacity: disabled ? 0.6 : 1,
        boxShadow: checked ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'connection', label: 'Conexão',
      icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    },
    {
      id: 'templates', label: 'Templates',
      icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    },
    {
      id: 'history', label: 'Histórico',
      icon: <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    },
  ]

  return (
    <div style={{
      display: 'flex', gap: '4px',
      background: '#f1f5f9', borderRadius: '12px', padding: '4px',
      marginBottom: '24px', width: 'fit-content',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 16px', borderRadius: '9px',
            border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            background: active === tab.id ? '#fff' : 'transparent',
            color: active === tab.id ? 'var(--color-primary)' : '#64748b',
            boxShadow: active === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ color: active === tab.id ? 'var(--color-primary)' : '#94a3b8' }}>
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Connection Tab ───────────────────────────────────────────────────────────

function ConnectionTab({ config, refetch }: { config: WhatsappConfig; refetch: () => void }) {
  const queryClient = useQueryClient()
  const [enabled,      setEnabled]      = useState(config.whatsappEnabled)
  const [instanceId,   setInstanceId]   = useState(config.zApiInstanceId ?? '')
  const [token,        setToken]        = useState('')       // nunca exibimos o token real
  const [clientToken,  setClientToken]  = useState('')      // nunca exibimos o client-token real
  const [reminder,     setReminder]     = useState(config.reminderHoursBefore)
  const [showToken,    setShowToken]    = useState(false)
  const [showClientToken, setShowClientToken] = useState(false)
  const [testPhone,    setTestPhone]    = useState('')
  const [testResult,   setTestResult]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [dirty,        setDirty]        = useState(false)

  // Sync quando config muda (vindo do servidor)
  useEffect(() => {
    setEnabled(config.whatsappEnabled)
    setInstanceId(config.zApiInstanceId ?? '')
    setReminder(config.reminderHoursBefore)
    setDirty(false)
  }, [config.whatsappEnabled, config.zApiInstanceId, config.reminderHoursBefore])

  // Mutation exclusiva para o toggle — auto-salva ao mudar
  const toggleMutation = useMutation({
    mutationFn: (value: boolean) => whatsappApi.saveConfig({
      whatsappEnabled: value,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })

  function handleToggle(value: boolean) {
    setEnabled(value)
    toggleMutation.mutate(value)
  }

  const saveMutation = useMutation({
    mutationFn: () => whatsappApi.saveConfig({
      whatsappEnabled:     enabled,
      zApiInstanceId:      instanceId || null,
      zApiToken:           token       || undefined,  // só envia se preenchido
      zApiClientToken:     clientToken || undefined,  // só envia se preenchido
      reminderHoursBefore: reminder,
    }),
    onSuccess: () => {
      setDirty(false)
      setToken('')
      setClientToken('')
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })

  const testMutation = useMutation({
    mutationFn: () => whatsappApi.test(testPhone),
    onSuccess: () => setTestResult({ ok: true,  msg: 'Mensagem de teste enviada com sucesso!' }),
    onError:   (e: any) => setTestResult({ ok: false, msg: e?.response?.data?.error ?? 'Falha ao enviar.' }),
  })

  function mark() { setDirty(true) }

  return (
    <div>
      {/* Status Banner */}
      <div style={{
        ...cardStyle,
        background: enabled && config.hasCredentials
          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
          : '#f8fafc',
        border: enabled && config.hasCredentials ? '1px solid #bbf7d0' : '1px solid #f0f2f5',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
          background: enabled && config.hasCredentials ? '#22c55e' : '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor" style={{ color: enabled && config.hasCredentials ? '#fff' : '#94a3b8' }} />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: 700, color: '#1a2530' }}>
            {enabled && config.hasCredentials
              ? 'WhatsApp conectado'
              : enabled && !config.hasCredentials
              ? 'Ativado — aguardando credenciais'
              : 'WhatsApp desativado'}
          </p>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
            {enabled && config.hasCredentials
              ? 'Mensagens serão enviadas automaticamente nos eventos configurados.'
              : enabled
              ? 'Preencha o Instance ID e Token abaixo para ativar o envio.'
              : 'Ative o toggle para começar a configurar.'}
          </p>
        </div>
        <Toggle checked={enabled} onChange={handleToggle} disabled={toggleMutation.isPending} />
      </div>

      {/* ── Aviso: conectar WhatsApp via QR Code ─────────────────────────── */}
      {enabled && config.hasCredentials && (
        <div style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fcd34d',
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                ⚠️ Conecte seu WhatsApp à instância Z-API
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#78350f', lineHeight: 1.6 }}>
                As credenciais estão salvas, mas o envio só funciona após vincular um número de WhatsApp à instância.
                Se a instância aparecer como <strong>"Desconectado"</strong> no Z-API, siga os passos abaixo:
              </p>
              <ol style={{ margin: '0 0 12px', padding: '0 0 0 18px', fontSize: '13px', color: '#78350f', lineHeight: 1.8 }}>
                <li>Acesse{' '}
                  <a href="https://app.z-api.io" target="_blank" rel="noopener noreferrer"
                    style={{ color: '#d97706', fontWeight: 700, textDecoration: 'none' }}>
                    app.z-api.io
                  </a>
                  {' '}→ sua instância → aba <strong>Dados da instância web</strong>
                </li>
                <li>No lado direito, clique em <strong>"Leia o QR Code"</strong></li>
                <li>No celular, abra o WhatsApp → toque nos <strong>3 pontos</strong> (menu) → <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong></li>
                <li>Escaneie o QR Code com a câmera do celular</li>
                <li>Aguarde o status mudar para <strong>"Conectado"</strong></li>
              </ol>
              <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>
                Após conectar, o envio de mensagens passará a funcionar normalmente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Credenciais Z-API */}
      <div style={{ ...cardStyle, opacity: enabled ? 1 : 0.6, pointerEvents: enabled ? 'auto' : 'none' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1a2530' }}>
          Credenciais Z-API
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: '#64748b' }}>
          Instance ID e Token: em{' '}
          <a href="https://app.z-api.io" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            app.z-api.io
          </a>
          {' '}→ sua instância → aba <strong>Dados da instância web</strong> → Credenciais.
          <br />
          Client-Token: menu lateral <strong>Segurança</strong> → <strong>Token de segurança da conta</strong>.
        </p>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Instance ID</label>
            <input
              value={instanceId}
              onChange={(e) => { setInstanceId(e.target.value); mark() }}
              style={inputStyle}
              placeholder="Ex: 3DC3B8C6A69E4..."
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Token
              {config.hasCredentials && (
                <span style={{ marginLeft: '8px', color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>
                  (token atual oculto — preencha apenas para atualizar)
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => { setToken(e.target.value); mark() }}
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder={config.hasCredentials ? '••••••••••••••••' : 'Cole o token aqui...'}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px',
                }}
              >
                {showToken
                  ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Client-Token (Security Token)
              {config.hasCredentials && (
                <span style={{ marginLeft: '8px', color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>
                  (atual oculto — preencha apenas para atualizar)
                </span>
              )}
            </label>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>
              Encontrado em{' '}
              <a href="https://app.z-api.io" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                app.z-api.io
              </a>
              {' '}→ menu lateral <strong style={{ color: '#64748b' }}>Segurança</strong> → <strong style={{ color: '#64748b' }}>Token de segurança da conta</strong>.
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type={showClientToken ? 'text' : 'password'}
                value={clientToken}
                onChange={(e) => { setClientToken(e.target.value); mark() }}
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder={config.hasCredentials ? '••••••••••••••••' : 'Cole o Security Token aqui...'}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowClientToken(!showClientToken)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px',
                }}
              >
                {showClientToken
                  ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Lembrete — horas antes do agendamento</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                min={1} max={168}
                value={reminder}
                onChange={(e) => { setReminder(Number(e.target.value)); mark() }}
                style={{ ...inputStyle, width: '100px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                {reminder === 24 ? 'padrão: 24h (1 dia)' : reminder === 48 ? '2 dias' : `${reminder}h antes`}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Botão salvar credenciais — sempre visível */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          style={{
            padding: '9px 20px', borderRadius: '10px', border: 'none',
            background: dirty ? 'var(--color-primary)' : '#e2e8f0',
            color: dirty ? '#fff' : '#94a3b8',
            fontSize: '13.5px', fontWeight: 600, cursor: !dirty ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            opacity: saveMutation.isPending ? 0.7 : 1,
          }}
        >
          {saveMutation.isPending ? 'Salvando...' : saveMutation.isSuccess && !dirty ? '✓ Salvo' : 'Salvar credenciais'}
        </button>
      </div>

      {/* Teste de conexão */}
      <div style={{ ...cardStyle, opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1a2530' }}>
          Testar conexão
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b' }}>
          Envia uma mensagem de teste para confirmar que a integração está funcionando.
        </p>

        {testResult && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
            background: testResult.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}`,
            color: testResult.ok ? '#15803d' : '#dc2626',
            fontSize: '13px', fontWeight: 600,
          }}>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Número de destino</label>
            <input
              value={testPhone}
              onChange={(e) => { setTestPhone(e.target.value); setTestResult(null) }}
              style={inputStyle}
              placeholder="(11) 99999-9999"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <button
            onClick={() => testMutation.mutate()}
            disabled={!testPhone.trim() || testMutation.isPending || !config.hasCredentials}
            style={{
              height: '40px', padding: '0 20px', borderRadius: '10px', border: 'none',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', flexShrink: 0,
              opacity: (!testPhone.trim() || !config.hasCredentials) ? 0.5 : 1,
            }}
          >
            {testMutation.isPending ? 'Enviando...' : 'Enviar teste'}
          </button>
        </div>
        {!config.hasCredentials && (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#f59e0b' }}>
            ⚠️ Salve as credenciais antes de testar.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Template Editor ──────────────────────────────────────────────────────────

function TemplateEditor({
  template,
  onSave,
  saving,
}: {
  template: WhatsappTemplate
  onSave: (event: string, body: string) => void
  saving: boolean
}) {
  const [body, setBody]   = useState(template.body)
  const [dirty, setDirty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { bg, color } = EVENT_COLOR[template.event] ?? { bg: '#f8fafc', color: '#64748b' }

  useEffect(() => {
    setBody(template.body)
    setDirty(false)
  }, [template.event, template.body])

  function insertVar(v: string) {
    const el = textareaRef.current
    if (!el) { setBody((b) => b + v); setDirty(true); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const newBody = body.slice(0, start) + v + body.slice(end)
    setBody(newBody)
    setDirty(true)
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + v.length
      el.focus()
    }, 0)
  }

  // Preview: substitui variáveis por valores de exemplo
  const preview = body
    .replace(/{{nome_paciente}}/g, 'Maria Silva')
    .replace(/{{clinica}}/g, 'Clínica Demo')
    .replace(/{{data}}/g, 'Segunda, 21 de Abril de 2026')
    .replace(/{{hora}}/g, '14:30')
    .replace(/{{profissional}}/g, 'Dr. João Santos')
    .replace(/{{procedimento}}/g, 'Consulta Geral')

  return (
    <div style={{
      background: '#fff', borderRadius: '16px', border: '1px solid #f0f2f5',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: '16px',
    }}>
      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #f0f2f5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', borderRadius: '8px',
            background: bg, fontSize: '16px',
          }}>
            {EVENT_ICON[template.event]}
          </span>
          <div>
            <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#1a2530' }}>
              {EVENT_LABEL[template.event]}
            </p>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
              {template.event}
            </p>
          </div>
        </div>
        <button
          onClick={() => { onSave(template.event, body); setDirty(false) }}
          disabled={!dirty || saving}
          style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none',
            background: dirty ? 'var(--color-primary)' : '#f1f5f9',
            color: dirty ? '#fff' : '#94a3b8',
            fontSize: '12.5px', fontWeight: 600, cursor: !dirty ? 'default' : 'pointer',
            fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Salvando...' : dirty ? 'Salvar' : '✓ Salvo'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
        {/* Editor */}
        <div style={{ padding: '16px 20px', borderRight: '1px solid #f0f2f5' }}>
          <p style={{ ...labelStyle, marginBottom: '8px' }}>Editar mensagem</p>

          {/* Variáveis */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            {TEMPLATE_VARS.map((v) => (
              <button
                key={v.label}
                onClick={() => insertVar(v.label)}
                title={v.desc}
                style={{
                  padding: '3px 8px', borderRadius: '6px', cursor: 'pointer',
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  fontSize: '11px', fontWeight: 600, color: '#475569',
                  fontFamily: 'var(--font-mono, monospace)',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = bg; (e.currentTarget as HTMLElement).style.color = color }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#475569' }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => { setBody(e.target.value); setDirty(true) }}
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: '160px',
              padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
              fontSize: '13px', color: '#1a2530', background: '#fff', outline: 'none',
              fontFamily: 'var(--font-sans)', lineHeight: 1.6, resize: 'vertical',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = '#e2e8f0' }}
          />
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
            {body.length} caracteres · Suporta *negrito* e _itálico_ do WhatsApp
          </p>
        </div>

        {/* Preview */}
        <div style={{ padding: '16px 20px', background: '#fafbfc' }}>
          <p style={{ ...labelStyle, marginBottom: '12px' }}>Preview (dados de exemplo)</p>

          {/* Simulação de tela de WhatsApp */}
          <div style={{
            background: '#e5ddd5',
            borderRadius: '12px',
            padding: '16px 12px',
            minHeight: '160px',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'%23e5ddd5\'/%3E%3C/svg%3E")',
          }}>
            <div style={{
              background: '#fff', borderRadius: '8px 8px 8px 0',
              padding: '10px 12px', maxWidth: '90%', display: 'inline-block',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}>
              <p style={{
                margin: 0, fontSize: '13px', color: '#111b21',
                lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'inherit',
              }}>
                {preview
                  .replace(/\*(.*?)\*/g, '**$1**')
                  .split('\n')
                  .map((line, i) => (
                    <span key={i}>
                      {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                        j % 2 === 1
                          ? <strong key={j}>{part}</strong>
                          : part
                      )}
                      {i < preview.split('\n').length - 1 && <br />}
                    </span>
                  ))
                }
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8696a0', textAlign: 'right' }}>
                14:30 ✓✓
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
  const queryClient = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: whatsappApi.getTemplates,
  })

  const [savingEvent, setSavingEvent] = useState<string | null>(null)

  async function handleSave(event: string, body: string) {
    setSavingEvent(event)
    try {
      await whatsappApi.saveTemplate(event, body)
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
    } finally {
      setSavingEvent(null)
    }
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <div style={{ width: '28px', height: '28px', border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Carregando templates...
      </div>
    )
  }

  return (
    <div>
      <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b' }}>
        Personalize as mensagens enviadas em cada evento. Clique nas variáveis para inserí-las no cursor.
      </p>
      {templates.map((tpl) => (
        <TemplateEditor
          key={tpl.event}
          template={tpl}
          onSave={handleSave}
          saving={savingEvent === tpl.event}
        />
      ))}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [eventFilter,  setEventFilter]  = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-jobs', { statusFilter, eventFilter, page }],
    queryFn: () => whatsappApi.listJobs({
      status: statusFilter || undefined,
      event:  eventFilter  || undefined,
      page,
      limit: 20,
    }),
  })

  const jobs       = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.totalPages ?? 1

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', width: 'auto', paddingRight: '32px',
    appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px',
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1) }} style={selectStyle}>
          <option value="">Todos os eventos</option>
          {Object.entries(EVENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={selectStyle}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(statusFilter || eventFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setEventFilter(''); setPage(1) }}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f2f5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: '28px', height: '28px', border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Carregando histórico...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>Nenhum envio encontrado</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              {statusFilter || eventFilter ? 'Tente outros filtros.' : 'Mensagens aparecerão aqui após o primeiro agendamento.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f5' }}>
                    {['Paciente', 'Evento', 'Status', 'Agendado para', 'Enviado em', 'Tentativas'].map((h) => (
                      <th key={h} style={{
                        padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                        color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const { bg: sBg, color: sColor } = STATUS_COLOR[job.status] ?? { bg: '#f8fafc', color: '#64748b' }
                    const { bg: eBg } = EVENT_COLOR[job.event] ?? { bg: '#f8fafc', color: '#64748b' }
                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#1a2530' }}>{job.patientName}</p>
                          <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>{job.phone}</p>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '6px', background: eBg,
                            fontSize: '12px', fontWeight: 600, color: '#374151',
                          }}>
                            {EVENT_ICON[job.event]} {EVENT_LABEL[job.event]}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                            background: sBg, color: sColor, fontSize: '12px', fontWeight: 600,
                          }}>
                            {STATUS_LABEL[job.status]}
                          </span>
                          {job.errorLog && (
                            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#dc2626' }} title={job.errorLog}>
                              ⚠ {job.errorLog.slice(0, 50)}…
                            </p>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12.5px', color: '#374151' }}>
                          {new Date(job.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12.5px', color: '#374151' }}>
                          {job.sentAt
                            ? new Date(job.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                            : <span style={{ color: '#94a3b8' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: job.retries > 0 ? '#f59e0b' : '#94a3b8', fontWeight: job.retries > 0 ? 700 : 400, textAlign: 'center' }}>
                          {job.retries}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f0f2f5' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Página {page} de {totalPages} · {meta?.total} envios
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setPage(page - 1)} disabled={page <= 1}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: '13px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1, fontFamily: 'var(--font-sans)' }}>
                    ← Anterior
                  </button>
                  <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: '13px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, fontFamily: 'var(--font-sans)' }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WhatsappPage() {
  const [activeTab, setActiveTab] = useState<Tab>('connection')

  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn:  whatsappApi.getConfig,
  })

  return (
    <div className="r-page" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px', animation: 'fadeUp 0.35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <h1 style={{
            margin: 0, fontSize: '22px', fontWeight: 400,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: '#1a2530', letterSpacing: '-0.02em',
          }}>
            WhatsApp
          </h1>
          {config && (
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700,
              background: config.whatsappEnabled && config.hasCredentials ? '#f0fdf4' : '#f8fafc',
              color: config.whatsappEnabled && config.hasCredentials ? '#15803d' : '#94a3b8',
              border: `1px solid ${config.whatsappEnabled && config.hasCredentials ? '#bbf7d0' : '#e2e8f0'}`,
            }}>
              {config.whatsappEnabled && config.hasCredentials ? '● Ativo' : '○ Inativo'}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
          Confirmações e lembretes automáticos via Z-API
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid #eaecef', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Carregando...
        </div>
      ) : config ? (
        <>
          <TabBar active={activeTab} onChange={setActiveTab} />
          {activeTab === 'connection' && <ConnectionTab config={config} refetch={refetch} />}
          {activeTab === 'templates'  && <TemplatesTab />}
          {activeTab === 'history'    && <HistoryTab />}
        </>
      ) : null}
    </div>
  )
}
