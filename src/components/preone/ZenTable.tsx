'use client'

import React, { useId, useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Phone, MessageSquare, Edit3, Eye, Check } from 'lucide-react'
import { StatusPill, SemanticStatusVariant } from './ui'
import { EmptyState, EmptyStateIllustration } from './EmptyState'

// ── Deterministic Pastel Palette for Avatar Backgrounds ─────────────────────
export interface PastelColor {
  bg: string
  text: string
  border: string
}

export const ZEN_PASTEL_PALETTE: PastelColor[] = [
  { bg: 'var(--status-info-surface, #EEF2FF)', text: 'var(--status-info-foreground, #4338CA)', border: 'var(--status-info-border, rgba(199, 210, 254, 0.70))' }, // Indigo
  { bg: 'var(--status-success-surface, #ECFDF5)', text: 'var(--status-success-foreground, #065F46)', border: 'var(--status-success-border, rgba(167, 243, 208, 0.70))' }, // Emerald
  { bg: 'var(--color-brand-surface, #F5F3FF)', text: 'var(--color-brand-primary, #5B21B6)', border: 'var(--color-brand-border, rgba(221, 214, 254, 0.70))' }, // Violet
  { bg: 'var(--status-danger-surface, #FFF1F2)', text: 'var(--status-danger-foreground, #9F1239)', border: 'var(--status-danger-border, rgba(254, 205, 211, 0.70))' }, // Rose
  { bg: 'var(--status-warning-surface, #FFFBEB)', text: 'var(--status-warning-foreground, #92400E)', border: 'var(--status-warning-border, rgba(253, 230, 138, 0.70))' }, // Amber
  { bg: 'var(--status-info-surface, #EFF6FF)', text: 'var(--status-info-foreground, #1E40AF)', border: 'var(--status-info-border, rgba(191, 219, 254, 0.70))' }, // Sky
  { bg: 'var(--status-success-surface, #F0FDFA)', text: 'var(--status-success-foreground, #115E59)', border: 'var(--status-success-border, rgba(153, 246, 228, 0.70))' }, // Teal
  { bg: 'var(--color-surface-subtle, #F8FAFC)', text: 'var(--color-text-primary, #334155)', border: 'var(--color-border-default, rgba(226, 232, 240, 0.80))' }, // Slate
]

/**
 * Deterministic hash function: maps any string seed (e.g. student ID or name)
 * to a consistent pastel avatar color token without DB storage.
 */
