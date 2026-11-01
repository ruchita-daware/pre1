'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar as CalIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { AnimatedCheckmark } from './TactileMotion'

/* ─── Date picker ─────────────────────────────────────────────────── */

export function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseDateSafe(val?: string | Date | null): { y: number; m: number; d: number } | null {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return { y: val.getFullYear(), m: val.getMonth(), d: val.getDate() }
  }
  const str = String(val).trim()
  if (!str) return null
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymdMatch) {
    return {
      y: parseInt(ymdMatch[1], 10),
      m: parseInt(ymdMatch[2], 10) - 1,
      d: parseInt(ymdMatch[3], 10),
    }
  }
  const parsed = new Date(str)
  if (isNaN(parsed.getTime())) return null
  return { y: parsed.getFullYear(), m: parsed.getMonth(), d: parsed.getDate() }
}

export function formatToDateOnly(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

export function toDateOnlyIso(d?: Date | string | null): string {
  if (!d) return ''
  const parsed = parseDateSafe(d)
  if (!parsed) return ''
  return formatToDateOnly(parsed.y, parsed.m, parsed.d)
}

export function formatDisplayDate(val?: string | Date | null, locale = 'en-IN'): string {
  const parsed = parseDateSafe(val)
  if (!parsed) return ''
  const dateObj = new Date(parsed.y, parsed.m, parsed.d)
  return dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

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

export interface GlobalDatePickerProps {
  value?: string | Date | null
  onChange?: (iso: string) => void
  name?: string
  placeholder?: string
  minDate?: string | Date
  maxDate?: string | Date
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  className?: string
  id?: string
  autoCloseOnSelect?: boolean
  showToday?: boolean
  showClear?: boolean
  align?: 'left' | 'right'
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function DatePicker({
  value,
  onChange = () => {},
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

  const pick = (d: Date | { y: number; m: number; d: number }) => {
    if (disabled || readOnly) return
    const parsed = d instanceof Date ? { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() } : d
    const iso = formatToDateOnly(parsed.y, parsed.m, parsed.d)

    if (minIso && iso < minIso) return
    if (maxIso && iso > maxIso) return

    onChange(iso)
    if (autoCloseOnSelect) {
      setOpen(false)
      setMode('days')
      inputRef.current?.focus()
    }
  }

  const handleToday = () => {
    if (disabled || readOnly) return
    const now = new Date()
    const todayParsed = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
    setView({ y: todayParsed.y, m: todayParsed.m })
    pick(todayParsed)
  }

  const handleClear = () => {
    if (disabled || readOnly) return
    onChange('')
    setOpen(false)
    setMode('days')
    inputRef.current?.focus()
  }

  const cells = useMemo(() => {
    const startPad = new Date(view.y, view.m, 1).getDay()
    const daysIn = new Date(view.y, view.m + 1, 0).getDate()
    const out: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) out.push(null)
    for (let d = 1; d <= daysIn; d++) out.push(new Date(view.y, view.m, d))
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
        <CalIcon size={size === 'sm' ? 14 : 15} />
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
      </div>
      {name && <input type="hidden" name={name} value={isoValue} />}
      {open && (
        <div
          className={`dp-cal ${align === 'right' ? 'align-right' : ''}`}
          role="dialog"
          aria-label={monthLabel}
        >
          {mode === 'days' && (
            <>
              <div className="dp-head">
                <button
                  type="button"
                  className="dp-nav"
                  aria-label="Previous month"
                  onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: v.m === 0 ? 11 : v.m - 1 }))}
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
                  onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: v.m === 11 ? 0 : v.m + 1 }))}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="dp-grid dp-weekdays">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="dp-dow">{d}</span>
                ))}
              </div>
              <div className="dp-grid">
                {cells.map((d, i) => {
                  if (!d) {
                    return <span key={i} className="dp-day-empty" aria-hidden="true" />
                  }
                  const cellIso = toIso(d)
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
                      aria-label={`${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
                      aria-selected={isSelected}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
            </>
          )}

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
                  <span className="dp-view-title">{yearPageStart} – {yearPageStart + 11}</span>
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

export const GlobalDatePicker = DatePicker

/* ─── Input masks ─────────────────────────────────────────────────── */

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '')
  const digits = d.length > 10 && d.startsWith('91') ? d.slice(2) : d
  const n = digits.slice(0, 10)
  return n.length > 5 ? `${n.slice(0, 5)} ${n.slice(5)}` : n
}

export function maskAadhaar(value: string): string {
  const n = value.replace(/\D/g, '').slice(0, 12)
  return n.replace(/(.{4})(?=.)/g, '$1 ')
}

export const unmask = (value: string) => value.replace(/\D/g, '')

export function MaskedInput({
  name, mask = 'phone', value, onChange, placeholder, required,
}: {
  name?: string
  mask?: 'phone' | 'aadhaar'
  value?: string
  onChange?: (rawDigits: string) => void
  placeholder?: string
  required?: boolean
}) {
  const [display, setDisplay] = useState(value ? (mask === 'phone' ? maskPhone(value) : maskAadhaar(value)) : '')

  return (
    <>
      <input
        className="input"
        placeholder={placeholder || (mask === 'phone' ? '+91 98765 43210' : '1234 5678 9012')}
        value={display}
        required={required}
        inputMode="numeric"
        autoComplete="off"
        maxLength={14}
        onChange={(e) => {
          const raw = unmask(e.target.value)
          const next = mask === 'phone' ? maskPhone(raw) : maskAadhaar(raw)
          setDisplay(next)
          if (onChange) onChange(unmask(next))
        }}
      />
      {name && <input type="hidden" name={name} value={unmask(display)} />}
    </>
  )
}

/* ─── Enter-to-next-field navigation ──────────────────────────────── */

export function EnterNav({ children }: { children: React.ReactNode }) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return
    const t = e.target as HTMLElement
    if (t.tagName !== 'INPUT' && t.tagName !== 'SELECT') return
    const form = t.closest('form')
    if (!form) return
    const fields = Array.from(form.querySelectorAll<HTMLElement>('input, select, textarea')).filter((el) => {
      if (el.hasAttribute('disabled')) return false
      if (el.tagName === 'INPUT') {
        const ty = (el as HTMLInputElement).type
        if (ty === 'button' || ty === 'submit' || ty === 'checkbox' || ty === 'radio' || ty === 'hidden') return false
      }
      return el.offsetParent !== null
    })
    const idx = fields.indexOf(t)
    if (idx === -1 || idx === fields.length - 1) return
    e.preventDefault()
    fields[idx + 1].focus()
  }
  return <div onKeyDown={onKeyDown}>{children}</div>
}

/* ─── Draft autosave for uncontrolled forms ───────────────────────── */

export function useFormDraft(key: string) {
  const save = (form: HTMLFormElement) => {
    try {
      const fd = new FormData(form)
      const obj: Record<string, string> = {}
      fd.forEach((v, k) => {
        if (typeof v === 'string' && v.trim() !== '') obj[k] = v
      })
      localStorage.setItem(key, JSON.stringify(obj))
    } catch {
      /* storage unavailable */
    }
  }
  const apply = (form: HTMLFormElement) => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj as Record<string, string>)) {
          const el = form.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
          if (el && 'value' in el) el.value = v
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
  }
  const clear = () => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
  return { save, apply, clear }
}

/* ─── Step wizard (presentational stepper) ────────────────────────── */

export function Wizard({
  steps, current, onChange, children,
}: {
  steps: { title: string; sub?: string }[]
  current: number
  onChange?: (idx: number) => void
  children?: React.ReactNode
}) {
  const prevCurrentRef = useRef(current)
  useEffect(() => {
    prevCurrentRef.current = current
  }, [current])
  const prevCurrent = prevCurrentRef.current

  return (
    <div className="wizard">
      <ol className="wizard-steps">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo'
          const justCompleted = i < current && i >= prevCurrent
          return (
            <li key={i} className={`wizard-step ${state}`}>
              <button
                type="button"
                className="wizard-node"
                aria-current={state === 'active' ? 'step' : undefined}
                onClick={() => i < current && onChange?.(i)}
                disabled={i > current}
              >
                <span className="wizard-dot">
                  {state === 'done' ? (
                    <AnimatedCheckmark size={14} animate={justCompleted} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="wizard-labels">
                  <b>{s.title}</b>
                  {s.sub && <span>{s.sub}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {children}
    </div>
  )
}