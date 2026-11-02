import { describe, it, expect } from 'bun:test'

/**
 * PreOne Global Design Token System v1.0
 * Comprehensive Token Integrity & Component Consumption Test Suite
 */

describe('PreOne Global Design Token System v1.0 Integrity', () => {
  it('verifies canonical design tokens in globals.css :root baseline', async () => {
    const css = await Bun.file('src/app/globals.css').text()

    // 1. Brand ramp with #7C3AED anchor
    expect(css).toContain('--brand-50: #F5F3FF;')
    expect(css).toContain('--brand-100: #EDE9FE;')
    expect(css).toContain('--brand-200: #DDD6FE;')
    expect(css).toContain('--brand-300: #C4B5FD;')
    expect(css).toContain('--brand-400: #A78BFA;')
    expect(css).toContain('--brand-500: #8B5CF6;')
    expect(css).toContain('--brand-600: #7C3AED;')
    expect(css).toContain('--brand-700: #6D28D9;')
    expect(css).toContain('--brand-800: #5B21B6;')
    expect(css).toContain('--brand-900: #4C1D95;')

    // 2. Light surfaces & Text hierarchy
    expect(css).toContain('--bg: #F7F8FC;')
    expect(css).toContain('--surface: rgba(255, 255, 255, 0.82);')
    expect(css).toContain('--surface-solid: #FFFFFF;')
    expect(css).toContain('--surface-2: #F8FAFC;')
    expect(css).toContain('--border: rgba(226, 232, 240, 0.9);')
    expect(css).toContain('--border-strong: #CBD5E1;')

    expect(css).toContain('--text-1: #1E293B;')
    expect(css).toContain('--text-2: #475569;')
    expect(css).toContain('--text-3: #64748B;')

    // 3. Violet-tinted elevation
    expect(css).toContain('--shadow-1:')
    expect(css).toContain('rgba(124, 58, 237, 0.14)')
    expect(css).toContain('--shadow-2:')
    expect(css).toContain('rgba(124, 58, 237, 0.20)')
    expect(css).toContain('--shadow-3:')

    // 4. Motion
    expect(css).toContain('--ease-out: cubic-bezier(0.22, 1, 0.36, 1);')
    expect(css).toContain('--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);')
    expect(css).toContain('--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);')
    expect(css).toContain('--dur-1: 150ms;')
    expect(css).toContain('--dur-2: 250ms;')
    expect(css).toContain('--dur-3: 420ms;')

    // 5. Canonical Radii Scale (PRE1-FMDS-BORDER-RADIUS-001)
    expect(css).toContain('--r-xs: 4px;')
    expect(css).toContain('--r-sm: 8px;')
    expect(css).toContain('--r-md: 12px;')
    expect(css).toContain('--r-lg: 16px;')
    expect(css).toContain('--r-xl: 24px;')
    expect(css).toContain('--r-card: 20px;')
    expect(css).toContain('--r-pill: 999px;')
    expect(css).toContain('--r-full: 999px;')

    // 6. Semantic Component Tokens
    expect(css).toContain('--button-primary-bg: var(--brand-600);')
    expect(css).toContain('--button-primary-text: #FFFFFF;')
    expect(css).toContain('--input-bg: var(--surface-solid);')
    expect(css).toContain('--input-border: var(--border-strong);')
    expect(css).toContain('--input-text: var(--text-1);')
    expect(css).toContain('--focus-ring-color: var(--brand-400);')
    expect(css).toContain('--card-bg: var(--surface);')
    expect(css).toContain('--card-border: var(--border);')
    expect(css).toContain('--card-shadow: var(--shadow-1);')
    expect(css).toContain('--menu-bg: var(--surface-solid);')
    expect(css).toContain('--menu-border: var(--border);')
    expect(css).toContain('--menu-shadow: var(--shadow-2);')
  })

  it('verifies dark theme overrides for canonical design tokens', async () => {
    const css = await Bun.file('src/app/globals.css').text()

    // Dark overrides (Midnight Pearl Approved Baseline)
    expect(css).toContain('--bg: #131626;')
    expect(css).toContain('--surface: #20263A;')
    expect(css).toContain('--surface-solid: #20263A;')
    expect(css).toContain('--surface-2: #272E45;')
    expect(css).toContain('--border: #343D56;')
    expect(css).toContain('--border-strong: #46516D;')

    expect(css).toContain('--text-1: #F4F3FF;')
    expect(css).toContain('--text-2: #C0C6D8;')
    expect(css).toContain('--text-3: #969FB8;')

    // Dark shadow-2 and shadow-3
    expect(css).toContain('rgba(182, 154, 255, 0.20)')
  })

  it('verifies Tailwind configuration exposes the canonical design tokens', async () => {
    const config = await Bun.file('tailwind.config.ts').text()

    expect(config).toContain("'50': 'var(--brand-50)'")
    expect(config).toContain("'600': 'var(--brand-600)'")
    expect(config).toContain("solid: 'var(--surface-solid)'")
    expect(config).toContain("'1': 'var(--text-1)'")
    expect(config).toContain("'r-xs': 'var(--r-xs)'")
    expect(config).toContain("'r-sm': 'var(--r-sm)'")
    expect(config).toContain("'r-md': 'var(--r-md)'")
    expect(config).toContain("'r-lg': 'var(--r-lg)'")
    expect(config).toContain("'r-xl': 'var(--r-xl)'")
    expect(config).toContain("'r-card': 'var(--r-card)'")
    expect(config).toContain("'r-pill': 'var(--r-pill)'")
    expect(config).toContain("'r-full': 'var(--r-full)'")
    expect(config).toContain("'1': 'var(--shadow-1)'")
    expect(config).toContain("'2': 'var(--shadow-2)'")
    expect(config).toContain("'3': 'var(--shadow-3)'")
  })

  it('verifies shared components consume the canonical elevation tokens', async () => {
    const card = await Bun.file('src/components/ui/card.tsx').text()
    expect(card).toContain('[box-shadow:var(--shadow-1)]')
    expect(card).toContain('hover:[box-shadow:var(--shadow-2)]')
    expect(card).toContain('[box-shadow:var(--shadow-3)]')

    const dropdown = await Bun.file('src/components/ui/dropdown-menu.tsx').text()
    expect(dropdown).toContain('[box-shadow:var(--shadow-2)]')

    const dialog = await Bun.file('src/components/ui/dialog.tsx').text()
    expect(dialog).toContain('[box-shadow:var(--shadow-3)]')

    const actionMenu = await Bun.file('src/components/ui/action-menu.tsx').text()
    expect(actionMenu).toContain('[box-shadow:var(--shadow-2)]')

    const kpiCard = await Bun.file('src/components/preone/KpiMetricCard.tsx').text()
    expect(kpiCard).toContain('preone-kpi-card')
    const css = await Bun.file('src/app/globals.css').text()
    expect(css).toContain('.preone-kpi-card')
  })

  it('verifies BUG-013 + BUG-009: 404 NotFound page consumes semantic tokens (bg-background, bg-card, text-foreground) and defines --primary-foreground', async () => {
    const notFound = await Bun.file('src/app/not-found.tsx').text()

    // Semantic tokens used
    expect(notFound).toContain('bg-background')
    expect(notFound).toContain('text-foreground')
    expect(notFound).toContain('bg-card')
    expect(notFound).toContain('border-border')
    expect(notFound).toContain('text-muted-foreground')
    expect(notFound).toContain('bg-primary')
    expect(notFound).toContain('text-primary-foreground')

    // No hardcoded light-only slate or white tokens
    expect(notFound).not.toContain('bg-slate-50')
    expect(notFound).not.toContain('bg-white')
    expect(notFound).not.toContain('border-slate-200')
    expect(notFound).not.toContain('text-slate-900')
    expect(notFound).not.toContain('text-slate-600')

    // CSS bridge defines --primary-foreground and --card
    const css = await Bun.file('src/app/globals.css').text()
    expect(css).toContain('--primary-foreground:')
    expect(css).toContain('--card:')

    // Tailwind exposes card and primary-foreground
    const tailwind = await Bun.file('tailwind.config.ts').text()
    expect(tailwind).toContain("foreground: 'var(--primary-foreground)'")
    expect(tailwind).toContain("DEFAULT: 'var(--card, var(--surface))'")
  })
})