export function getDeterministicPastel(seed?: string | null): PastelColor {
  if (!seed || typeof seed !== 'string') return ZEN_PASTEL_PALETTE[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return ZEN_PASTEL_PALETTE[hash % ZEN_PASTEL_PALETTE.length]
}

/** Extract 1-2 uppercase initials from a human name */
export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── 1. Student Identity Chip ────────────────────────────────────────────────
export interface StudentIdentityChipProps {
  id?: string
  name: string
  photoUrl?: string | null
  admissionNo?: string | null
  program?: string | null
  classroom?: string | null
  division?: string | null
  subtext?: string | null
  size?: 'sm' | 'md'
  className?: string
  onClick?: () => void
}

export function StudentIdentityChip({
  id,
  name,
  photoUrl,
  admissionNo,
  program,
  classroom,
  division,
  subtext,
  size = 'md',
  className = '',
  onClick,
}: StudentIdentityChipProps) {
  const [imgError, setImgError] = useState(false)
  const pastel = getDeterministicPastel(id || admissionNo || name)
  const avatarInitials = getInitials(name)
  const avatarSize = size === 'sm' ? 30 : 34

  // Derive secondary context: e.g. "Nursery · Starfish Division" or "Playgroup (PG-A)"
  const contextParts: string[] = []
  if (classroom) contextParts.push(classroom)
  if (division && !classroom?.includes(division)) contextParts.push(division)
  if (!classroom && program) contextParts.push(program)
  if (subtext) contextParts.push(subtext)
  const secondaryContext = contextParts.join(' · ')

  return (
    <div
      className={`zen-identity-chip group flex items-center gap-3 min-w-0 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      {/* 32–36px Avatar (Photo or Deterministic Pastel Initials) */}
      <div
        className="shrink-0 flex items-center justify-center font-bold tracking-tight overflow-hidden rounded-full shadow-2xs transition-transform duration-150 group-hover:scale-105"
        style={{
          width: avatarSize,
          height: avatarSize,
          backgroundColor: pastel.bg,
          color: pastel.text,
          border: `1px solid ${pastel.border}`,
          fontSize: size === 'sm' ? '11px' : '12px',
        }}
        aria-hidden="true"
      >
        {photoUrl && !imgError ? (
          <img
            src={photoUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover block"
          />
        ) : (
          <span>{avatarInitials}</span>
        )}
      </div>

      {/* Primary Name + Subtext Hierarchy */}
      <div className="flex flex-col min-w-0 leading-snug">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="truncate font-semibold text-[var(--color-text-primary)] group-hover:text-primary transition-colors"
            style={{
              fontFamily: 'var(--font-nunito), inherit',
              fontSize: size === 'sm' ? '13px' : '14px',
              letterSpacing: '-0.01em',
            }}
            title={name}
          >
            {name}
          </span>
          {admissionNo && (
            <span
              className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border-default)]"
              title={`Admission No: ${admissionNo}`}
            >
              {admissionNo}
            </span>
          )}
        </div>

        {secondaryContext ? (
          <span
            className="truncate text-[11.5px] text-[var(--color-text-muted)] mt-0.5"
            style={{ fontFamily: 'var(--font-nunito), inherit' }}
            title={secondaryContext}
          >
            {secondaryContext}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ── 2. Family / Parent Identity Chip ────────────────────────────────────────
export interface FamilyIdentityChipProps {
  id?: string
  name: string
  relationship?: string | null
  phone?: string | null
  email?: string | null
  photoUrl?: string | null
  isPrimary?: boolean
  className?: string
  onClick?: () => void
}

export function FamilyIdentityChip({
  id,
  name,
  relationship,
  phone,
  email,
  photoUrl,
  isPrimary,
  className = '',
  onClick,
}: FamilyIdentityChipProps) {
  const [imgError, setImgError] = useState(false)
  const pastel = getDeterministicPastel(id || phone || name)
  const initials = getInitials(name)

  // Context: e.g. "Mother · Primary Guardian"
  const relParts: string[] = []
  if (relationship) relParts.push(relationship)
  if (isPrimary && relationship?.toLowerCase() !== 'primary guardian') {
    relParts.push('Primary Guardian')
  }
  const relContext = relParts.join(' · ')

  return (
    <div
      className={`zen-identity-chip group flex items-center gap-3 min-w-0 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      <div
        className="shrink-0 flex items-center justify-center font-bold tracking-tight overflow-hidden rounded-full shadow-2xs"
        style={{
          width: 32,
          height: 32,
          backgroundColor: pastel.bg,
          color: pastel.text,
          border: `1px solid ${pastel.border}`,
          fontSize: '11.5px',
        }}
        aria-hidden="true"
      >
        {photoUrl && !imgError ? (
          <img
            src={photoUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover block"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="flex flex-col min-w-0 leading-snug">
        <span
          className="truncate font-semibold text-[var(--color-text-primary)] group-hover:text-primary transition-colors"
          style={{
            fontFamily: 'var(--font-nunito), inherit',
            fontSize: '13.5px',
          }}
          title={name}
        >
          {name}
        </span>
        <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-muted)] mt-0.5">
          {relContext && <span className="truncate">{relContext}</span>}
          {relContext && phone && <span>·</span>}
          {phone && <span className="font-mono text-[var(--color-text-muted)] text-[11px]">{phone}</span>}
        </div>
      </div>
    </div>
  )
}

// Backward compatibility alias
export const ParentIdentityChip = FamilyIdentityChip

// ── 3. Quick Row Actions (Desktop Hover Reveal & Touch Friendly) ────────────
export interface QuickActionItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  danger?: boolean
  disabled?: boolean
  primary?: boolean
  title?: string
}

export interface QuickRowActionsProps {
  actions: QuickActionItem[]
  maxVisible?: number
  className?: string
}

export function QuickRowActions({
  actions,
  maxVisible = 2,
  className = '',
}: QuickRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const visibleActions = actions.slice(0, maxVisible)
  const overflowActions = actions.slice(maxVisible)

  return (
    <div
      className={`zen-quick-actions flex items-center justify-end gap-1.5 ${className}`.trim()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1–2 Primary Contextual Actions */}
      {visibleActions.map((action, i) => (
        <button
          key={i}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={`zen-action-btn flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-surface-subtle)] transition-colors ${
            action.danger ? 'hover:text-[var(--status-danger-foreground)] hover:bg-[var(--status-danger-surface)]' : ''
          } ${action.disabled ? 'opacity-40 pointer-events-none' : ''}`}
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            minHeight: 32,
          }}
          title={action.title || action.label}
          aria-label={action.label}
        >
          {action.icon || <Eye size={15} />}
        </button>
      ))}

      {/* Overflow ••• Menu for Additional Actions */}
      {overflowActions.length > 0 && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="zen-action-btn flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
            style={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}
            title="More actions"
            aria-label="More actions"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-default)] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              role="menu"
            >
              {overflowActions.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={act.disabled}
                  onClick={() => {
                    setMenuOpen(false)
                    act.onClick?.()
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--color-surface-subtle)] transition-colors ${
                    act.danger ? 'text-[var(--status-danger-foreground)] hover:text-[var(--status-danger-foreground)]' : 'text-[var(--color-text-primary)]'
                  } ${act.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  role="menuitem"
                >
                  {act.icon && <span className="shrink-0 text-[var(--color-text-muted)]">{act.icon}</span>}
                  <span className="truncate">{act.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 4. Composable Zen Table Architecture ────────────────────────────────────

export interface ZenTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string
}

export function ZenTable({
  children,
  className = '',
  containerClassName = '',
  ...rest
}: ZenTableProps) {
  return (
    <div className={`zen-table-wrap w-full overflow-x-auto rounded-2xl shadow-xs ${containerClassName}`.trim()}>
      <table className={`zen-table w-full text-left border-collapse ${className}`.trim()} {...rest}>
        {children}
      </table>
    </div>
  )
}

export function ZenTableHeader({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`zen-thead table-frosted-header ${className}`.trim()}
      {...rest}
    >
      {children}
    </thead>
  )
}

export interface ZenTableHeadCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
}

export function ZenTableHeadCell({
  children,
  align = 'left',
  className = '',
  style,
  ...rest
}: ZenTableHeadCellProps) {
  return (
    <th
      className={`zen-th micro-label px-4 py-3 select-none whitespace-nowrap ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`.trim()}
      style={{
        ...style,
      }}
      {...rest}
    >
      {children}
    </th>
  )
}

export interface ZenTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
  clickable?: boolean
}

