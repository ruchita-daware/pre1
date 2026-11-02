'use client'

import React, { useState } from 'react'
import type { SemanticThemeTokens } from '@/lib/modules'

export interface AnimatedModuleIconProps {
  moduleKey: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>
  animation?: string
  theme: SemanticThemeTokens
  triggerAnimation?: boolean
  onAnimationEnd?: () => void
}

/**
 * PreOne — High-Performance Apple/Linear Style Module Icon
 *
 * Renders crisp, compact, hardware-accelerated 3D illustrations with zero JS overhead.
 * Falls back to an Apple squircle app icon badge when artwork is unavailable.
 * Guaranteed zero overlap.
 */
export function AnimatedModuleIcon({
  moduleKey,
  label,
  icon: FallbackIcon,
  animation,
  theme,
  triggerAnimation = false,
  onAnimationEnd,
}: AnimatedModuleIconProps) {
  const [imgError, setImgError] = useState(false)

  // Direct, instant, optimized WebP artwork asset
  const webpSrc = animation ? animation.replace(/\.json$/, '.webp') : null
  const hasValidArtwork = Boolean(webpSrc && !imgError)

  return (
    <span
      className={`module-card-icon ${hasValidArtwork ? 'has-lottie' : 'is-fallback'}`}
      style={{
        background: 'transparent',
        border: 'none',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasValidArtwork ? (
        /* 1. Crisp 3D Preschool Artwork — Proportional, Compact, Zero Overlap */
        <img
          src={webpSrc!}
          alt={label}
          loading="eager"
          decoding="async"
          draggable={false}
          onError={() => setImgError(true)}
          className="pointer-events-none select-none transition-transform duration-200"
          style={{
            maxWidth: '54px',
            maxHeight: '54px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '14px',
            transform: triggerAnimation ? 'scale(1.08) translateY(-1px)' : 'scale(1)',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.22s ease',
            filter: triggerAnimation
              ? 'drop-shadow(0 4px 10px color-mix(in srgb, var(--module-accent, #7c3aed) 25%, rgba(0, 0, 0, 0.1)))'
              : 'drop-shadow(0 3px 8px rgba(0, 0, 0, 0.08))',
          }}
        />
      ) : (
        /* 2. Apple Squircle App Icon Badge — Elegant, Tactile fallback */
        <span
          className="module-card-squircle-badge"
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: `linear-gradient(135deg, var(--module-bg, ${theme.iconBg}), color-mix(in srgb, var(--module-accent, ${theme.iconColor}) 14%, #ffffff))`,
            border: `1px solid color-mix(in srgb, var(--module-accent, ${theme.iconBorder}) 24%, transparent)`,
            color: 'var(--module-accent, inherit)',
            boxShadow: `0 4px 12px -2px color-mix(in srgb, var(--module-accent, ${theme.iconColor}) 20%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: triggerAnimation ? 'scale(1.06) translateY(-1px)' : 'scale(1)',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease',
          }}
        >
          <FallbackIcon size={24} strokeWidth={2.2} />
        </span>
      )}
    </span>
  )
}
