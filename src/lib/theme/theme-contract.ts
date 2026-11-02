/**
 * PreOne OS — Canonical Theme System Contract (Phase T1)
 * Specification: PRE1-THEME-SYSTEM-T1-001
 *
 * Single deterministic contract governing:
 * 1. User Theme Preferences & Normalization
 * 2. Canonical Storage Key (preone_theme_mode) & Legacy Migration (preone_theme, preone-theme)
 * 3. Separation of User Preference vs Resolved Visual Theme vs System Preference
 * 4. Anti-FOUC Head Script Generation
 * 5. Dynamic System prefers-color-scheme Subscription
 * 6. Authenticated Database Synchronization & Optimistic Persistence
 */

export type ThemePreference =
  | 'light'
  | 'dark'
  | 'auto'
  | 'high-contrast-light'
  | 'high-contrast-dark'

export type ResolvedTheme =
  | 'light'
  | 'dark'
  | 'high-contrast-light'
  | 'high-contrast-dark'

export const CANONICAL_THEME_KEY = 'preone_theme_mode'
export const GUEST_THEME_KEY = 'preone_guest_theme_mode'
export const LEGACY_THEME_KEY_SNAKE = 'preone_theme'
export const LEGACY_THEME_KEY_KEBAB = 'preone-theme'
export const THEME_COOKIE_NAME = 'preone_theme_mode'

export const THEME_COLOR_META_ID = 'app-theme-color-meta'
export const THEME_COLOR_LIGHT = '#F7F8FC'
export const THEME_COLOR_DARK = '#131626'
export const THEME_COLOR_HC_LIGHT = '#FFFFFF'
export const THEME_COLOR_HC_DARK = '#000000'

/**
 * Normalizes any arbitrary input into a strictly validated ThemePreference.
 * Handles uppercase DB values ('LIGHT', 'DARK', 'SYSTEM') and legacy values.
 */
export function normalizeThemePreference(val: unknown): ThemePreference {
  if (typeof val !== 'string') return 'auto'
  const normalized = val.trim().toLowerCase().replace(/_/g, '-')
  if (normalized === 'light') return 'light'
  if (normalized === 'dark') return 'dark'
  if (normalized === 'auto' || normalized === 'system') return 'auto'
  if (normalized === 'high-contrast-light' || normalized === 'highcontrastlight') return 'high-contrast-light'
  if (normalized === 'high-contrast-dark' || normalized === 'highcontrastdark') return 'high-contrast-dark'
  return 'auto'
}

/**
 * Normalizes a ThemePreference to database format ('LIGHT' | 'DARK' | 'SYSTEM' | 'HIGH_CONTRAST_LIGHT' | 'HIGH_CONTRAST_DARK')
 */
export function preferenceToDbFormat(pref: ThemePreference): string {
  switch (pref) {
    case 'light':
      return 'LIGHT'
    case 'dark':
      return 'DARK'
    case 'high-contrast-light':
      return 'HIGH_CONTRAST_LIGHT'
    case 'high-contrast-dark':
      return 'HIGH_CONTRAST_DARK'
    case 'auto':
    default:
      return 'SYSTEM'
  }
}

/**
 * Resolves the visual theme from preference and system state.
 * Supports Light, Dark, High Contrast Light, and High Contrast Dark.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  switch (preference) {
    case 'light':
      return 'light'
    case 'dark':
      return 'dark'
    case 'high-contrast-light':
      return 'high-contrast-light'
    case 'high-contrast-dark':
      return 'high-contrast-dark'
    case 'auto':
    default:
      return systemPrefersDark ? 'dark' : 'light'
  }
}

/**
 * Convenience helper to determine if a theme has dark luminosity semantics.
 */
export function isDarkTheme(theme: ResolvedTheme): boolean {
  return theme === 'dark' || theme === 'high-contrast-dark'
}

/**
 * Convenience helper to determine if a theme operates in High Contrast mode.
 */
export function isHighContrastTheme(theme: ResolvedTheme | ThemePreference): boolean {
  return theme === 'high-contrast-light' || theme === 'high-contrast-dark'
}

/**
 * Checks whether the operating system prefers dark mode.
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/**
 * Deterministic Migration & Storage Reader
 *
 * Precedence Rule:
 * 1. Check canonical key 'preone_theme_mode'. If valid, return it.
 * 2. If not set or invalid, check legacy 'preone_theme' (snake_case).
 * 3. If not set or invalid, check legacy 'preone-theme' (kebab-case).
 * 4. If neither is valid, fallback to 'auto'.
 *
 * Automatically migrates storage to 'preone_theme_mode' and mirrors to legacy keys.
 */
