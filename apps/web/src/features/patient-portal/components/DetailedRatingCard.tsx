// ─── DetailedRatingCard ────────────────────────────────────────────────────────
//
// M11 — Avaliação Detalhada: nota 1–5 estrelas + comentário opcional.
// Aparece após o quick rating ser enviado (M9), para agendamentos COMPLETED
// que ainda não têm nota numérica.
//
// Fluxo:
//   IDLE → paciente clica nas estrelas
//   RATED → textarea de comentário liberada + botão "Enviar"
//   SUBMITTING → loading
//   DONE → agradecimento
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DetailedRatingCardProps {
  professionalName: string
  onSubmit: (rating: number, comment?: string) => Promise<void>
  onSkip: () => void
}

// ─── Estrela ──────────────────────────────────────────────────────────────────

function Star({ filled, hovered, onClick, onHover, onLeave }: {
  filled: boolean
  hovered: boolean
  onClick: () => void
  onHover: () => void
  onLeave: () => void
}) {
  const active = filled || hovered
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px', fontSize: '28px', lineHeight: 1,
        color: active ? '#f59e0b' : '#d1cdc8',
        transition: 'color 0.1s, transform 0.1s',
        transform: hovered ? 'scale(1.2)' : 'scale(1)',
      }}
    >
      ★
    </button>
  )
}

// ─── Labels das notas ─────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente!',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DetailedRatingCard({ professionalName, onSubmit, onSkip }: DetailedRatingCardProps) {
  type Step = 'idle' | 'rated' | 'submitting' | 'done'

  const [step, setStep]       = useState<Step>('idle')
  const [rating, setRating]   = useState<number>(0)
  const [hovered, setHovered] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit() {
    if (rating === 0) return
    setStep('submitting')
    setError(null)
    try {
      await onSubmit(rating, comment.trim() || undefined)
      setStep('done')
    } catch {
      setError('Não foi possível enviar. Tente novamente.')
      setStep('rated')
    }
  }

  return (
    <div style={cardStyle}>

      {/* ── Done ──────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '30px' }}>⭐</span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1614', margin: '8px 0 4px' }}>
            Avaliação enviada!
          </p>
          <p style={{ fontSize: '12px', color: '#8a7f75', margin: 0 }}>
            Obrigado por compartilhar sua experiência.
          </p>
        </div>
      )}

      {/* ── Idle / Rated / Submitting ──────────────────────────────────── */}
      {step !== 'done' && (
        <>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#5a4f47', margin: '0 0 12px', textAlign: 'center' }}>
            Dê uma nota para a consulta com {professionalName}
          </p>

          {/* Estrelas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                filled={n <= rating}
                hovered={n <= hovered}
                onClick={() => {
                  setRating(n)
                  setStep('rated')
                }}
                onHover={() => setHovered(n)}
                onLeave={() => setHovered(0)}
              />
            ))}
          </div>

          {/* Label da nota */}
          <p style={{
            textAlign: 'center', fontSize: '12px', fontWeight: 600,
            color: rating > 0 ? '#f59e0b' : '#b0a899',
            margin: '0 0 14px', minHeight: '16px',
          }}>
            {hovered > 0 ? RATING_LABELS[hovered] : (rating > 0 ? RATING_LABELS[rating] : 'Clique para avaliar')}
          </p>

          {/* Textarea de comentário — aparece após selecionar a nota */}
          {(step === 'rated' || step === 'submitting') && (
            <textarea
              placeholder="Conte mais sobre sua experiência (opcional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '10px 12px', borderRadius: '10px',
                border: '1.5px solid #e5e1db', background: '#faf8f5',
                fontSize: '13px', color: '#1a1614',
                fontFamily: 'var(--font-sans)',
                resize: 'none' as const, outline: 'none',
                marginBottom: '12px',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = '#e5e1db' }}
            />
          )}

          {error && (
            <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 8px', textAlign: 'center' }}>{error}</p>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(step === 'rated' || step === 'submitting') && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={step === 'submitting'}
                style={{
                  width: '100%', padding: '11px', borderRadius: '10px',
                  background: 'var(--color-primary)', border: 'none',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: step === 'submitting' ? 'wait' : 'pointer',
                  opacity: step === 'submitting' ? 0.7 : 1,
                  fontFamily: 'var(--font-sans)', transition: 'opacity 0.2s',
                }}
              >
                {step === 'submitting' ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            )}

            <button
              type="button"
              onClick={onSkip}
              disabled={step === 'submitting'}
              style={{
                width: '100%', padding: '9px', borderRadius: '10px',
                background: 'transparent', border: '1.5px solid #e5e1db',
                color: '#8a7f75', fontSize: '12px', fontWeight: 500,
                cursor: step === 'submitting' ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f0eb' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              Pular por agora
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:   '#fffdf9',
  borderRadius: '12px',
  border:       '1.5px solid color-mix(in srgb, #f59e0b 25%, #ece9e4)',
  padding:      '16px',
  marginTop:    '12px',
  animation:    'fadeUp 0.3s ease both',
}
