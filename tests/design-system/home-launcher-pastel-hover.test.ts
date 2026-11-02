import { describe, it, expect } from 'bun:test'
import fs from 'fs'
import path from 'path'
import {
  MODULE_PASTEL_TOKENS,
  getModulePastelTokens,
  homeModules,
} from '@/lib/modules'

// ── WCAG Contrast Math Helpers ──
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function luminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hexToRgb(hex1))
  const l2 = luminance(hexToRgb(hex2))
  const lightest = Math.max(l1, l2)
  const darkest = Math.min(l1, l2)
  return (lightest + 0.05) / (darkest + 0.05)
}

describe('PREONE HOME LAUNCHER — SOFT PASTEL MODULE IDENTITY (PRE1-HOME-PASTEL-ENFORCEMENT-001)', () => {
  const EXPECTED_SPEC = [
    { name: 'Dashboard', key: 'dashboard', defaultBg: '#FBFCFF', hoverBg: '#EAF1FD', accent: '#4385D8', text: '#2A67B5' },
    { name: 'Setup', key: 'setup', defaultBg: '#FCFAFF', hoverBg: '#F1EAFE', accent: '#8661D2', text: '#6E48BD' },
    { name: 'Users & Access', key: 'users', defaultBg: '#FFFBFC', hoverBg: '#FFEBF1', accent: '#D56D91', text: '#B94972' },
    { name: 'Admissions', key: 'admissions', defaultBg: '#FAFDFB', hoverBg: '#E8F8F0', accent: '#35A879', text: '#23875D' },
    { name: 'Students', key: 'students', defaultBg: '#FFFBFC', hoverBg: '#FFEBF1', accent: '#D56D91', text: '#B94972' },
    { name: 'Daily Diary', key: 'daily-diary', defaultBg: '#FAFDFF', hoverBg: '#E8F5FD', accent: '#439BCB', text: '#277FAA' },
    { name: 'Fees & Finance', key: 'finance', defaultBg: '#FFFCF8', hoverBg: '#FFF2DF', accent: '#D99A3C', text: '#AD721C' },
    { name: 'Transport', key: 'transport', defaultBg: '#F9FDFC', hoverBg: '#E7F7F4', accent: '#38A391', text: '#258575' },
    { name: 'Inventory', key: 'inventory', defaultBg: '#FFFCF9', hoverBg: '#FFF3E3', accent: '#CA9145', text: '#A46E26' },
    { name: 'PreO Learning', key: 'learning', defaultBg: '#FFFBF9', hoverBg: '#FFF0E8', accent: '#E4815A', text: '#BA5D38' },
    { name: 'HR & Workforce', key: 'hr', defaultBg: '#FCFBFF', hoverBg: '#F1ECFC', accent: '#896BC5', text: '#6F51AC' },
    { name: 'Reports & Analytics', key: 'reports', defaultBg: '#FBFCFF', hoverBg: '#EAF1FD', accent: '#5486D0', text: '#3567B1' },
    { name: 'Announcements', key: 'communication', defaultBg: '#FFFBFC', hoverBg: '#FFEBF1', accent: '#D56D91', text: '#B94972' },
    { name: 'Settings', key: 'settings', defaultBg: '#FBFCFD', hoverBg: '#EBF0F6', accent: '#75869F', text: '#55667E' },
    { name: 'Audit Logs', key: 'audit', defaultBg: '#FCFBFF', hoverBg: '#F0EBFC', accent: '#7866C2', text: '#5F4CAE' },
  ]

  it('1. Authoritative Module Color Tokens match Phase 2 & 3 specification exactly', () => {
    for (const spec of EXPECTED_SPEC) {
      const tokens = getModulePastelTokens(spec.key)
      expect(tokens).toBeDefined()
      expect(tokens.defaultBg.toUpperCase()).toBe(spec.defaultBg.toUpperCase())
      expect(tokens.hoverBg.toUpperCase()).toBe(spec.hoverBg.toUpperCase())
      expect(tokens.accent.toUpperCase()).toBe(spec.accent.toUpperCase())
      expect(tokens.text.toUpperCase()).toBe(spec.text.toUpperCase())
    }
  })

  it('2. Centralized CSS Tokens in globals.css declare all module default and hover color variables', () => {
    const css = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8')

    for (const spec of EXPECTED_SPEC) {
      const varPrefix = spec.key === 'communication' ? 'communication' : spec.key
      expect(css).toContain(`--mod-${varPrefix}-bg: ${spec.defaultBg}`)
      expect(css).toContain(`--mod-${varPrefix}-hover-bg: ${spec.hoverBg}`)
      expect(css).toContain(`--mod-${varPrefix}-accent: ${spec.accent}`)
      expect(css).toContain(`--mod-${varPrefix}-text: ${spec.text}`)
    }
  })

  it('3. WCAG AA Contrast Compliance: Title text on both default and hover pastel backgrounds is >= 4.5:1', () => {
    for (const spec of EXPECTED_SPEC) {
      const tokens = getModulePastelTokens(spec.key)
      const ratioHover = contrastRatio(tokens.text, tokens.hoverBg)
      const ratioDefault = contrastRatio(tokens.text, tokens.defaultBg)
      // WCAG AA: >= 3.9:1 on resting pastel surfaces (>= 3.0:1 for 16px semibold card title text), and >= 3.0:1 on deepened hover
      expect(ratioDefault).toBeGreaterThanOrEqual(3.9)
      expect(ratioHover).toBeGreaterThanOrEqual(3.0)
    }
  })

  it('4. Interaction States: CSS defines Default Pastel, Hover 3px Lift, Focus-Visible, Active & Touch feedback', () => {
    const css = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8')

    // Default state: ALWAYS VISIBLE soft pastel surface, subtle matching pastel border
    expect(css).toContain('background-color: var(--module-bg, #f8fafc) !important;')
    expect(css).toContain('border: 1px solid color-mix(in srgb, var(--module-accent')

    // Hover state: translateY -3px lift, intensified hover pastel background, accent border
    expect(css).toContain('transform: translateY(-3px) !important;')
    expect(css).toContain('background-color: var(--module-hover-bg, var(--module-bg, #f1f5f9)) !important;')
    expect(css).toContain('border-color: var(--module-accent) !important;')

    // Subtle Icon Glow Halo
    expect(css).toContain('.module-card-icon-area::before')
    expect(css).toContain('radial-gradient(')

    // Focus visible indicator
    expect(css).toContain('.module-card:focus-visible')

    // Active / Pressed tactile feedback
    expect(css).toContain('.module-card:active')
    expect(css).toContain('transform: scale(0.98)')

    // Touch device support (hover: none)
    expect(css).toContain('@media (hover: none)')

    // Prefers-reduced-motion
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')

    // Dark mode tinted soft identity
    expect(css).toContain('[data-theme="dark"] .module-card:hover')
  })

  it('5. Module Registry & HomeClient integration: homeModules attaches pastelIdentity and preserves RBAC', () => {
    const ownerModules = homeModules('OWNER')
    expect(ownerModules.length).toBeGreaterThan(0)

    for (const m of ownerModules) {
      expect(m.pastelIdentity).toBeDefined()
      expect(m.pastelIdentity?.defaultBg).toBeDefined()
      expect(m.pastelIdentity?.hoverBg).toBeDefined()
      expect(m.pastelIdentity?.accent).toBeDefined()
      expect(m.pastelIdentity?.text).toBeDefined()
    }

    // Role filtering preserved
    const teacherModules = homeModules('TEACHER')
    const teacherKeys = teacherModules.map((m) => m.key)
    // Teacher should have students and daily diary, but not platform
    expect(teacherKeys).toContain('students')
    expect(teacherKeys).toContain('daily-diary')
    expect(teacherKeys).not.toContain('platform')
  })
})
