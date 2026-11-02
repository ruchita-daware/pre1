'use client'

import React from 'react'
import { useCountUp } from '@/lib/motion/use-count-up'

export interface KpiTrend {
  dir?: 'up' | 'down' | 'flat' | 'neutral'
  text: string
  isPositive?: boolean
}

export interface KpiStatus {
  text: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export interface KpiMetricCardProps {
  /** Concise metric label (What is being measured?) */
  label: string
  /** Prominent numeric or textual metric value */
  value: string | number | null | undefined
  /** Unit indicator (e.g. '%', 'students', '₹') */
  unit?: string
  /** Semantic icon container */
  icon?: React.ReactNode
  /** Icon color styling or custom container class */
  iconClass?: string
  /** Meaningful context: comparison or trend indicator */
  trend?: KpiTrend
  /** Meaningful context: explanatory status with semantic dot */
  status?: KpiStatus
  /** Additional secondary context / metadata */
  meta?: string
  /** Loading skeleton state during data retrieval */
  loading?: boolean
  /** Genuine error message if metric failed to load */
  error?: string | null
  /** Interactive callback if clicking drills into details */
  onClick?: () => void
  /** Accessible title or tooltip */
  title?: string
  /** Additional styling classes */
  className?: string
  /** Active selected state */
  active?: boolean
  style?: React.CSSProperties
}

/**
 * PreOne High-Impact KPI Metric Card
 *
 * Combines Linear-style data refinement with preschool operational warmth.
 * Answers the three critical questions:
 * 1. What is being measured? (Concise uppercase label)
 * 2. What is the current value? (Strong tabular numeral)
 * 3. What meaningful context explains that value? (Trend, status, or subtitle)
 */
export function KpiMetricCard({
  label,
  value,
  unit,
  icon,
  iconClass = 'text-[var(--color-brand-primary)] bg-[var(--color-brand-surface)] border border-[var(--color-brand-primary)]/30',
  trend,
  status,
  meta,
  loading = false,
  error,
  onClick,
  title,
  className = '',
  active = false,
  style,
}: KpiMetricCardProps) {
  // Skeleton state during initial retrieval
  if (loading) {
    return (
      <div
        className={`preone-kpi-card p-4 sm:p-5 ${className}`}
        style={style}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
          <div className="h-8 w-8 animate-pulse rounded-xl bg-[var(--color-surface-subtle)]" />
        </div>
        <div className="mt-3 h-7 w-20 animate-pulse rounded-lg bg-[var(--color-surface-subtle)]" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
      </div>
    )
  }

  // Genuine error state (distinguished from zero or empty)
  if (error) {
    return (
      <div
        className={`rounded-2xl border border-[var(--status-danger-border)] bg-[var(--status-danger-surface)] p-4 sm:p-5 shadow-xs ${className}`}
        style={style}
      >
        <div className="font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--status-danger-foreground)]">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-[var(--status-danger-foreground)]">
          Data Unavailable
        </div>
        <p className="mt-1 text-[11px] text-[var(--status-danger-foreground)] font-sans">
          {error}
        </p>
      </div>
    )
  }

  const isClickable = Boolean(onClick)
  const isInteractive = isClickable
  const animatedValue = useCountUp(value, { duration: 400 })
  const displayValue = value != null ? animatedValue : '—'

  return (
    <div
      className={`preone-kpi-card group ${
        isInteractive ? 'interactive cursor-pointer' : ''
      } ${
        active ? 'active' : ''
      } ${className}`.trim()}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      title={title}
      style={style}
    >
      {/* Top Row: Metric Label & Optional Icon */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-heading text-[11.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] truncate">
          {label}
        </span>
        {icon && (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${iconClass} transition-transform duration-200 group-hover:scale-105`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {/* Primary Value Row: Tabular Numeral */}
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="data-numeric font-mono text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
          {displayValue}
        </span>
        {unit && (
          <span className="font-sans text-xs font-semibold text-[var(--text-secondary)]">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom Context Row: Status, Trend or Meta */}
      {(status || trend || meta) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
          {status && (
            <div
              className={`flex items-center gap-1 font-medium ${
                status.variant === 'warning'
                  ? 'text-[var(--status-warning-foreground)]'
                  : status.variant === 'danger'
                  ? 'text-[var(--status-danger-foreground)]'
                  : status.variant === 'info'
                  ? 'text-[var(--status-info-foreground)]'
                  : status.variant === 'neutral'
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--status-success-foreground)]'
              }`}
            >
              <span className="text-[8px]" aria-hidden="true">●</span>
              <span>{status.text}</span>
            </div>
          )}

          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive !== undefined
                  ? trend.isPositive
                    ? 'text-[var(--status-success-foreground)]'
                    : 'text-[var(--status-danger-foreground)]'
                  : trend.dir === 'up'
                  ? 'text-[var(--status-success-foreground)]'
                  : trend.dir === 'down'
                  ? 'text-[var(--status-danger-foreground)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {trend.text}
            </span>
          )}

          {meta && (
            <span className="text-[var(--color-text-muted)] truncate">
              {meta}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
