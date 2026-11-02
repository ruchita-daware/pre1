import { describe, it, expect } from 'bun:test'
import {
  hexToRgb,
  getRelativeLuminance,
  getContrastRatio,
  validateTextContrast,
  validateNonTextContrast,
  validateFocusIndicatorContrast,
  CANONICAL_PALETTES,
  auditPaletteWcagCompliance,
} from '@/lib/theme/contrast-engine'

describe('PreOne WCAG Contrast Calculation Engine (T2.1)', () => {
  describe('Mathematical Precision & Relative Luminance', () => {
    it('calculates correct luminance for pure black and pure white', () => {
      const black = hexToRgb('#000000')!
      const white = hexToRgb('#FFFFFF')!
      expect(getRelativeLuminance(black.r, black.g, black.b)).toBe(0)
      expect(getRelativeLuminance(white.r, white.g, white.b)).toBe(1)
    })

    it('calculates maximum contrast ratio 21:1 between pure black and pure white', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBe(21)
      expect(getContrastRatio('#FFFFFF', '#000000')).toBe(21)
    })

    it('calculates 1:1 ratio between identical colors', () => {
      expect(getContrastRatio('#7C3AED', '#7C3AED')).toBe(1)
      expect(getContrastRatio('#131626', '#131626')).toBe(1)
    })
  })

  describe('Classic Premium Baseline Invariance', () => {
    it('verifies Light baseline Canvas #F7F8FC with text #0F172A achieves WCAG AA & AAA', () => {
      const p = CANONICAL_PALETTES.light
      expect(p.canvas).toBe('#F7F8FC')
      expect(p.surface).toBe('#FFFFFF')
      expect(p.brandPrimary).toBe('#7C3AED')

      const bodyContrast = validateTextContrast(p.textPrimary, p.canvas)
      expect(bodyContrast.ratio).toBeGreaterThanOrEqual(14) // Deep slate on canvas gives ~15:1
      expect(bodyContrast.normalTextAAA).toBe(true)
    })

    it('verifies Dark baseline Canvas #131626 with text #F4F3FF achieves WCAG AA & AAA', () => {
      const p = CANONICAL_PALETTES.dark
      expect(p.canvas).toBe('#131626')
      expect(p.surface).toBe('#20263A')
      expect(p.textPrimary).toBe('#F4F3FF')
      expect(p.brandPrimary).toBe('#B69AFF')
      expect(p.interactiveSurface).toBe('#8B5CF6')

      const bodyContrast = validateTextContrast(p.textPrimary, p.canvas)
      expect(bodyContrast.ratio).toBeGreaterThanOrEqual(14)
      expect(bodyContrast.normalTextAAA).toBe(true)

      const buttonContrast = validateTextContrast(p.interactiveText, p.interactiveSurface)
      expect(buttonContrast.ratio).toBeGreaterThanOrEqual(3.0) // White text on #8B5CF6 gives 4.23:1 (exceeds WCAG AA 3:1 for bold/UI controls)
      expect(buttonContrast.largeTextAA).toBe(true)
    })
  })

  describe('High Contrast Palettes (T2.1 Architecture)', () => {
    it('verifies High Contrast Light meets WCAG AAA thresholds for all primary surfaces', () => {
      const audit = auditPaletteWcagCompliance('high-contrast-light')
      expect(audit.allPass).toBe(true)

      const p = CANONICAL_PALETTES['high-contrast-light']
      expect(p.canvas).toBe('#FFFFFF')
      expect(p.textPrimary).toBe('#000000')
      expect(p.border).toBe('#000000')

      // Black text on white canvas = 21:1 (AAA)
      expect(getContrastRatio(p.textPrimary, p.canvas)).toBe(21)
      // High-contrast brand variant on white > 10:1 (exceeds WCAG AAA 7:1)
      expect(getContrastRatio(p.brandPrimary, p.canvas)).toBeGreaterThanOrEqual(10)
      // Focus ring contrast on canvas = 21:1 (AAA)
      expect(validateNonTextContrast(p.focusRing, p.canvas).pass).toBe(true)
    })

    it('verifies High Contrast Dark meets WCAG AAA thresholds for all primary surfaces', () => {
      const audit = auditPaletteWcagCompliance('high-contrast-dark')
      expect(audit.allPass).toBe(true)

      const p = CANONICAL_PALETTES['high-contrast-dark']
      expect(p.canvas).toBe('#000000')
      expect(p.textPrimary).toBe('#FFFFFF')
      expect(p.border).toBe('#FFFFFF')

      // White text on black canvas = 21:1 (AAA)
      expect(getContrastRatio(p.textPrimary, p.canvas)).toBe(21)
      // High-luminance brand variant on black > 14:1 (AAA)
      expect(getContrastRatio(p.brandPrimary, p.canvas)).toBeGreaterThanOrEqual(14)
      // Focus ring contrast on canvas = 21:1 (AAA)
      expect(validateNonTextContrast(p.focusRing, p.canvas).pass).toBe(true)
    })

    it('verifies focus indicator contrast against both component and canvas (WCAG 2.2)', () => {
      // High Contrast Light: black focus ring on white button on white canvas
      const hcLight = CANONICAL_PALETTES['high-contrast-light']
      const focusHCLight = validateFocusIndicatorContrast(hcLight.focusRing, '#FFFFFF', hcLight.canvas)
      expect(focusHCLight.pass).toBe(true)

      // High Contrast Dark: white focus ring on black button on black canvas
      const hcDark = CANONICAL_PALETTES['high-contrast-dark']
      const focusHCDark = validateFocusIndicatorContrast(hcDark.focusRing, '#000000', hcDark.canvas)
      expect(focusHCDark.pass).toBe(true)
    })
  })
})
