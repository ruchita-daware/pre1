import { describe, it, expect } from 'bun:test'
import * as fs from 'fs'

describe('PREONE — Preschool-First Typography Redesign Suite', () => {
  const globalsCss = fs.readFileSync('src/app/globals.css', 'utf-8')
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf-8')
  const tailwind = fs.readFileSync('tailwind.config.ts', 'utf-8')
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))

  describe('1. Primary & Regional Font Architecture', () => {
    it('verifies Nunito is configured as primary typeface across global CSS tokens', () => {
      expect(globalsCss).toContain("--font-primary: 'Nunito'")
      expect(globalsCss).toContain('--font-display: var(--font-primary)')
      expect(globalsCss).toContain('--font-heading: var(--font-primary)')
      expect(globalsCss).toContain('--font-body: var(--font-primary)')
      expect(globalsCss).toContain('--font-sans: var(--font-primary)')
    })

    it('verifies Noto Sans Devanagari is configured for regional languages (Marathi/Hindi)', () => {
      expect(globalsCss).toContain("--font-regional: 'Noto Sans Devanagari'")
      expect(globalsCss).toContain('.font-regional')
      expect(globalsCss).toContain('[lang="mr"]')
      expect(globalsCss).toContain('[lang="hi"]')
    })

    it('verifies system monospace is configured for identifiers without impacting body UI', () => {
      expect(globalsCss).toContain('--font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Consolas", monospace')
      expect(tailwind).toContain("mono: ['var(--font-mono)', 'monospace']")
    })

    it('verifies Tailwind config maps display, heading, body and sans to Nunito', () => {
      expect(tailwind).toContain("display: ['var(--font-display)', 'Nunito', 'sans-serif']")
      expect(tailwind).toContain("heading: ['var(--font-heading)', 'Nunito', 'sans-serif']")
      expect(tailwind).toContain("body: ['var(--font-body)', 'Nunito', 'sans-serif']")
      expect(tailwind).toContain("sans: ['var(--font-body)', 'Nunito', 'sans-serif']")
      expect(tailwind).toContain("regional: ['var(--font-regional)', 'Noto Sans Devanagari', 'sans-serif']")
    })

    it('verifies fontsource packages are installed in package.json', () => {
      expect(packageJson.dependencies['@fontsource/nunito']).toBeDefined()
      expect(packageJson.dependencies['@fontsource/noto-sans-devanagari']).toBeDefined()
    })
  })

  describe('2. Canonical Responsive Typography Scale', () => {
    it('verifies CSS tokens match the preschool typography scale specifications', () => {
      expect(globalsCss).toContain('--text-display: clamp(32px, 3.2vw + 10px, 44px)')
      expect(globalsCss).toContain('--text-h1: clamp(26px, 1.8vw + 12px, 32px)')
      expect(globalsCss).toContain('--text-h2: clamp(20px, 1vw + 14px, 24px)')
      expect(globalsCss).toContain('--text-h3: 20px')
      expect(globalsCss).toContain('--text-h4: 18px')
      expect(globalsCss).toContain('--text-h5: 16px')
      expect(globalsCss).toContain('--text-body-lg: 16px')
      expect(globalsCss).toContain('--text-body: 15px')
      expect(globalsCss).toContain('--text-body-sm: 14px')
      expect(globalsCss).toContain('--text-label: 13px')
      expect(globalsCss).toContain('--text-btn: 14px')
      expect(globalsCss).toContain('--text-caption: 12px')
      expect(globalsCss).toContain('--text-overline: 11px')
      expect(globalsCss).toContain('--text-kpi: clamp(28px, 2.5vw + 16px, 36px)')
    })

    it('verifies line heights are calibrated for readability and preschool warmth', () => {
      expect(globalsCss).toContain('--line-height-heading: 1.3')
      expect(globalsCss).toContain('--line-height-body: 1.6')
      expect(globalsCss).toContain('--line-height-compact: 1.4')
    })

    it('verifies Tailwind fontSize mappings include canonical preschool tokens and t-* classes', () => {
      expect(tailwind).toContain("'type-display': ['clamp(32px, 3.2vw + 10px, 44px)'")
      expect(tailwind).toContain("'page-title': ['clamp(26px, 1.8vw + 12px, 32px)'")
      expect(tailwind).toContain("'section-title': ['clamp(20px, 1vw + 14px, 24px)'")
      expect(tailwind).toContain("'card-title': ['16px'")
      expect(tailwind).toContain("'body-copy': ['15px'")
      expect(tailwind).toContain("'body-copy-sm': ['14px'")
      expect(tailwind).toContain("'field-label': ['13px'")
      expect(tailwind).toContain("'meta-copy': ['12px'")

      expect(tailwind).toContain("'t-display': ['clamp(32px, 3.2vw + 10px, 44px)'")
      expect(tailwind).toContain("'t-h1': ['clamp(26px, 1.8vw + 12px, 32px)'")
      expect(tailwind).toContain("'t-h2': ['clamp(20px, 1vw + 14px, 24px)'")
      expect(tailwind).toContain("'t-h3': ['20px'")
      expect(tailwind).toContain("'t-h4': ['18px'")
      expect(tailwind).toContain("'t-h5': ['16px'")
      expect(tailwind).toContain("'t-body-lg': ['16px'")
      expect(tailwind).toContain("'t-body': ['15px'")
      expect(tailwind).toContain("'t-body-sm': ['14px'")
      expect(tailwind).toContain("'t-caption': ['12px'")
      expect(tailwind).toContain("'t-label': ['13px'")
      expect(tailwind).toContain("'t-btn': ['14px'")
      expect(tailwind).toContain("'t-overline': ['11px'")
      expect(tailwind).toContain("'t-kpi': ['clamp(28px, 2.5vw + 16px, 36px)'")
    })

    it('verifies font weights 400, 500, 600, 700, 800 are registered in Tailwind config', () => {
      expect(tailwind).toContain("regular: '400'")
      expect(tailwind).toContain("medium: '500'")
      expect(tailwind).toContain("semibold: '600'")
      expect(tailwind).toContain("bold: '700'")
      expect(tailwind).toContain("extrabold: '800'")
    })
  })

  describe('3. Critical Font Preloads & Performance', () => {
    it('verifies critical Nunito Latin and Noto Sans Devanagari woff2 fonts are preloaded in layout.tsx', () => {
      expect(layout).toContain('/fonts/nunito-latin-400-normal.woff2')
      expect(layout).toContain('/fonts/nunito-latin-600-normal.woff2')
      expect(layout).toContain('/fonts/nunito-latin-700-normal.woff2')
      expect(layout).toContain('/fonts/noto-sans-devanagari-devanagari-400-normal.woff2')
      expect(layout).toContain('/fonts/noto-sans-devanagari-devanagari-600-normal.woff2')
    })

    it('verifies font files physically exist in public/fonts directory', () => {
      expect(fs.existsSync('public/fonts/nunito-latin-400-normal.woff2')).toBe(true)
      expect(fs.existsSync('public/fonts/nunito-latin-600-normal.woff2')).toBe(true)
      expect(fs.existsSync('public/fonts/nunito-latin-700-normal.woff2')).toBe(true)
      expect(fs.existsSync('public/fonts/noto-sans-devanagari-devanagari-400-normal.woff2')).toBe(true)
      expect(fs.existsSync('public/fonts/noto-sans-devanagari-devanagari-600-normal.woff2')).toBe(true)
    })

    it('verifies @font-face declarations use font-display: swap for instant rendering', () => {
      expect(globalsCss).toContain("font-family: 'Nunito'")
      expect(globalsCss).toContain("font-family: 'Noto Sans Devanagari'")
      expect(globalsCss).toContain('font-display: swap')
    })
  })

  describe('4. Regional Language & Devanagari Integrity', () => {
    it('ensures Devanagari does not inherit cramped English tracking and has proper line clearance', () => {
      expect(globalsCss).toContain('letter-spacing: normal !important; /* Preserves native Devanagari script spacing */')
      expect(globalsCss).toContain('line-height: 1.55; /* Clearance for matras, rasva, dirgha and conjuncts */')
    })
  })

  describe('5. Data & Financial Number Alignment', () => {
    it('verifies tabular numerals are enabled for fees, attendance, counts and timestamps', () => {
      expect(globalsCss).toContain('--font-variant-data: tabular-nums;')
      expect(globalsCss).toContain('.tabular-nums,')
      expect(globalsCss).toContain('.numeric,')
      expect(globalsCss).toContain('.amount,')
      expect(globalsCss).toContain('.currency,')
    })
  })
})
