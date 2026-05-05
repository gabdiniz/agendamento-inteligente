// ─── Patient Portal Config Page ───────────────────────────────────────────────
//
// Configurações do portal do paciente: regras de cancelamento.
// Acessível em /configuracoes/portal-paciente — apenas GESTOR/ADMIN.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { clinicPatientConfigApi, type ClinicPatientConfig } from '@/lib/api/clinic.api'

// ─── Statuses disponíveis para seleção ───────────────────────────────────────

const AVAILABLE_STATUSES = [
  { value: 'SCHEDULED',       label: 'Agendado',          description: 'Agendamentos ainda não confirmados' },
  { value: 'PATIENT_PRESENT', label: 'Paciente presente', description: 'Paciente já chegou à clínica' },
]

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '44px', height: '24px',
        borderRadius: '12px',
        background: checked ? 'var(--color-primary)' : '#d1d5db',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative' as const,
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute' as const,
        top: '3px',
        left: checked ? '22px' : '3px',
        width: '18px', height: '18px',
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #eaecef',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f2f5' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a2530', margin: '0 0 2px' }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientPortalConfigPage() {
  const [config, setConfig] = useState<ClinicPatientConfig>({
    cancellationAllowed: true,
    cancellationMinHoursInAdvance: 2,
    cancellationAllowedStatuses: ['SCHEDULED'],
  })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [hoursInput, setHoursInput] = useState('2')

  useEffect(() => {
    clinicPatientConfigApi.get()
      .then((cfg) => {
        setConfig(cfg)
        setHoursInput(String(cfg.cancellationMinHoursInAdvance))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleStatus(value: string, checked: boolean) {
    setConfig((prev) => ({
      ...prev,
      cancellationAllowedStatuses: checked
        ? [...prev.cancellationAllowedStatuses, value]
        : prev.cancellationAllowedStatuses.filter((s) => s !== value),
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const hours = Math.max(0, Math.min(168, parseInt(hoursInput, 10) || 0))
      const updated = await clinicPatientConfigApi.save({
        ...config,
        cancellationMinHoursInAdvance: hours,
      })
      setConfig(updated)
      setHoursInput(String(updated.cancellationMinHoursInAdvance))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Não foi possível salvar as configurações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 32px', display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280', fontSize: '14px' }}>
        <div style={{
          width: '18px', height: '18px',
          border: '2px solid #e5e7eb', borderTopColor: 'var(--color-primary)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        Carregando configurações...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '680px',
      padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 32px)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a2530', margin: '0 0 4px' }}>
          Portal do Paciente
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Configure o que os pacientes podem fazer pelo portal de autoatendimento.
        </p>
      </div>

      {/* Feedback */}
      {saved && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
          background: '#f0fdf4', border: '1.5px solid #86efac',
          fontSize: '13px', color: '#166534',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Configurações salvas com sucesso.
        </div>
      )}
      {error && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
          background: '#fff5f5', border: '1.5px solid #fecaca',
          fontSize: '13px', color: '#b91c1c',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ── Cancelamento habilitado ─────────────────────────────────────── */}
        <SectionCard
          title="Cancelamento pelo paciente"
          description="Permite que pacientes cancelem agendamentos diretamente pelo portal, sem precisar ligar para a clínica."
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a2530', margin: '0 0 2px' }}>
                {config.cancellationAllowed ? 'Habilitado' : 'Desabilitado'}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {config.cancellationAllowed
                  ? 'Pacientes podem cancelar pelo portal conforme as regras abaixo.'
                  : 'Pacientes precisam contatar a clínica para cancelar.'}
              </p>
            </div>
            <Toggle
              checked={config.cancellationAllowed}
              onChange={(v) => setConfig((p) => ({ ...p, cancellationAllowed: v }))}
            />
          </div>
        </SectionCard>

        {/* ── Antecedência mínima ─────────────────────────────────────────── */}
        <SectionCard
          title="Antecedência mínima"
          description="Define com quantas horas de antecedência o paciente pode cancelar. Use 0 para não impor limite."
        >
          <div style={{ opacity: config.cancellationAllowed ? 1 : 0.5, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                min={0}
                max={168}
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                disabled={!config.cancellationAllowed}
                style={{
                  width: '80px', padding: '10px 12px',
                  borderRadius: '10px', fontSize: '16px', fontWeight: 600,
                  border: '1.5px solid #e5e7eb', background: '#f9fafb',
                  color: '#1a2530', outline: 'none', textAlign: 'center',
                  fontFamily: 'var(--font-sans)',
                  cursor: config.cancellationAllowed ? 'auto' : 'not-allowed',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a2530', margin: '0 0 2px' }}>
                  {hoursInput === '0' || hoursInput === ''
                    ? 'Sem restrição de tempo'
                    : `${hoursInput}h antes do horário`}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                  Entre 0 e 168 horas (7 dias)
                </p>
              </div>
            </div>

            {/* Presets rápidos */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' as const }}>
              {[0, 1, 2, 4, 8, 24, 48].map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={!config.cancellationAllowed}
                  onClick={() => setHoursInput(String(h))}
                  style={{
                    padding: '5px 12px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: 600,
                    background: hoursInput === String(h) ? 'var(--color-primary)' : '#f3f4f6',
                    color: hoursInput === String(h) ? '#fff' : '#4b5563',
                    border: 'none', cursor: config.cancellationAllowed ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}
                >
                  {h === 0 ? 'Sem limite' : `${h}h`}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Statuses permitidos ─────────────────────────────────────────── */}
        <SectionCard
          title="Statuses permitidos para cancelamento"
          description="O paciente só pode cancelar quando o agendamento estiver em um desses estados."
        >
          <div style={{ opacity: config.cancellationAllowed ? 1 : 0.5, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {AVAILABLE_STATUSES.map((s) => {
                const checked = config.cancellationAllowedStatuses.includes(s.value)
                return (
                  <label
                    key={s.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px', borderRadius: '12px',
                      border: `1.5px solid ${checked ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : '#e5e7eb'}`,
                      background: checked ? 'color-mix(in srgb, var(--color-primary) 5%, white)' : '#fafafa',
                      cursor: config.cancellationAllowed ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!config.cancellationAllowed}
                      onChange={(e) => toggleStatus(s.value, e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', flexShrink: 0, cursor: 'inherit' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: checked ? 'var(--color-primary)' : '#1a2530', margin: '0 0 2px' }}>
                        {s.label}
                      </p>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                        {s.description}
                      </p>
                    </div>
                    {checked && (
                      <svg width="16" height="16" fill="none" stroke="var(--color-primary)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </label>
                )
              })}
            </div>

            {config.cancellationAllowed && config.cancellationAllowedStatuses.length === 0 && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Selecione ao menos um status para o cancelamento funcionar.
              </p>
            )}
          </div>
        </SectionCard>

        {/* ── Preview do comportamento ────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1.5px dashed #e2e8f0',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>
            Resumo do comportamento
          </p>
          {!config.cancellationAllowed ? (
            <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: 1.6 }}>
              🔒 Cancelamento <strong>desabilitado</strong>. Pacientes verão uma mensagem pedindo para contatar a clínica.
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: 1.6 }}>
              ✅ Pacientes podem cancelar agendamentos com status{' '}
              <strong>{config.cancellationAllowedStatuses.map((s) => AVAILABLE_STATUSES.find((a) => a.value === s)?.label ?? s).join(', ') || '—'}</strong>
              {parseInt(hoursInput, 10) > 0
                ? `, com pelo menos ${hoursInput}h de antecedência.`
                : ', sem restrição de horário.'}
            </p>
          )}
        </div>

        {/* Botão salvar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (config.cancellationAllowed && config.cancellationAllowedStatuses.length === 0)}
            style={{
              padding: '12px 28px', borderRadius: '10px',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', fontSize: '14px', fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving || (config.cancellationAllowed && config.cancellationAllowedStatuses.length === 0) ? 0.65 : 1,
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Salvando...
              </>
            ) : 'Salvar configurações'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
