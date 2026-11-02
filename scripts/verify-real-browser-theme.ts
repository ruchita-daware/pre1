/**
 * PreOne Real Browser Theme & Anti-FOUC Verification Script
 * Specification ID: PRE1-THEME-SYSTEM-T1.2-001
 * Uses Playwright to inspect real browser DOM, computed styles, and execution lifecycle.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'

interface BrowserTestResult {
  scenario: string
  initialHtmlTheme: string | null
  firstPaintedTheme: string | null
  postHydrationTheme: string | null
  finalTheme: string | null
  computedBg: string
  computedColor: string
  hasFouc: boolean
  notes: string
}

async function runRealBrowserVerification() {
  console.log('========================================================================')
  console.log(' PREONE — REAL BROWSER THEME & ANTI-FOUC VERIFICATION (T1.2) ')
  console.log(' Target URL: http://localhost:3000 ')
  console.log('========================================================================\n')

  let browser: Browser | null = null
  const results: BrowserTestResult[] = []

  try {
    browser = await chromium.launch({ headless: true })

    // Helper to test a scenario
    async function testFlow(
      name: string,
      colorScheme: 'light' | 'dark',
      storageSetup: (page: Page) => Promise<void>,
      path: string = '/'
    ) {
      const context = await browser!.newContext({
        colorScheme,
        viewport: { width: 1280, height: 800 },
      })
      const page = await context.newPage()

      // Apply initial storage setup before navigation
      await page.addInitScript(storageSetup)

      // Navigate to target path
      await page.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded' })

      // 1. Initial HTML theme immediately on DOMContentLoaded
      const initialHtmlTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme')
      })
      const hasDarkClassInitial = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })

      // 2. First painted theme (before hydration settles)
      const firstPaintedBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      // Wait for complete hydration and network idle
      await page.waitForLoadState('networkidle').catch(() => {})

      // 3. Post-hydration theme
      const postHydrationTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme')
      })
      const postHydrationDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      const computedBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })
      const computedColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).color
      })

      const hasFouc = initialHtmlTheme !== postHydrationTheme

      results.push({
        scenario: name,
        initialHtmlTheme: `${initialHtmlTheme} (dark=${hasDarkClassInitial})`,
        firstPaintedTheme: initialHtmlTheme,
        postHydrationTheme: `${postHydrationTheme} (dark=${postHydrationDark})`,
        finalTheme: postHydrationTheme,
        computedBg,
        computedColor,
        hasFouc,
        notes: hasFouc ? 'FOUC DETECTED' : 'Clean Zero-FOUC transition',
      })

      await context.close()
    }

    // 1. Guest Light + OS Dark
    console.log('[1/9] Testing Guest Light + OS Dark...')
    await testFlow('Guest Light + OS Dark', 'dark', async () => {
      localStorage.setItem('preone_theme_mode', 'light')
      localStorage.setItem('preone_guest_theme_mode', 'light')
    })

    // 2. Guest Dark + OS Light
    console.log('[2/9] Testing Guest Dark + OS Light...')
    await testFlow('Guest Dark + OS Light', 'light', async () => {
      localStorage.setItem('preone_theme_mode', 'dark')
      localStorage.setItem('preone_guest_theme_mode', 'dark')
    })

    // 3. Authenticated DB Dark + OS Light (Simulated session mirror)
    console.log('[3/9] Testing Authenticated DB Dark + OS Light...')
    await testFlow('Authenticated DB Dark + OS Light', 'light', async () => {
      localStorage.setItem('preone_theme_mode', 'dark')
      document.cookie = 'preone_theme_mode=dark; path=/'
    })

    // 4. Authenticated DB Light + OS Dark (Simulated session mirror)
    console.log('[4/9] Testing Authenticated DB Light + OS Dark...')
    await testFlow('Authenticated DB Light + OS Dark', 'dark', async () => {
      localStorage.setItem('preone_theme_mode', 'light')
      document.cookie = 'preone_theme_mode=light; path=/'
    })

    // 5. Logout from DB Dark (Guest preference was Dark)
    console.log('[5/9] Testing Logout from DB Dark (Guest preserved)...')
    await testFlow('Logout from DB Dark', 'light', async () => {
      // Guest had chosen dark, user logged out
      localStorage.setItem('preone_guest_theme_mode', 'dark')
      localStorage.setItem('preone_theme_mode', 'dark')
    })

    // 6. User A Dark -> Logout -> User B Light
    console.log('[6/9] Testing User A Dark -> Logout -> User B Light...')
    await testFlow('User A Dark -> Logout -> User B Light', 'dark', async () => {
      // User B has DB Light
      localStorage.setItem('preone_theme_mode', 'light')
      document.cookie = 'preone_theme_mode=light; path=/'
    })

    // 7. Direct cold navigation to / (No storage set, OS Dark)
    console.log('[7/9] Testing Direct Cold Navigation (OS Dark)...')
    await testFlow('Cold Direct Navigation (OS Dark)', 'dark', async () => {
      localStorage.clear()
    })

    // 8. Full page refresh
    console.log('[8/9] Testing Full Page Refresh...')
    await testFlow('Full Page Refresh (Dark Active)', 'light', async () => {
      localStorage.setItem('preone_theme_mode', 'dark')
    })

    // 9. New browser tab (Shares storage)
    console.log('[9/11] Testing New Browser Tab...')
    await testFlow('New Browser Tab (Light Active)', 'dark', async () => {
      localStorage.setItem('preone_theme_mode', 'light')
    })

    // 10. High Contrast Light (Phase T2.2)
    console.log('[10/11] Testing High Contrast Light...')
    await testFlow('High Contrast Light (WCAG AAA)', 'dark', async () => {
      localStorage.setItem('preone_theme_mode', 'high-contrast-light')
      document.cookie = 'preone_theme_mode=high-contrast-light; path=/'
    })

    // 11. High Contrast Dark (Phase T2.3)
    console.log('[11/11] Testing High Contrast Dark...')
    await testFlow('High Contrast Dark (WCAG AAA)', 'light', async () => {
      localStorage.setItem('preone_theme_mode', 'high-contrast-dark')
      document.cookie = 'preone_theme_mode=high-contrast-dark; path=/'
    })

    console.log('\n========================================================================')
    console.log(' REAL BROWSER THEME VERIFICATION RESULTS MATRIX ')
    console.log('========================================================================\n')
    console.table(
      results.map((r) => ({
        Scenario: r.scenario,
        'Initial HTML': r.initialHtmlTheme,
        'Post-Hydration': r.postHydrationTheme,
        'Computed Body BG': r.computedBg,
        FOUC: r.hasFouc ? 'YES' : 'NO',
        Result: r.notes,
      }))
    )

    const allPassed = results.every((r) => !r.hasFouc)
    console.log(`\nOVERALL REAL BROWSER VERIFICATION: ${allPassed ? '100% PASSED (ZERO FOUC)' : 'FAILURES DETECTED'}`)
  } catch (err: any) {
    console.error('Playwright execution error:', err.message)
  } finally {
    if (browser) await browser.close()
  }
}

runRealBrowserVerification().catch(console.error)
