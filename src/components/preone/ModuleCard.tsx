'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { HomeModule } from '@/lib/modules'
import { SEMANTIC_THEME_TOKENS, getModulePastelTokens } from '@/lib/modules'
import { AnimatedModuleIcon } from './AnimatedModuleIcon'

export interface ModuleCardProps {
  module: HomeModule
  className?: string
  isSelected?: boolean
  isDisabled?: boolean
}

/**
 * PreOne ModuleCard — Soft Pastel Module Identity
 *
 * Minimalist Fluent Metro tile layout with refined interactive responses:
 * - Default: Crisp neutral/white surface, subtle neutral border, dark neutral title
 * - Hover / Focus: Soft pastel background, module-specific accent border,
 *   accessible accent title, subtle colored shadow, 2.5px lift, soft icon halo
 * - Active / Touch: Subtle scale compression & deeper pastel tint
 * - Accessible: WCAG AA contrast, keyboard navigation, prefers-reduced-motion
 */
export function ModuleCard({
  module: m,
  className = '',
  isSelected = false,
  isDisabled = false,
}: ModuleCardProps) {
  const theme = SEMANTIC_THEME_TOKENS[m.semanticTheme] || SEMANTIC_THEME_TOKENS.lavender
  const pastel = m.pastelIdentity || getModulePastelTokens(m.key)

  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  return (
    <Link
      href={m.href}
      prefetch={true}
      className={`module-card group ${className}`.trim()}
      aria-label={m.label}
      aria-disabled={isDisabled ? 'true' : undefined}
      data-module={m.key}
      data-selected={isSelected ? 'true' : undefined}
      tabIndex={isDisabled ? -1 : 0}
      draggable={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={
        {
          '--module-bg': pastel.defaultBg || pastel.bg,
          '--module-hover-bg': pastel.hoverBg,
          '--module-accent': pastel.accent,
          '--module-text': pastel.text || pastel.titleText,
          '--module-dark-bg': pastel.darkBg,
          '--module-dark-hover-bg': pastel.darkHoverBg,
          '--module-dark-accent': pastel.darkAccent,
          '--module-dark-text': pastel.darkTitleText,
          '--card-hover-border': pastel.accent,
          '--card-accent-glow': `color-mix(in srgb, ${pastel.accent} 24%, transparent)`,
        } as React.CSSProperties
      }
    >
      {/* Icon Area: Takes ~80% of usable card space */}
      <div className="module-card-icon-area module-card-top">
        <AnimatedModuleIcon
          moduleKey={m.key}
          label={m.label}
          icon={m.icon}
          animation={m.animation}
          theme={theme}
          triggerAnimation={isHovered || isFocused}
        />
      </div>

      {/* Title Area: ~20% at the bottom, cleanly positioned below the icon */}
      <div className="module-card-title-area module-card-body">
        <h3 className="module-card-title">{m.label}</h3>
      </div>

      {/* Subtle Preschool Watermark Motif (Decorative, non-intrusive) */}
      <div className="module-card-watermark" aria-hidden="true">
        <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
          <circle cx="48" cy="48" r="28" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" opacity="0.32" />
          <path
            d="M38 28L39.5 31.5L43 33L39.5 34.5L38 38L36.5 34.5L33 33L36.5 31.5L38 28Z"
            fill="currentColor"
            opacity="0.36"
          />
          <circle cx="26" cy="46" r="2.5" fill="currentColor" opacity="0.25" />
        </svg>
      </div>

      {/* Module-Specific Bottom Accent Line (PRE1-HOME-FINAL-AUDIT-003 - Refined Thin Line) */}
      <span
        className="module-card-accent-line"
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: isHovered || isFocused ? '100%' : '40%',
          height: '2px',
          borderRadius: isHovered || isFocused ? '0 0 20px 20px' : '999px',
          backgroundColor: 'var(--module-current-accent, var(--module-accent, ' + pastel.accent + '))',
          opacity: isHovered || isFocused ? 1 : 0.85,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
          boxShadow: isHovered || isFocused
            ? `0 1px 3px color-mix(in srgb, ${pastel.accent} 35%, transparent)`
            : 'none',
          transition: 'width 250ms cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 250ms ease, opacity 250ms ease',
        }}
        aria-hidden="true"
      />
    </Link>
  )
}
