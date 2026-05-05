// ─── QuickRatingCard ──────────────────────────────────────────────────────────
//
// M9 — Avaliação Leve: componente de avaliação rápida por emoji.
//
// Fluxo:
//   IDLE → usuário escolhe emoji (😊 😐 😞)
//   POSITIVE → agradecimento + link Google Maps
//   NEUTRAL / NEGATIVE → checkboxes de motivo → enviar
//   DONE → confirmação final
//
// FIX: usa um único <div style={cardStyle}> para todos os steps.
// A versão anterior usava early returns com um <div> por step, fazendo o
// cardStyle desmontar/remontar a cada troca de step. Como cardStyle tem
// `animation: fadeUp`, isso re-disparava a animação e causava o efeito
// visual de "lista aparece e some rapidamente" ao clicar no emoji.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { QuickRating } from '@/lib/api/patient-auth.api'

// ─── Razões pré-definidas ─────────────────────────────────────────────────────

const NEGATIVE_REASONS = [
  'Esperei muito tempo',
  'Resultado abaixo do esperado',
  'Problema no atendimento',
  'Dificuldade para agendar',
  'Outro motivo',
]

// ─── Props ────────────────────────────────────────────────────────────────────

export interface QuickRatingCardProps {
  appointmentId: string
  professionalName: string
  onSubmit: (rating: QuickRating, reasons: string[]) => Promise<void>
  googleMapsUrl?: string   // link da clínica no Google Maps para avaliação positiva
}

// ─────────────────────────────────────────────────────────────────────────────

export function QuickRatingCard({
  professionalName,
  onSubmit,
  googleMapsUrl,
}: QuickRatingCardProps) {
  type Step = 'idle' | 'positive' | 'negative' | 'submitting' | 'done'

  const [step, setStep]           = useState<Step>('idle')
  const [selected, setSelected]   = useState<QuickRating | null>(null)
  const [reasons, setReasons]     = useState<string[]>([])
  const [error, setError]         = useState<string | null>(null)

  function toggleReason(r: string) {
    setReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    )
  }

  async function handleSubmit() {
    if (!selected) return
    setStep('submitting')
    setError(null)
    try {
      await onSubmit(selected, reasons)
      setStep('done')
    } catch {
      setError('Não foi possível enviar sua avaliação. Tente novamente.')
      setStep(selected === 'POSITIVE' ? 'positive' : 'negative')
    }
  }

  // ─── Renderização unificada ────────────────────────────────────────────────
  //
  // Um único <div style={cardStyle}> persiste entre os steps — a animação
  // fadeUp só é disparada uma vez, quando o card monta pela primeira vez.

  return (
    <div style={cardStyle}>

      {/* ── Done ────────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '32px' }}>🙏</span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1614', margin: '8px 0 4px' }}>
            Obrigado pelo feedback!
          </p>
          <p style={{ fontSize: '12px', color: '#8a7f75', margin: 0 }}>
            Sua avaliação ajuda a melhorar o atendimento.
          </p>
        </div>
      )}

      {/* ── Idle — escolha do emoji ──────────────────────────────────────── */}
      {step === 'idle' && (
        <>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#5a4f47', margin: '0 0 12px', textAlign: 'center' }}>
            Como foi sua consulta com {professionalName}?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            {([
              { emoji: '😊', value: 'POSITIVE' as const, label: 'Ótimo'   },
              { emoji: '😐', value: 'NEUTRAL'  as const, label: 'Regular' },
              { emoji: '😞', value: 'NEGATIVE' as const, label: 'Ruim'    },
            ]).map(({ emoji, value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setSelected(value)
                  setStep(value === 'POSITIVE' ? 'positive' : 'negative')
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '8px',
                  borderRadius: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f0eb' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <span style={{ fontSize: '32px', lineHeight: 1 }}>{emoji}</span>
                <span style={{ fontSize: '11px', color: '#8a7f75', fontWeight: 500 }}>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Positive — agradecimento + Google Maps ───────────────────────── */}
      {/* Inclui 'submitting' quando o fluxo é positivo para não piscar os checkboxes */}
      {(step === 'positive' || (step === 'submitting' && selected === 'POSITIVE')) && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '28px' }}>😊</span>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1614', margin: '8px 0 4px' }}>
              Que ótimo! Fico feliz que tenha gostado.
            </p>
            <p style={{ fontSize: '12px', color: '#8a7f75', margin: 0, lineHeight: 1.5 }}>
              Que tal deixar uma avaliação no Google? Isso ajuda muito a clínica.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '10px', borderRadius: '10px',
                  background: 'var(--color-primary)', color: '#fff',
                  textDecoration: 'none', fontSize: '13px', fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Avaliar no Google Maps
              </a>
            )}
            <button
              onClick={() => void handleSubmit()}
              disabled={step === 'submitting'}
              style={{
                padding: '10px', borderRadius: '10px',
                background: 'transparent', border: '1.5px solid #ece9e4',
                color: '#8a7f75', fontSize: '13px', fontWeight: 500,
                cursor: step === 'submitting' ? 'wait' : 'pointer',
                opacity: step === 'submitting' ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
                transition: 'opacity 0.2s',
              }}
            >
              {step === 'submitting' ? 'Enviando...' : 'Apenas confirmar avaliação'}
            </button>
          </div>

          {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: '8px 0 0', textAlign: 'center' }}>{error}</p>}
        </>
      )}

      {/* ── Neutral / Negative — motivos ─────────────────────────────────── */}
      {/* 'submitting' só aparece aqui quando o fluxo é negativo/neutro      */}
      {(step === 'negative' || (step === 'submitting' && selected !== 'POSITIVE')) && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '22px' }}>{selected === 'NEUTRAL' ? '😐' : '😞'}</span>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#5a4f47', margin: 0 }}>
              {selected === 'NEUTRAL'
                ? 'O que poderia ter sido melhor?'
                : 'Sentimos muito. O que aconteceu?'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {NEGATIVE_REASONS.map((r) => (
              <label
                key={r}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 10px', borderRadius: '8px',
                  background: reasons.includes(r) ? 'color-mix(in srgb, var(--color-primary) 8%, white)' : '#faf9f7',
                  border: `1.5px solid ${reasons.includes(r) ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : '#ece9e4'}`,
                  cursor: 'pointer', fontSize: '13px', color: '#3d3530',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={reasons.includes(r)}
                  onChange={() => toggleReason(r)}
                  style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary)', flexShrink: 0 }}
                />
                {r}
              </label>
            ))}
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 8px', textAlign: 'center' }}>{error}</p>
          )}

          <button
            onClick={() => void handleSubmit()}
            disabled={step === 'submitting'}
            style={{
              width: '100%', padding: '11px', borderRadius: '10px',
              background: 'var(--color-primary)', border: 'none',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: step === 'submitting' ? 'wait' : 'pointer',
              opacity: step === 'submitting' ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
              transition: 'opacity 0.2s',
            }}
          >
            {step === 'submitting' ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </>
      )}

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:   '#fffdf9',
  borderRadius: '12px',
  border:       '1.5px solid color-mix(in srgb, var(--color-primary) 20%, #ece9e4)',
  padding:      '16px',
  marginTop:    '12px',
  animation:    'fadeUp 0.3s ease both',
}