export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto'

  try {
    const canonical = localStorage.getItem(CANONICAL_THEME_KEY)
    if (
      canonical === 'light' ||
      canonical === 'dark' ||
      canonical === 'auto' ||
      canonical === 'high-contrast-light' ||
      canonical === 'high-contrast-dark'
    ) {
      return canonical
    }

    // Deterministic legacy migration: snake_case takes precedence over kebab-case
    const legacySnake = localStorage.getItem(LEGACY_THEME_KEY_SNAKE)
    const legacyKebab = localStorage.getItem(LEGACY_THEME_KEY_KEBAB)
    const legacyCandidate = legacySnake || legacyKebab

    let migrated: ThemePreference = 'auto'
    if (legacyCandidate === 'dark') {
      migrated = 'dark'
    } else if (legacyCandidate === 'light') {
      migrated = 'light'
    }

    // Write canonical key
    try {
      localStorage.setItem(CANONICAL_THEME_KEY, migrated)
      // Keep legacy keys mirrored for backward compatibility
      localStorage.setItem(LEGACY_THEME_KEY_SNAKE, migrated === 'auto' ? 'system' : migrated)
      localStorage.setItem(LEGACY_THEME_KEY_KEBAB, migrated === 'auto' ? 'system' : migrated)
    } catch {
      // Storage quota or sandboxed iframe
    }

    return migrated
  } catch {
    return 'auto'
  }
}

/**
 * Sets the stored theme preference with dual-write legacy mirroring and cookie synchronization.
 * If isGuest is true, preserves the selection in GUEST_THEME_KEY as well.
 */
export function setStoredThemePreference(
  preference: ThemePreference,
  isGuest: boolean = false
): void {
  if (typeof window === 'undefined') return

  try {
    if (isGuest) {
      localStorage.setItem(GUEST_THEME_KEY, preference)
    }
    localStorage.setItem(CANONICAL_THEME_KEY, preference)
    // Mirror to legacy keys so older components or tabs stay in sync
    const legacyVal = preference === 'auto' ? 'system' : preference.includes('dark') ? 'dark' : 'light'
    localStorage.setItem(LEGACY_THEME_KEY_SNAKE, legacyVal)
    localStorage.setItem(LEGACY_THEME_KEY_KEBAB, legacyVal)

    // Synchronize client cookie for SSR cold-navigation coordination
    if (typeof document !== 'undefined') {
      try {
        const isSecure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(preference)}; path=/; max-age=31536000; SameSite=Lax${isSecure}`
      } catch {}
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Handles logout cleanup:
 * 1. Evicts authenticated user's active theme from canonical storage.
 * 2. Restores preserved guest preference if present; otherwise defaults to 'auto'.
 * 3. Never leaks User A's preference to User B or the public login page.
 */
export function clearUserThemeCache(): void {
  if (typeof window === 'undefined') return
  try {
    const isSecure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
    const guestPref = localStorage.getItem(GUEST_THEME_KEY)
    if (
      guestPref === 'light' ||
      guestPref === 'dark' ||
      guestPref === 'auto' ||
      guestPref === 'high-contrast-light' ||
      guestPref === 'high-contrast-dark'
    ) {
      localStorage.setItem(CANONICAL_THEME_KEY, guestPref)
      const legacyVal = guestPref === 'auto' ? 'system' : guestPref.includes('dark') ? 'dark' : 'light'
      localStorage.setItem(LEGACY_THEME_KEY_SNAKE, legacyVal)
      localStorage.setItem(LEGACY_THEME_KEY_KEBAB, legacyVal)
      if (typeof document !== 'undefined') {
        document.cookie = `${THEME_COOKIE_NAME}=${guestPref}; path=/; max-age=31536000; SameSite=Lax${isSecure}`
        applyThemeToDom(resolveTheme(guestPref, getSystemPrefersDark()))
      }
    } else {
      localStorage.setItem(CANONICAL_THEME_KEY, 'auto')
      localStorage.setItem(LEGACY_THEME_KEY_SNAKE, 'system')
      localStorage.setItem(LEGACY_THEME_KEY_KEBAB, 'system')
      if (typeof document !== 'undefined') {
        document.cookie = `${THEME_COOKIE_NAME}=auto; path=/; max-age=31536000; SameSite=Lax${isSecure}`
        applyThemeToDom(resolveTheme('auto', getSystemPrefersDark()))
      }
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Applies a resolved visual theme ('light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark')
 * to document DOM attributes, classes, and meta theme-color tag.
 */
export function applyThemeToDom(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return

  const isDarkClass = resolved === 'dark' || resolved === 'high-contrast-dark'
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.classList.toggle('dark', isDarkClass)

  const meta =
    document.getElementById(THEME_COLOR_META_ID) ||
    document.querySelector('meta[name="theme-color"]')
  if (meta) {
    let color = THEME_COLOR_LIGHT
    if (resolved === 'dark') {
      color = THEME_COLOR_DARK
    } else if (resolved === 'high-contrast-light') {
      color = THEME_COLOR_HC_LIGHT
    } else if (resolved === 'high-contrast-dark') {
      color = THEME_COLOR_HC_DARK
    }
    meta.setAttribute('content', color)
  }
}

/**
 * Generates the minified, synchronous Anti-FOUC JavaScript string for inline injection into <head>.
 * Executes synchronously during HTML parsing before first paint.
 */
export function getThemeInitScript(): string {
  return `(function(){try{var K='${CANONICAL_THEME_KEY}',S='${LEGACY_THEME_KEY_SNAKE}',B='${LEGACY_THEME_KEY_KEBAB}';var p=localStorage.getItem(K);if(!p||(p!=='light'&&p!=='dark'&&p!=='auto'&&p!=='high-contrast-light'&&p!=='high-contrast-dark')){var l=localStorage.getItem(S)||localStorage.getItem(B);if(l==='dark'||l==='light'){p=l;}else{p='auto';}try{localStorage.setItem(K,p);localStorage.setItem(S,l||'system');localStorage.setItem(B,l||'system');}catch(e){}}var t='light';if(p==='dark'||p==='high-contrast-dark'){t=p;}else if(p==='light'||p==='high-contrast-light'){t=p;}else{var d=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);t=d?'dark':'light';}document.documentElement.setAttribute('data-theme',t);if(t==='dark'||t==='high-contrast-dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}var m=document.getElementById('${THEME_COLOR_META_ID}')||document.querySelector('meta[name="theme-color"]');if(m){var c='${THEME_COLOR_LIGHT}';if(t==='dark')c='${THEME_COLOR_DARK}';else if(t==='high-contrast-light')c='${THEME_COLOR_HC_LIGHT}';else if(t==='high-contrast-dark')c='${THEME_COLOR_HC_DARK}';m.setAttribute('content',c);}}catch(e){}})();`
}

/**
 * Subscribes to dynamic OS (prefers-color-scheme: dark) changes.
 * Automatically updates DOM and triggers callback only when current preference is 'auto'.
 */
export function subscribeToSystemThemeChange(
  onResolvedChange?: (resolved: ResolvedTheme) => void
): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}

  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const currentPref = getStoredThemePreference()
      if (currentPref === 'auto') {
        const nextResolved: ResolvedTheme = e.matches ? 'dark' : 'light'
        applyThemeToDom(nextResolved)
        if (onResolvedChange) {
          onResolvedChange(nextResolved)
        }
      }
    }

    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    } else if ((mql as any).addListener) {
      ;(mql as any).addListener(handler)
      return () => (mql as any).removeListener(handler)
    }
  } catch {
    // Non-fatal
  }

  return () => {}
}

