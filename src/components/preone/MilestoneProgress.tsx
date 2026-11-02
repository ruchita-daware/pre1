'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  AlertCircle,
  Circle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PartyPopper,
} from 'lucide-react'
import { AnimatedCheckmark } from './TactileMotion'

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'

export interface MilestoneItem {
  id: string
  title: string
  description?: string
  status: MilestoneStatus
  statusLabel?: string
  required?: boolean
  onClick?: () => void
}

export interface MilestoneProgressProps {
  milestones: MilestoneItem[]
  title?: string
  subtitle?: string
  celebrationTitle?: string
  celebrationMessage?: string
  /**
   * Unique key for caching celebration state so it triggers strictly ONCE per milestone completion
   */
  workflowKey?: string
  showCelebration?: boolean
  compact?: boolean
  className?: string
  /**
   * Enable clean up/down slider toggle to collapse or expand milestones
   */
  collapsible?: boolean
  /**
   * Default expanded state when collapsible is enabled (defaults to true)
   */
  defaultExpanded?: boolean
}

export function MilestoneProgress({
  milestones,
  title,
  subtitle,
  celebrationTitle = '🎉 Milestones Complete',
  celebrationMessage,
  workflowKey = 'default_workflow',
  showCelebration = true,
  compact = false,
  className = '',
  collapsible = false,
  defaultExpanded = true,
}: MilestoneProgressProps) {
  const [celebrating, setCelebrating] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Storage key for collapsible user preference
  const collapseStorageKey = workflowKey ? `preone_milestones_expanded:${workflowKey}` : null

  // Restore user expansion preference if stored
  useEffect(() => {
    if (!collapsible || !collapseStorageKey || typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(collapseStorageKey)
      if (saved !== null) {
        setIsExpanded(saved === 'true')
      }
    } catch {
      // ignore storage access errors
    }
  }, [collapsible, collapseStorageKey])

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev
      if (collapseStorageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(collapseStorageKey, String(next))
        } catch {
          // ignore
        }
      }
      return next
    })
  }

  // Motion preference detection
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  // Derived progress counts
  const { total, completed, requiredCount, requiredCompleted, allCompleted } = useMemo(() => {
    const total = milestones.length
    const completed = milestones.filter((m) => m.status === 'COMPLETED').length
    const required = milestones.filter((m) => m.required !== false)
    const requiredCount = required.length
    const requiredCompleted = required.filter((m) => m.status === 'COMPLETED').length
    const allCompleted = total > 0 && (requiredCount > 0 ? requiredCompleted === requiredCount : completed === total)
    return { total, completed, requiredCount, requiredCompleted, allCompleted }
  }, [milestones])

  // Single-fire celebration logic: persists to sessionStorage to avoid duplicate celebrations on re-render / reload
  useEffect(() => {
    if (!showCelebration || !allCompleted || typeof window === 'undefined') return

    const storageKey = `preone_celebrated:${workflowKey}`
    const alreadyCelebrated = sessionStorage.getItem(storageKey)

    if (!alreadyCelebrated) {
      sessionStorage.setItem(storageKey, 'true')
      setCelebrating(true)

      // Short-lived restrained celebration: automatically finishes after 3.5 seconds
      const timer = setTimeout(() => {
        setCelebrating(false)
      }, 3500)

      return () => clearTimeout(timer)
    }
  }, [allCompleted, showCelebration, workflowKey])

  return (
    <div
      className={`rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface)]/90 p-4 sm:p-5 shadow-xs transition-all ${className}`.trim()}
      role="region"
      aria-label={title || 'Workflow Progress'}
    >
      {/* Header with Title, Step Summary, and Up/Down Slider Toggle */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 ${
          isExpanded
            ? 'pb-3.5 border-b border-[var(--color-border-default)]'
            : 'pb-0 border-b border-transparent'
        } ${collapsible ? 'cursor-pointer select-none group' : ''}`}
        onClick={collapsible ? toggleExpanded : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleExpanded()
                }
              }
            : undefined
        }
        tabIndex={collapsible ? 0 : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls="milestone-content"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              {title || 'Workflow Milestones'}
            </h3>
            {allCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--status-success-surface)] text-[var(--status-success-foreground)] border border-[var(--status-success-border)]">
                <Sparkles size={11} className="text-[var(--status-success-foreground)]" />
                <span>Ready</span>
              </span>
            )}
            {!allCompleted && total > 0 && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/40">
                {Math.round((completed / total) * 100)}% Complete
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          {/* Subtle segmented progress bar and counter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              {completed} of {total} complete
            </span>
            <div className="flex items-center h-2 w-20 sm:w-28 bg-[var(--color-surface-subtle)] rounded-full p-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  allCompleted ? 'bg-[var(--status-success-foreground)]' : 'bg-[var(--color-brand-primary)]'
                }`}
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Up/Down Slider Toggle Button */}
          {collapsible && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded()
              }}
              aria-expanded={isExpanded}
              aria-controls="milestone-content"
              aria-label={isExpanded ? 'Slide up to collapse milestones' : 'Slide down to expand milestones'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-subtle)] rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] cursor-pointer"
              title={isExpanded ? 'Slide up to collapse' : 'Slide down to expand'}
            >
              <span className="hidden sm:inline text-[11px] font-semibold text-[var(--color-text-muted)]">
                {isExpanded ? 'Slide Up' : 'Slide Down'}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ease-in-out text-[var(--color-text-muted)] ${
                  isExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Sliding Content Container */}
      <div
        id="milestone-content"
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          opacity: isExpanded ? 1 : 0,
          transition: prefersReducedMotion
            ? 'none'
            : 'grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease',
          pointerEvents: isExpanded ? 'auto' : 'none',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {/* Restrained Celebration Banner */}
          {allCompleted && (
            <div
              role="status"
              className={`mt-3.5 p-3 rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-surface)] text-[var(--status-success-foreground)] flex items-center justify-between gap-3 text-xs transition-all duration-300 ${
                celebrating && !prefersReducedMotion ? 'ring-2 ring-[var(--status-success-foreground)]/50 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[var(--status-success-surface)] text-[var(--status-success-foreground)] shrink-0">
                  <PartyPopper className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[var(--status-success-foreground)]">
                    {celebrationTitle}
                  </p>
                  <p className="text-[var(--status-success-foreground)]/90 text-[11px] mt-0.5">
                    {celebrationMessage || `${completed} of ${total} steps ready for operation.`}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-[var(--status-success-foreground)] font-semibold text-[11px] bg-[var(--color-surface)] px-2.5 py-1 rounded-lg border border-[var(--status-success-border)]">
                <AnimatedCheckmark size={12} animate color="currentColor" />
                <span>Complete</span>
              </div>
            </div>
          )}

          {/* Milestone Checklist Items */}
          <div className={`mt-3 space-y-2 ${compact ? 'space-y-1.5' : 'space-y-2'}`}>
            {milestones.map((m, idx) => {
              const isDone = m.status === 'COMPLETED'
              const isInProgress = m.status === 'IN_PROGRESS'
              const isBlocked = m.status === 'BLOCKED'
              const isInteractive = typeof m.onClick === 'function'

              return (
                <div
                  key={m.id || idx}
                  onClick={() => isInteractive && m.onClick?.()}
                  role={isInteractive ? 'button' : undefined}
                  tabIndex={isInteractive ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      m.onClick?.()
                    }
                  }}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    isDone
                      ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border-default)] text-[var(--color-text-primary)]'
                      : isInProgress
                      ? 'bg-[var(--color-brand-surface)] border border-[var(--color-brand-primary)]/40 text-[var(--color-brand-primary)]'
                      : isBlocked
                      ? 'bg-[var(--status-warning-surface)] border border-[var(--status-warning-border)] text-[var(--status-warning-foreground)]'
                      : 'bg-transparent border border-transparent text-[var(--color-text-muted)]'
                  } ${isInteractive ? 'cursor-pointer hover:bg-[var(--color-surface-subtle)] hover:scale-[1.005] active:scale-[0.995]' : ''}`}
                >
                  {/* Left: Icon + Title + Description */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--status-success-surface)] text-[var(--status-success-foreground)] flex items-center justify-center">
                          <AnimatedCheckmark size={12} animate color="currentColor" strokeWidth={2.5} />
                        </div>
                      ) : isInProgress ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)] flex items-center justify-center animate-pulse">
                          <Clock3 size={12} />
                        </div>
                      ) : isBlocked ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--status-warning-surface)] text-[var(--status-warning-foreground)] flex items-center justify-center">
                          <AlertCircle size={12} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] flex items-center justify-center">
                          <Circle size={10} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isDone
                              ? 'text-[var(--color-text-primary)]'
                              : isInProgress
                              ? 'text-[var(--color-brand-primary)]'
                              : isBlocked
                              ? 'text-[var(--status-warning-foreground)]'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {m.title}
                        </span>
                        {m.required === false && (
                          <span className="text-[10px] text-[var(--color-text-muted)] font-normal">
                            (Optional)
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Pill & Navigation indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDone ? (
                      <span className="text-[11px] font-semibold text-[var(--status-success-foreground)] bg-[var(--status-success-surface)] px-2 py-0.5 rounded border border-[var(--status-success-border)]">
                        {m.statusLabel || 'Complete'}
                      </span>
                    ) : isInProgress ? (
                      <span className="text-[11px] font-semibold text-[var(--color-brand-primary)] bg-[var(--color-brand-surface)] px-2 py-0.5 rounded border border-[var(--color-brand-primary)]/40">
                        {m.statusLabel || 'In Progress'}
                      </span>
                    ) : isBlocked ? (
                      <span className="text-[11px] font-semibold text-[var(--status-warning-foreground)] bg-[var(--status-warning-surface)] px-2 py-0.5 rounded border border-[var(--status-warning-border)]">
                        {m.statusLabel || 'Waiting'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                        {m.statusLabel || 'Not started'}
                      </span>
                    )}

                    {isInteractive && (
                      <ChevronRight size={13} className="text-[var(--color-text-muted)]" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
