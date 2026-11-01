'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X as ClearIcon,
} from 'lucide-react'

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export type DatePickerMode = 'days' | 'month' | 'year'

export interface ParsedDate {
  y: number
  m: number // 0-indexed (0 = January)
  d: number // 1-indexed (1 to 31)
}

/**
 * Parses any date input safely into local calendar coordinates (year, month, day),
 * completely bypassing UTC offset shifts.
 */
export function parseDateSafe(val?: string | Date | null): ParsedDate | null {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return { y: val.getFullYear(), m: val.getMonth(), d: val.getDate() }
  }
  const str = String(val).trim()
  if (!str) return null

  // Fast path for YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10)
    const m = parseInt(ymdMatch[2], 10) - 1
    const d = parseInt(ymdMatch[3], 10)
    return { y, m, d }
  }

  // Fallback for timestamps or alternative formats
  const parsed = new Date(str)
  if (isNaN(parsed.getTime())) return null
  return { y: parsed.getFullYear(), m: parsed.getMonth(), d: parsed.getDate() }
}

/**
 * Formats local year, month (0-indexed), and day into canonical YYYY-MM-DD format.
 */
export function formatToDateOnly(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

/**
 * Safe conversion of Date object or date string to canonical YYYY-MM-DD.
 */
export function toDateOnlyIso(d?: Date | string | null): string {
  if (!d) return ''
  const parsed = parseDateSafe(d)
  if (!parsed) return ''
  return formatToDateOnly(parsed.y, parsed.m, parsed.d)
}

/**
 * Backwards compatibility alias for toIso
 */
export const toIso = (d: Date): string => formatToDateOnly(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * Formats a date-only value for user display according to PreOne conventions (e.g. "5 Nov 2026").
 */
export function formatDisplayDate(val?: string | Date | null, locale = 'en-IN'): string {
  const parsed = parseDateSafe(val)
  if (!parsed) return ''
  const dateObj = new Date(parsed.y, parsed.m, parsed.d)
  return dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface GlobalDatePickerProps {
  /** Selected date as ISO string (YYYY-MM-DD or timestamp), Date object, or null/undefined */
  value?: string | Date | null
  /** Callback fired with date-only ISO string (YYYY-MM-DD) or empty string on clear */
  onChange?: (dateIso: string) => void
  /** Form field name for native form / FormData submission (renders hidden input) */
  name?: string
  /** Placeholder text when no date is selected */
  placeholder?: string
  /** Minimum selectable date (YYYY-MM-DD, timestamp, or Date) */
  minDate?: string | Date
  /** Maximum selectable date (YYYY-MM-DD, timestamp, or Date) */
  maxDate?: string | Date
  /** Disabled state */
  disabled?: boolean
  /** Required field flag */
  required?: boolean
  /** Read-only state */
  readOnly?: boolean
  /** Additional root container class name */
  className?: string
  /** ID for accessibility */
  id?: string
  /** Automatically close the calendar popup after 1 click on a day cell (default: true) */
  autoCloseOnSelect?: boolean
  /** Whether to show the 'Today' action button (default: true) */
  showToday?: boolean
  /** Whether to show the 'Clear' action button (default: true) */
  showClear?: boolean
  /** Alignment of popup menu relative to trigger input ('left' | 'right') */
  align?: 'left' | 'right'
  /** Visual density/size */
  size?: 'sm' | 'md'
  /** Custom aria-label for calendar */
  ariaLabel?: string
}

/**
 * Canonical Global Date Picker Component
 * Pure date-only selection with 1-click UX, zero timezone shifts, and consistent PreOne styling.
 */
export function GlobalDatePicker({
  value,
  onChange,
  name,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled = false,
  required = false,
  readOnly = false,
  className = '',
  id,
  autoCloseOnSelect = true,
  showToday = true,
  showClear = true,
  align = 'left',
  size = 'md',
  ariaLabel,
}: GlobalDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DatePickerMode>('days')

  const safeVal = useMemo(() => parseDateSafe(value), [value])
  const isoValue = useMemo(() => (safeVal ? formatToDateOnly(safeVal.y, safeVal.m, safeVal.d) : ''), [safeVal])

  const parsedMin = useMemo(() => parseDateSafe(minDate), [minDate])
  const parsedMax = useMemo(() => parseDateSafe(maxDate), [maxDate])

  const minIso = useMemo(() => (parsedMin ? formatToDateOnly(parsedMin.y, parsedMin.m, parsedMin.d) : null), [parsedMin])
  const maxIso = useMemo(() => (parsedMax ? formatToDateOnly(parsedMax.y, parsedMax.m, parsedMax.d) : null), [parsedMax])

  const [view, setView] = useState<{ y: number; m: number }>(() => {
    if (safeVal) return { y: safeVal.y, m: safeVal.m }
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth() }
  })

  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(view.y / 12) * 12)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync internal view when value changes while open or when opened
  useEffect(() => {
    if (open) {
      if (safeVal) {
        setView({ y: safeVal.y, m: safeVal.m })
        setYearPageStart(Math.floor(safeVal.y / 12) * 12)
      } else {
        setYearPageStart(Math.floor(view.y / 12) * 12)
      }
      setMode('days')
    }
  }, [open, safeVal])

  // Click outside and global Escape key listeners
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as HTMLElement)) {
        setOpen(false)
        setMode('days')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode !== 'days') {
          setMode('days')
        } else {
          setOpen(false)
          inputRef.current?.focus()
        }
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, mode])

  // Single-click selection handler
  const pick = useCallback(
    (d: ParsedDate) => {
      if (disabled || readOnly) return
      const iso = formatToDateOnly(d.y, d.m, d.d)

      // Bounds validation
      if (minIso && iso < minIso) return
      if (maxIso && iso > maxIso) return

      onChange?.(iso)
      if (autoCloseOnSelect) {
        setOpen(false)
        setMode('days')
        inputRef.current?.focus()
      }
    },
    [autoCloseOnSelect, disabled, readOnly, minIso, maxIso, onChange]
  )

  // Today handler
  const handleToday = useCallback(() => {
    if (disabled || readOnly) return
    const now = new Date()
    const todayParsed: ParsedDate = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
    setView({ y: todayParsed.y, m: todayParsed.m })
    pick(todayParsed)
  }, [disabled, readOnly, pick])

  // Clear handler
  const handleClear = useCallback(() => {
    if (disabled || readOnly) return
    onChange?.('')
    setOpen(false)
    setMode('days')
    inputRef.current?.focus()
  }, [disabled, readOnly, onChange])

  // Month day grid calculations
  const cells = useMemo(() => {
    const startPad = new Date(view.y, view.m, 1).getDay()
    const daysIn = new Date(view.y, view.m + 1, 0).getDate()
    const out: (ParsedDate | null)[] = []
    for (let i = 0; i < startPad; i++) out.push(null)
    for (let d = 1; d <= daysIn; d++) {
      out.push({ y: view.y, m: view.m, d })
    }
    return out
  }, [view.y, view.m])

  const todayIso = useMemo(() => {
    const now = new Date()
    return formatToDateOnly(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const monthLabel = `${MONTH_NAMES[view.m]} ${view.y}`
  const displayFormatted = safeVal ? formatDisplayDate(value) : ''

  return (
    <div
      className={`dp-root ${disabled ? 'dp-disabled' : ''} ${className}`}
      ref={rootRef}
      style={{ width: '100%' }}
    >
      <div
        className={`dp-input ${size === 'sm' ? 'dp-input-sm' : ''}`}
        onClick={() => {
          if (!disabled && !readOnly) {
            setOpen((o) => !o)
          }
        }}
      >
        <CalIcon size={size === 'sm' ? 14 : 15} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          value={displayFormatted}
          readOnly
          disabled={disabled}
          required={required}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel || placeholder}
          onKeyDown={(e) => {
            if (disabled || readOnly) return
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(true)
            }
          }}
        />
        {showClear && !disabled && !readOnly && isoValue && (
          <button
            type="button"
            className="dp-input-clear-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            aria-label="Clear date"
            title="Clear date"
          >
            <ClearIcon size={13} />
          </button>
        )}
      </div>

      {name && <input type="hidden" name={name} value={isoValue} />}

      {open && (
        <div
          className={`dp-cal ${align === 'right' ? 'align-right' : ''}`}
          role="dialog"
          aria-label={monthLabel}
        >
          {/* ── Mode 1: Days Grid ── */}
          {mode === 'days' && (
            <>
              <div className="dp-head">
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Previous month"
                  onClick={() =>
                    setView((v) => ({
                      y: v.m === 0 ? v.y - 1 : v.y,
                      m: v.m === 0 ? 11 : v.m - 1,
                    }))
                  }
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="dp-title-group">
                  <button
                    type="button"
                    className="dp-title-btn"
                    onClick={() => setMode('month')}
                    aria-label="Select month"
                    title="Click to select month"
                  >
                    <span>{MONTH_NAMES[view.m]}</span>
                    <ChevronDown size={11} style={{ opacity: 0.6 }} />
                  </button>
                  <button
                    type="button"
                    className="dp-title-btn"
                    onClick={() => {
                      setYearPageStart(Math.floor(view.y / 12) * 12)
                      setMode('year')
                    }}
                    aria-label="Select year"
                    title="Click to select year"
                  >
                    <span>{view.y}</span>
                    <ChevronDown size={11} style={{ opacity: 0.6 }} />
                  </button>
                </div>
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Next month"
                  onClick={() =>
                    setView((v) => ({
                      y: v.m === 11 ? v.y + 1 : v.y,
                      m: v.m === 11 ? 0 : v.m + 1,
                    }))
                  }
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="dp-grid dp-weekdays" aria-hidden="true">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="dp-dow">
                    {d}
                  </span>
                ))}
              </div>

              <div className="dp-grid" role="grid" aria-label="Month days">
                {cells.map((d, i) => {
                  if (!d) {
                    return <span key={i} className="dp-day-empty" aria-hidden="true" />
                  }
                  const cellIso = formatToDateOnly(d.y, d.m, d.d)
                  const isSelected = isoValue === cellIso
                  const isToday = todayIso === cellIso
                  const isBeforeMin = minIso ? cellIso < minIso : false
                  const isAfterMax = maxIso ? cellIso > maxIso : false
                  const isDisabled = isBeforeMin || isAfterMax

                  return (
                    <button
                      type="button"
                      key={i}
                      disabled={isDisabled}
                      className={`dp-day${isSelected ? ' on' : ''}${isToday && !isSelected ? ' is-today' : ''}${isDisabled ? ' disabled' : ''}`}
                      onClick={() => pick(d)}
                      aria-label={`${d.d} ${MONTH_NAMES[d.m]} ${d.y}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
                      aria-selected={isSelected}
                    >
                      {d.d}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Mode 2: Month Grid ── */}
          {mode === 'month' && (
            <>
              <div className="dp-head">
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Previous year"
                  onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))}
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="dp-title-group">
                  <span className="dp-view-title">Select Month</span>
                  <button
                    type="button"
                    className="dp-title-btn"
                    onClick={() => {
                      setYearPageStart(Math.floor(view.y / 12) * 12)
                      setMode('year')
                    }}
                    aria-label="Select year"
                    title="Click to select year"
                  >
                    <span>{view.y}</span>
                    <ChevronDown size={11} style={{ opacity: 0.6 }} />
                  </button>
                </div>
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Next year"
                  onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="dp-month-grid">
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected = view.m === idx
                  return (
                    <button
                      key={mName}
                      type="button"
                      className={`dp-selection-btn${isSelected ? ' on' : ''}`}
                      onClick={() => {
                        setView((v) => ({ ...v, m: idx }))
                        setMode('days')
                      }}
                      aria-label={mName}
                    >
                      <span className="dp-selection-label">{MONTH_SHORT[idx]}</span>
                      <span className="dp-selection-sub">{mName}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Mode 3: Year Grid ── */}
          {mode === 'year' && (
            <>
              <div className="dp-head">
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Previous 12 years"
                  onClick={() => setYearPageStart((ys) => ys - 12)}
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="dp-title-group">
                  <span className="dp-view-title">
                    {yearPageStart} – {yearPageStart + 11}
                  </span>
                </div>
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Next 12 years"
                  onClick={() => setYearPageStart((ys) => ys + 12)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="dp-year-grid">
                {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((yr) => {
                  const isSelected = view.y === yr
                  const isCurrentYear = new Date().getFullYear() === yr
                  return (
                    <button
                      key={yr}
                      type="button"
                      className={`dp-selection-btn${isSelected ? ' on' : ''}${isCurrentYear && !isSelected ? ' today' : ''}`}
                      onClick={() => {
                        setView((v) => ({ ...v, y: yr }))
                        setMode('days')
                      }}
                    >
                      <span className="dp-selection-label">{yr}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Footer Actions: Today & Clear ── */}
          <div className="dp-foot">
            {mode !== 'days' ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMode('days')}
              >
                Back to Dates
              </button>
            ) : (
              <>
                {showToday && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleToday}
                  >
                    Today
                  </button>
                )}
                {showClear && isoValue && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleClear}
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalDatePicker
