'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal, ChevronRight } from 'lucide-react'
import {
  type ModuleNavigationItem,
} from './module-navigation.config'

export interface GlobalModuleNavigationProps {
  /** Centralized list of module navigation items */
  items: ModuleNavigationItem[]
  /** Explicitly active item identifier (optional; defaults to auto-matching pathname) */
  activeId?: string
  /** Callback fired when an item is selected (for in-page tab switching) */
  onSelect?: (id: string) => void
  /** Accessible name for the navigation region */
  ariaLabel?: string
  /** Maximum number of icons visible on mobile before collapsing into 'More' menu */
  maxVisibleMobile?: number
  /** Additional custom class names */
  className?: string
  /** Inline styles */
  style?: React.CSSProperties
  /** Visual variant */
  variant?: 'default' | 'compact' | 'pills'
  /** Force tablist ARIA semantics instead of navigation landmark */
  asTablist?: boolean
}

/**
 * PreOne Global Module Navigation System
 *
 * Master navigation component shared across all application modules.
 * Features:
 * - Desktop: Complete horizontal bar with crisp icons, concise labels, and badges.
 * - Mobile: Automatic compact icon-only presentation (labels hidden, centered touch targets).
 * - Overflow: Zero horizontal page overflow; excess items on mobile collapse cleanly into a 'More' menu.
 * - Theme-adaptive: Subtle theme-matching border and restrained glow on active/hover states.
 * - Dual-mode: Supports both Next.js route navigation (<Link>) and in-page state tabs (<button>).
 * - Fully accessible: ARIA landmark/tablist, keyboard focus rings, and accessible names.
 */
export function GlobalModuleNavigation({
  items,
  activeId,
  onSelect,
  ariaLabel = 'Module Navigation',
  maxVisibleMobile = 5,
  className = '',
  style,
  variant = 'default',
  asTablist = false,
}: GlobalModuleNavigationProps) {
  const pathname = usePathname()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLElement>(null)

  // Filter out unauthorized items
  const visibleItems = items.filter((item) => item.permission !== false)

  // Determine active item id
  const currentActiveId =
    activeId ||
    visibleItems.find((item) => {
      if (!item.href) return false
      if (item.matchPrefix) {
        return pathname === item.href || (item.href !== '/app/admissions' && pathname.startsWith(item.href))
      }
      return pathname === item.href
    })?.id ||
    visibleItems[0]?.id

  // Close 'More' dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreMenuOpen(false)
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [moreMenuOpen])

  // Mobile overflow separation:
  // If items > maxVisibleMobile, show first (maxVisibleMobile - 1) on mobile and rest in More dropdown.
  const hasMobileOverflow = visibleItems.length > maxVisibleMobile
  const mobileVisibleCount = hasMobileOverflow ? maxVisibleMobile - 1 : visibleItems.length
  const mobileOverflowItems = hasMobileOverflow ? visibleItems.slice(mobileVisibleCount) : []
  const isOverflowActive = mobileOverflowItems.some((item) => item.id === currentActiveId)

  const isPureTabs = asTablist || Boolean(onSelect)

  const renderBadge = (item: ModuleNavigationItem, isMobile = false) => {
    if (item.badge == null || item.badge === '' || item.badge === 0) return null
    const variant = item.badgeVariant || 'primary'
    const variantCls =
      variant === 'warning'
        ? 'bg-[var(--status-warning-surface)] text-[var(--status-warning-foreground)]'
        : variant === 'danger'
        ? 'bg-[var(--status-danger-surface)] text-[var(--status-danger-foreground)]'
        : variant === 'success'
        ? 'bg-[var(--status-success-surface)] text-[var(--status-success-foreground)]'
        : variant === 'info'
        ? 'bg-[var(--status-info-surface)] text-[var(--status-info-foreground)]'
        : 'bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]'

    if (isMobile) {
      return (
        <span
          className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-xs ${variantCls}`}
          aria-hidden="true"
        >
          {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
        </span>
      )
    }

    return (
      <span
        className={`ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${variantCls}`}
      >
        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
      </span>
    )
  }

  const renderItemContent = (item: ModuleNavigationItem, isActive: boolean) => {
    const rawIcon = item.icon
    let renderedIcon: React.ReactNode = null

    if (rawIcon) {
      if (React.isValidElement(rawIcon)) {
        renderedIcon = rawIcon
      } else if (typeof rawIcon === 'function' || (typeof rawIcon === 'object' && rawIcon !== null)) {
        // Handle React.ComponentType, React.forwardRef (Lucide icons), and custom component functions
        const IconComponent = rawIcon as React.ComponentType<{ size?: number; className?: string }>
        renderedIcon = (
          <IconComponent
            size={15}
            className={`transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
            }`}
          />
        )
      }
    }

    return (
      <>
        {renderedIcon && (
          <span className="relative flex shrink-0 items-center justify-center">
            {renderedIcon}
            {/* Mobile-only badge anchored to icon */}
            <span className="sm:hidden">{renderBadge(item, true)}</span>
          </span>
        )}
        {/* Desktop-only text label (Mandatory: mobile is icon-only) */}
        <span className="hidden sm:inline truncate tracking-tight">{item.label}</span>
        {/* Desktop-only badge */}
        <span className="hidden sm:inline">{renderBadge(item, false)}</span>
      </>
    )
  }

  return (
    <div
      ref={navContainerRef}
      className={`preone-module-nav-container w-full min-w-0 max-w-full ${className}`}
      style={style}
    >
      <nav
        aria-label={ariaLabel}
        role={isPureTabs ? 'tablist' : 'navigation'}
        className={`preone-module-nav group flex items-center justify-between sm:justify-start gap-1 p-1 rounded-2xl bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border-default)] shadow-xs transition-all duration-200 select-none ${
          variant === 'compact' ? 'py-0.5' : ''
        }`}
      >
        {/* ── Main Navigation Items ── */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto sm:overflow-visible scrollbar-none justify-between sm:justify-start min-w-0">
          {visibleItems.map((item, index) => {
            const isActive = item.id === currentActiveId
            const isHiddenOnMobile = hasMobileOverflow && index >= mobileVisibleCount
            const commonClasses = `preone-nav-item group relative flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer outline-none min-h-[38px] sm:min-h-[32px] shrink-0 sm:shrink ${
              isHiddenOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'
            } ${
              isActive
                ? 'preone-nav-item-active bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/40 shadow-xs'
                : 'text-[var(--color-text-muted)] border border-transparent hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]'
            } focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1`

            const accessibleName = item.ariaLabel || item.label

            if (item.href && !onSelect) {
              return (
                <Link
                  key={item.id}
                  ref={isActive ? (activeItemRef as any) : undefined}
                  href={item.href}
                  className={commonClasses}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={accessibleName}
                  title={item.tooltip || item.label}
                >
                  {renderItemContent(item, isActive)}
                </Link>
              )
            }

            return (
              <button
                key={item.id}
                ref={isActive ? (activeItemRef as any) : undefined}
                type="button"
                role={isPureTabs ? 'tab' : undefined}
                aria-selected={isPureTabs ? isActive : undefined}
                aria-label={accessibleName}
                title={item.tooltip || item.label}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  onSelect?.(item.id)
                }}
                className={commonClasses}
              >
                {renderItemContent(item, isActive)}
              </button>
            )
          })}

          {/* ── Mobile 'More' Overflow Button & Popover ── */}
          {hasMobileOverflow && (
            <div ref={moreMenuRef} className="relative sm:hidden shrink-0">
              <button
                type="button"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                className={`preone-nav-item flex items-center justify-center p-2 rounded-xl text-xs font-semibold transition-all duration-150 min-h-[38px] min-w-[38px] border ${
                  isOverflowActive
                    ? 'bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/40'
                    : 'text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-subtle)]'
                }`}
                aria-label="More navigation workspaces"
                aria-expanded={moreMenuOpen}
                aria-haspopup="true"
                title="More workspaces"
              >
                <MoreHorizontal size={16} />
                {isOverflowActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>

              {/* Mobile Overflow Dropdown Menu */}
              {moreMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-default)] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Additional Workspaces
                  </div>
                  {mobileOverflowItems.map((item) => {
                    const isActive = item.id === currentActiveId
                    const IconComponent = item.icon
                    const itemClasses = `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]'
                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]'
                    }`

                    let overflowIconNode: React.ReactNode = null
                    if (IconComponent) {
                      if (React.isValidElement(IconComponent)) {
                        overflowIconNode = IconComponent
                      } else if (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent !== null)) {
                        const Comp = IconComponent as React.ComponentType<{ size?: number; className?: string }>
                        overflowIconNode = <Comp size={14} className={isActive ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-muted)]'} />
                      }
                    }

                    if (item.href && !onSelect) {
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setMoreMenuOpen(false)}
                          className={itemClasses}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {overflowIconNode}
                            <span className="truncate">{item.label}</span>
                          </div>
                          {renderBadge(item, false)}
                        </Link>
                      )
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreMenuOpen(false)
                          item.onClick?.()
                          onSelect?.(item.id)
                        }}
                        className={itemClasses}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {overflowIconNode}
                          <span className="truncate">{item.label}</span>
                        </div>
                        {renderBadge(item, false)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}

export const ModuleNavigation = GlobalModuleNavigation
export type ModuleNavigationProps = GlobalModuleNavigationProps
