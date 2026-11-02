import { describe, it, expect, beforeEach } from 'bun:test'
import {
  resolveTheme,
  applyThemeToDom,
  getThemeInitScript,
  setStoredThemePreference,
  getStoredThemePreference,
  CANONICAL_THEME_KEY,
  THEME_COLOR_META_ID,
  THEME_COLOR_HC_LIGHT,
  THEME_COLOR_HC_DARK,
  THEME_COLOR_LIGHT,
  THEME_COLOR_DARK,
} from '@/lib/theme/theme-contract'

describe('PreOne High Contrast Visual System (T2.2 & T2.3)', () => {
  let mockStorage: Map<string, string>
  let mockHtml: {
    attrs: Map<string, string>
    classList: Set<string>
    setAttribute: (k: string, v: string) => void
    getAttribute: (k: string) => string | null
  }
  let mockMeta: {
    attrs: Map<string, string>
    setAttribute: (k: string, v: string) => void
    getAttribute: (k: string) => string | null
  }

  beforeEach(() => {
    mockStorage = new Map()
    mockHtml = {
      attrs: new Map(),
      classList: new Set(),
      setAttribute(k: string, v: string) {
        this.attrs.set(k, v)
      },
      getAttribute(k: string) {
        return this.attrs.get(k) ?? null
      },
    }
    mockMeta = {
      attrs: new Map(),
      setAttribute(k: string, v: string) {
        this.attrs.set(k, v)
      },
      getAttribute(k: string) {
        return this.attrs.get(k) ?? null
      },
    }

    ;(globalThis as any).localStorage = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
      removeItem: (k: string) => mockStorage.delete(k),
      clear: () => mockStorage.clear(),
    }
    ;(globalThis as any).window = {
      matchMedia: () => ({ matches: false }),
    }
    ;(globalThis as any).document = {
      documentElement: {
        setAttribute: (k: string, v: string) => mockHtml.setAttribute(k, v),
        getAttribute: (k: string) => mockHtml.getAttribute(k),
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) mockHtml.classList.add(cls)
            else mockHtml.classList.delete(cls)
          },
          add: (cls: string) => mockHtml.classList.add(cls),
          remove: (cls: string) => mockHtml.classList.delete(cls),
          contains: (cls: string) => mockHtml.classList.has(cls),
        },
      },
      getElementById: (id: string) => (id === THEME_COLOR_META_ID ? mockMeta : null),
      querySelector: (sel: string) => (sel === 'meta[name="theme-color"]' ? mockMeta : null),
      cookie: '',
    }
  })

  describe('Theme Resolution & DOM Synchronization', () => {
    it('resolves high-contrast-light to genuine visual mode high-contrast-light', () => {
      expect(resolveTheme('high-contrast-light', false)).toBe('high-contrast-light')
      expect(resolveTheme('high-contrast-light', true)).toBe('high-contrast-light')
    })

    it('resolves high-contrast-dark to genuine visual mode high-contrast-dark', () => {
      expect(resolveTheme('high-contrast-dark', false)).toBe('high-contrast-dark')
      expect(resolveTheme('high-contrast-dark', true)).toBe('high-contrast-dark')
    })

    it('applies high-contrast-light to DOM: data-theme, no dark class, meta #FFFFFF', () => {
      applyThemeToDom('high-contrast-light')
      expect(mockHtml.getAttribute('data-theme')).toBe('high-contrast-light')
      expect(mockHtml.classList.has('dark')).toBe(false)
      expect(mockMeta.getAttribute('content')).toBe(THEME_COLOR_HC_LIGHT)
    })

    it('applies high-contrast-dark to DOM: data-theme, dark class, meta #000000', () => {
      applyThemeToDom('high-contrast-dark')
      expect(mockHtml.getAttribute('data-theme')).toBe('high-contrast-dark')
      expect(mockHtml.classList.has('dark')).toBe(true)
      expect(mockMeta.getAttribute('content')).toBe(THEME_COLOR_HC_DARK)
    })
  })

  describe('Storage & Anti-FOUC Script for High Contrast', () => {
    it('persists and retrieves high-contrast preferences cleanly', () => {
      setStoredThemePreference('high-contrast-light')
      expect(getStoredThemePreference()).toBe('high-contrast-light')

      setStoredThemePreference('high-contrast-dark')
      expect(getStoredThemePreference()).toBe('high-contrast-dark')
    })

    it('executes head Anti-FOUC script correctly for high-contrast-light', () => {
      mockStorage.set(CANONICAL_THEME_KEY, 'high-contrast-light')
      const script = getThemeInitScript()
      eval(script)

      expect(mockHtml.getAttribute('data-theme')).toBe('high-contrast-light')
      expect(mockHtml.classList.has('dark')).toBe(false)
      expect(mockMeta.getAttribute('content')).toBe(THEME_COLOR_HC_LIGHT)
    })

    it('executes head Anti-FOUC script correctly for high-contrast-dark', () => {
      mockStorage.set(CANONICAL_THEME_KEY, 'high-contrast-dark')
      const script = getThemeInitScript()
      eval(script)

      expect(mockHtml.getAttribute('data-theme')).toBe('high-contrast-dark')
      expect(mockHtml.classList.has('dark')).toBe(true)
      expect(mockMeta.getAttribute('content')).toBe(THEME_COLOR_HC_DARK)
    })
  })
})
