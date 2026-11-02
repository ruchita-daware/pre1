'use client'

import React, { useMemo } from 'react'
import {
  CheckCircle2,
  Clock3,
  Loader2,
  AlertCircle,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { SaveStatus } from '@/lib/forms/use-autosave'

export interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSavedAt?: Date | null
  error?: Error | null
  onRetry?: () => void
  className?: string
  compact?: boolean
  showTime?: boolean
}

function formatSavedTime(date: Date): string {
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function SaveStatusIndicator({
  status,
  lastSavedAt,
  error,
  onRetry,
  className = '',
  compact = false,
  showTime = true,
}: SaveStatusIndicatorProps) {
  const formattedTime = useMemo(() => {
    return lastSavedAt ? formatSavedTime(lastSavedAt) : null
  }, [lastSavedAt])

  if (status === 'IDLE') {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs transition-all duration-200 select-none ${className}`.trim()}
    >
      {status === 'UNSAVED' && (
        <span className="inline-flex items-center gap-1.5 text-[var(--status-warning-foreground)] font-medium">
          <Clock3 className="w-3.5 h-3.5 shrink-0 animate-pulse text-[var(--status-warning-foreground)]" />
          <span>{compact ? 'Unsaved' : 'Unsaved changes'}</span>
        </span>
      )}

      {status === 'SAVING' && (
        <span className="inline-flex items-center gap-1.5 text-[var(--color-brand-primary)] font-medium">
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-[var(--color-brand-primary)]" />
          <span>{compact ? 'Saving…' : 'Saving draft…'}</span>
        </span>
      )}

      {status === 'SAVED' && (
        <span className="inline-flex items-center gap-1.5 text-[var(--status-success-foreground)] font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--status-success-foreground)]" />
          <span>
            {compact ? 'Draft saved' : 'Draft saved'}
            {showTime && formattedTime ? ` (${formattedTime})` : ''}
          </span>
        </span>
      )}

      {status === 'OFFLINE_LOCAL' && (
        <span className="inline-flex items-center gap-1.5 text-[var(--status-warning-foreground)] font-medium bg-[var(--status-warning-surface)] px-2 py-0.5 rounded border border-[var(--status-warning-border)]">
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-[var(--status-warning-foreground)]" />
          <span>{compact ? 'Offline' : 'Offline — stored locally'}</span>
        </span>
      )}

      {status === 'ERROR' && (
        <span className="inline-flex items-center gap-1.5 text-[var(--status-danger-foreground)] font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[var(--status-danger-foreground)]" />
          <span>{error?.message ? `Save failed: ${error.message}` : 'Save failed'}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 inline-flex items-center gap-1 text-[11px] underline font-semibold text-[var(--status-danger-foreground)] hover:text-[var(--status-danger-foreground)] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </span>
      )}
    </div>
  )
}