export function ZenTableRow({
  children,
  selected,
  clickable,
  className = '',
  ...rest
}: ZenTableRowProps) {
  return (
    <tr
      className={`zen-tr table-frosted-row group ${
        selected ? 'selected' : ''
      } ${clickable ? 'clickable cursor-pointer' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </tr>
  )
}

export interface ZenTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
}

export function ZenTableCell({
  children,
  align = 'left',
  className = '',
  style,
  ...rest
}: ZenTableCellProps) {
  return (
    <td
      className={`zen-td data-copy px-4 py-3.5 align-middle text-[var(--color-text-primary)] text-[13.5px] first:rounded-l-lg last:rounded-r-lg ${
        align === 'right' ? 'text-right tabular-nums data-numeric' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`.trim()}
      style={{
        fontFamily: 'var(--font-body), Nunito, sans-serif',
        minHeight: '56px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </td>
  )
}

// ── 5. Skeleton Row Loader (Matches 56px Operational Rows) ───────────────────
export function ZenTableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="w-full flex flex-col divide-y divide-[var(--color-border-default)]">
      {[...Array(rows)].map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-4 h-14 animate-pulse bg-[var(--color-surface)]"
          style={{ minHeight: '56px' }}
        >
          {/* Avatar representation in first column */}
          <div className="w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] shrink-0" />
          <div className="w-36 h-3.5 rounded bg-[var(--color-surface-subtle)] shrink-0" />
          {[...Array(Math.max(1, columns - 2))].map((_, c) => (
            <div key={c} className="flex-1 h-3 rounded bg-[var(--color-surface-subtle)]" />
          ))}
          {/* Action representation */}
          <div className="w-16 h-3 rounded bg-[var(--color-surface-subtle)] shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── 6. Clean Table Empty State ───────────────────────────────────────────────
export function ZenTableEmpty({
  icon,
  illustration = 'filter',
  title = 'No records found',
  message = 'No data currently matches your selected filters or search terms.',
  action,
}: {
  icon?: React.ReactNode
  illustration?: EmptyStateIllustration | React.ReactNode
  title?: string
  message?: string
  action?: React.ReactNode
}) {
  return (
    <div className="w-full py-10 px-6 flex flex-col items-center justify-center text-center">
      <EmptyState
        compact
        illustration={icon ? icon : illustration}
        title={title}
        description={message}
        action={action}
      />
    </div>
  )
}
