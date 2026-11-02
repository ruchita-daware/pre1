import { describe, it, expect } from 'bun:test'
import * as fs from 'fs'

describe('PREONE — Phase 2: Shared Component Token Adoption & Standardization', () => {
  const globalsCss = fs.readFileSync('src/app/globals.css', 'utf-8')
  const cardComponent = fs.readFileSync('src/components/ui/card.tsx', 'utf-8')
  const zenTableComponent = fs.readFileSync('src/components/preone/ZenTable.tsx', 'utf-8')
  const dialogComponent = fs.readFileSync('src/components/ui/dialog.tsx', 'utf-8')
  const kpiMetricCardComponent = fs.readFileSync('src/components/preone/KpiMetricCard.tsx', 'utf-8')
  const globalKpiCardComponent = fs.readFileSync('src/components/preone/GlobalKpiCard.tsx', 'utf-8')
  const uiComponent = fs.readFileSync('src/components/preone/ui.tsx', 'utf-8')

  describe('1. Canonical Neutral & Semantic Status Tokens Parity', () => {
    it('verifies neutral tokens exist in :root and dark mode', () => {
      // Light root
      expect(globalsCss).toContain('--color-neutral-base: #64748B;')
      expect(globalsCss).toContain('--color-neutral-surface: #F1F5F9;')
      expect(globalsCss).toContain('--color-neutral-text: #475569;')
      expect(globalsCss).toContain('--color-neutral-border: #CBD5E1;')

      // Dark mode parity
      expect(globalsCss).toContain('--color-neutral-base: #94A3B8;')
      expect(globalsCss).toContain('--color-neutral-surface: #1C2333;')
      expect(globalsCss).toContain('--color-neutral-text: #CBD5E1;')
      expect(globalsCss).toContain('--color-neutral-border: #334155;')
    })

    it('verifies semantic status tokens exist across light and dark modes', () => {
      // Light
      expect(globalsCss).toContain('--color-success-base: #10B981;')
      expect(globalsCss).toContain('--color-warning-base: #F59E0B;')
      expect(globalsCss).toContain('--color-danger-base: #EF4444;')
      expect(globalsCss).toContain('--color-info-base: #3B82F6;')

      // Dark
      expect(globalsCss).toContain('--color-success-base: #34D399;')
      expect(globalsCss).toContain('--color-warning-base: #FBBF24;')
      expect(globalsCss).toContain('--color-danger-base: #F87171;')
      expect(globalsCss).toContain('--color-info-base: #60A5FA;')
    })
  })

  describe('2. StatusPill & StatusBadge Semantic Contract', () => {
    it('verifies StatusPill exports and maps all semantic variants', () => {
      expect(uiComponent).toContain('export function StatusPill')
      expect(uiComponent).toContain('export function StatusBadge')
      expect(uiComponent).toContain('STATUS_SEMANTIC_MAP')
      expect(uiComponent).toContain('status-pill-success')
      expect(uiComponent).toContain('status-pill-warning')
      expect(uiComponent).toContain('status-pill-urgent')
      expect(uiComponent).toContain('status-pill-neutral')
      expect(uiComponent).toContain('status-pill-info')
      expect(uiComponent).toContain('status-pill-primary')
    })

    it('verifies status-pill classes consume theme badge variables', () => {
      expect(globalsCss).toContain('.status-pill-success')
      expect(globalsCss).toContain('background: var(--badge-success-bg);')
      expect(globalsCss).toContain('.status-pill-neutral')
      expect(globalsCss).toContain('background: var(--badge-neutral-bg);')
    })
  })

  describe('3. Card Wrapper Component Canonical Adoption', () => {
    it('verifies Card variants consume canonical surface tokens', () => {
      expect(cardComponent).toContain('bg-[var(--surface-card)]')
      expect(cardComponent).toContain('border-[var(--border-default)]')
      expect(cardComponent).toContain('bg-[var(--surface-raised)]')
      expect(cardComponent).toContain('bg-[var(--surface-subtle)]')
      expect(cardComponent).not.toContain('dark:bg-slate-900/96')
    })
  })

  describe('4. ZenTable & QuickRowActions Canonical Adoption', () => {
    it('verifies ZenTable wrap adopts canonical surface and border tokens', () => {
      expect(zenTableComponent).toContain('zen-table-wrap')
      expect(globalsCss).toContain('.zen-table-wrap,')
      expect(globalsCss).toContain('background: var(--surface-card);')
      expect(globalsCss).toContain('border: 1px solid var(--border-subtle);')
    })

    it('verifies QuickRowActions dropdown menu consumes --surface-raised and --border-default', () => {
      expect(zenTableComponent).toContain('bg-[var(--surface-raised)]')
      expect(zenTableComponent).toContain('border-[var(--border-default)]')
      expect(zenTableComponent).not.toContain('dark:bg-slate-900 border border-slate-200/80')
    })
  })

  describe('5. Modal & Dialog Surfaces Canonical Adoption', () => {
    it('verifies Dialog consumes --surface-overlay and --surface-raised', () => {
      expect(dialogComponent).toContain('bg-[var(--surface-overlay)]')
      expect(dialogComponent).toContain('bg-[var(--surface-raised)]')
      expect(dialogComponent).toContain('text-[var(--text-primary)]')
      expect(dialogComponent).toContain('border-[var(--border-default)]')
      expect(dialogComponent).not.toContain('dark:bg-black/60')
      expect(dialogComponent).not.toContain('dark:bg-slate-900/98')
    })

    it('verifies Modal subtitle adopts var(--text-secondary) instead of hardcoded hex', () => {
      expect(globalsCss).toContain('.modal-sub{font-family:var(--font-body);font-size:14px;font-weight:400;color:var(--text-secondary);margin-top:2px}')
      expect(globalsCss).not.toContain('.modal-sub{font-family:var(--font-body);font-size:14px;font-weight:400;color:#64748B')
    })
  })

  describe('6. KPI Card Hierarchy Canonical Adoption', () => {
    it('verifies KpiMetricCard consumes semantic class and text tokens', () => {
      expect(kpiMetricCardComponent).toContain('preone-kpi-card')
      expect(kpiMetricCardComponent).toContain('text-[var(--text-secondary)]')
      expect(kpiMetricCardComponent).toContain('text-[var(--text-primary)]')
      expect(kpiMetricCardComponent).not.toContain('dark:bg-slate-900/96')
    })

    it('verifies GlobalKpiCard consumes preone-kpi-card and canonical text tokens', () => {
      expect(globalKpiCardComponent).toContain('preone-kpi-card')
      expect(globalKpiCardComponent).toContain('text-[var(--text-secondary)]')
      expect(globalKpiCardComponent).toContain('text-[var(--text-primary)]')
    })

    it('verifies dark mode .preone-kpi-card adopts canonical --surface-card', () => {
      expect(globalsCss).toContain('background: var(--surface-card, #20263A);')
      expect(globalsCss).toContain('border-color: color-mix(in srgb, var(--primary, #8b5cf6) 24%, var(--border-default, #343D56));')
    })
  })
})