/**
 * Synchronizes the theme with the authenticated user's database preference.
 * The database preference is authoritative for authenticated sessions.
 */
export function syncThemeWithDatabase(
  dbThemePref?: string | null
): { preference: ThemePreference; resolved: ResolvedTheme } {
  if (typeof window === 'undefined') {
    return { preference: 'auto', resolved: 'light' }
  }

  const normalizedDbPref = dbThemePref ? normalizeThemePreference(dbThemePref) : null
  const localPref = getStoredThemePreference()

  // If authenticated DB preference is present, it is authoritative
  const effectivePref = normalizedDbPref || localPref
  if (normalizedDbPref && normalizedDbPref !== localPref) {
    setStoredThemePreference(normalizedDbPref)
  }

  const resolved = resolveTheme(effectivePref, getSystemPrefersDark())
  applyThemeToDom(resolved)
  return { preference: effectivePref, resolved }
}

/**
 * Optimistically applies and persists a user theme change both to localStorage
 * and asynchronously to the user preferences API.
 */
export async function persistThemePreference(
  preference: ThemePreference,
  isAuthenticated: boolean = true
): Promise<{ success: boolean; error?: string }> {
  // 1. Immediately update localStorage mirror
  setStoredThemePreference(preference)

  // 2. Immediately apply to DOM (zero lag)
  const resolved = resolveTheme(preference, getSystemPrefersDark())
  applyThemeToDom(resolved)

  // 3. If guest / unauthenticated, localStorage is authoritative
  if (!isAuthenticated) {
    return { success: true }
  }

  // 4. If authenticated, synchronize with backend database
  try {
    const res = await fetch('/api/v1/settings/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: preferenceToDbFormat(preference) }),
    })
    const json = await res.json()
    if (!json.success) {
      return {
        success: false,
        error: json.error?.message || 'Failed to persist preference to database',
      }
    }
    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error synchronizing preference',
    }
  }
}
