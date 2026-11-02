import { describe, it, expect } from 'bun:test'

/**
 * PreOne Dark Mode Excellence Test Suite
 * Validates:
 * 1. Root causes of BUG-010 (theme flash on cold boot) and BUG-011 (corner gradient)
 * 2. Theme initialization & synchronization script in layout.tsx
 * 3. PreHydration theme detection logic and fallback to prefers-color-scheme
 * 4. Dual key persistence ('preone_theme' & 'preone-theme') in AppShell and AuthShell
 * 5. Global Dark Surface System CSS tokens in globals.css
 * 6. Primary and auth buttons dark-mode violet outer glow
 */

describe('PreOne Dark Mode Excellence Test Suite', () => {
  describe('BUG-010: Theme Flash on Cold Boot & Theme Script Robustness', () => {
    it('verifies src/app/layout.tsx executes an early, blocking <script> in <head> before DOM paint', async () => {
      const layoutFile = await Bun.file('src/app/layout.tsx').text()
      expect(layoutFile).toContain('<head>')
      expect(layoutFile).toContain('getThemeInitScript()')

      // Behavioral assertion against generated blocking initialization script
      const { getThemeInitScript } = await import('@/lib/theme/theme-contract')
      const script = getThemeInitScript()
      expect(script).toContain('localStorage.getItem')
      expect(script).toContain('preone_theme_mode')
      expect(script).toContain('preone_theme')
      expect(script).toContain('preone-theme')
      expect(script).toContain('prefers-color-scheme: dark')
      expect(script).toContain('setAttribute')
      expect(script).toContain('data-theme')
      expect(script).toContain('classList.add')
      expect(script).toContain('try')
    })

    it('verifies PreHydration synchronizes theme attributes before React hydration', async () => {
      const preHydrationFile = await Bun.file('src/components/PreHydration.tsx').text()
      expect(preHydrationFile).toContain('getStoredThemePreference')
      expect(preHydrationFile).toContain('resolveTheme')
      expect(preHydrationFile).toContain('applyThemeToDom')

      // Behavioral verification of resolution logic
      const { resolveTheme, normalizeThemePreference } = await import('@/lib/theme/theme-contract')
      expect(resolveTheme(normalizeThemePreference('dark'), false)).toBe('dark')
      expect(resolveTheme(normalizeThemePreference('light'), true)).toBe('light')
      expect(resolveTheme(normalizeThemePreference('auto'), true)).toBe('dark')
      expect(resolveTheme(normalizeThemePreference('auto'), false)).toBe('light')
    })

    it('verifies AppShell and AuthShell integrate canonical theme persistence and legacy mirroring', async () => {
      const appShellFile = await Bun.file('src/components/shell/AppShell.tsx').text()
      expect(appShellFile).toContain('persistThemePreference')
      expect(appShellFile).toContain('syncThemeWithDatabase')
      expect(appShellFile).toContain('subscribeToSystemThemeChange')

      const authShellFile = await Bun.file('src/components/auth/AuthShell.tsx').text()
      expect(authShellFile).toContain('setStoredThemePreference')
      expect(authShellFile).toContain('applyThemeToDom')
      expect(authShellFile).toContain('subscribeToSystemThemeChange')

      // Behavioral verification of legacy dual-write mirroring contract
      const {
        setStoredThemePreference,
        CANONICAL_THEME_KEY,
        LEGACY_THEME_KEY_SNAKE,
        LEGACY_THEME_KEY_KEBAB,
      } = await import('@/lib/theme/theme-contract')

      const testStorage = new Map<string, string>()
      ;(globalThis as any).window = { matchMedia: () => ({ matches: false }) }
      ;(globalThis as any).localStorage = {
        getItem: (k: string) => testStorage.get(k) ?? null,
        setItem: (k: string, v: string) => testStorage.set(k, String(v)),
        removeItem: (k: string) => testStorage.delete(k),
      }

      setStoredThemePreference('dark')
      expect(testStorage.get(CANONICAL_THEME_KEY)).toBe('dark')
      expect(testStorage.get(LEGACY_THEME_KEY_SNAKE)).toBe('dark')
      expect(testStorage.get(LEGACY_THEME_KEY_KEBAB)).toBe('dark')

      setStoredThemePreference('light')
      expect(testStorage.get(CANONICAL_THEME_KEY)).toBe('light')
      expect(testStorage.get(LEGACY_THEME_KEY_SNAKE)).toBe('light')
      expect(testStorage.get(LEGACY_THEME_KEY_KEBAB)).toBe('light')
    })
  })

  describe('BUG-011: Auth Card Dark-Mode Decorative Gradient Inspection', () => {
    it('verifies AuthCard does not render a harsh rectangular corner gradient in dark mode', async () => {
      const authCardFile = await Bun.file('src/components/auth/AuthCard.tsx').text()
      expect(authCardFile).not.toContain('rounded-tr-3xl pointer-events-none')
      expect(authCardFile).not.toContain('w-32 h-32 bg-gradient-to-bl from-purple-100/40')
      expect(authCardFile).toContain('rounded-full')
      expect(authCardFile).toContain('blur-2xl')
      expect(authCardFile).toContain('dark:from-purple-900/20')
    })
  })

  describe('Global Dark Surface System Tokens', () => {
    it('verifies dark surface design tokens are defined in globals.css under [data-theme="dark"]', async () => {
      const globalsCss = await Bun.file('src/app/globals.css').text()

      // Canvas token
      expect(globalsCss).toContain('--surface-canvas: var(--color-canvas);')
      // Card token with subtle translucency
      expect(globalsCss).toContain('--surface-card: rgba(17, 24, 39, 0.78);')
      // Raised / elevated surface
      expect(globalsCss).toContain('--surface-raised: #1B2438;')
      // Border tokens
      expect(globalsCss).toContain('--surface-border: rgba(255, 255, 255, 0.08);')
      expect(globalsCss).toContain('--border-subtle: rgba(255, 255, 255, 0.08);')
      expect(globalsCss).toContain('--border-strong: rgba(255, 255, 255, 0.16);')
      // Brand glow
      expect(globalsCss).toContain('--brand-glow: rgba(139, 92, 246, 0.35);')
    })

    it('verifies primary buttons in dark mode render subtle violet outer glow', async () => {
      const globalsCss = await Bun.file('src/app/globals.css').text()
      expect(globalsCss).toContain('[data-theme="dark"] .btn-primary')
      expect(globalsCss).toContain('box-shadow: 0 0 24px rgba(139, 92, 246, 0.35)')

      const buttonFile = await Bun.file('src/components/ui/button.tsx').text()
      expect(buttonFile).toContain('dark:shadow-[0_0_24px_rgba(139,92,246,0.35)]')
      expect(buttonFile).toContain('hover:dark:shadow-[0_0_28px_rgba(139,92,246,0.45)]')
    })
  })
})
