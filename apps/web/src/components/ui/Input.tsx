import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-text)',
            }}
          >
            {label}
            {props.required && (
              <span style={{ color: 'var(--danger-500)', marginLeft: 4 }}>*</span>
            )}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: '42px',
            padding: '0 14px',
            border: `1.5px solid ${error ? 'var(--danger-500)' : 'var(--color-border)'
              }`,
            borderRadius: '10px',
            fontSize: '14px',
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            ...style,
          }}
          {...props}
        />

        {error && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--danger-600)',
              margin: 0,
            }}
          >
      