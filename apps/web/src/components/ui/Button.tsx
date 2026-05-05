import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const base = [
  'inline-flex items-center justify-center gap-2',
  'font-medium cursor-pointer select-none',
  'rounded-[10px]',
  'transition-colors duration-150',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

const variants: Record<Variant, string> = {
  primary: [
    'bg-[--color-primary] text-[--color-text-inverse]',
    'hover:bg-[--color-primary-hover]',
    'focus-visible:ring-[--color-primary]',
  ].join(' '),

  secondary: [
    'bg-[--color-surface] text-[--color-text]',
    'border border-[--color-border]',
    'hover:bg-[--color-bg-subtle]',
    'focus-visible:ring-[--color-border-strong]',
  ].join(' '),

  danger: [
    'bg-[--danger-600] text-white',
    'hover:bg-[--danger-500]',
    'focus-visible:ring-[--danger-600]',
  ].join(' '),

  ghost: [
    'bg-transparent text-[--color-text-secondary]',
    'hover:bg-[--color-bg-subtle] hover:text-[--color-text]',
    'focus-visible:ring-[--color-border-strong]',
  ].join(' '),
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      )}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'