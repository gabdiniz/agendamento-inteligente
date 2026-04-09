import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            {label}
            {props.required && <span className="ml-1" style={{ color: 'var(--danger-500)' }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'h-10 w-full px-3 text-sm rounded-[--radius-md]',
            'border transition-colors duration-150',
            'placeholder:text-[--color-text-muted]',
            'focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:ring-offset-0',
            error
              ? 'border-[--danger-500] focus:ring-[--danger-500]'
              : 'border-[--color-border] focus:border-[--color-primary]',
            'bg-[--color-surface] text-[--color-text]',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: 'var(--danger-600)' }}>{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
