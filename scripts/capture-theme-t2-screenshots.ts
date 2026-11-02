/**
 * PreOne Theme System T2 — Real Browser Screenshot Capture Script
 * Specification: PRE1-THEME-SYSTEM-T2-001 (Phase T2.5)
 *
 * Captures real high-resolution screenshots across all 4 theme modes:
 * 1. light
 * 2. dark
 * 3. high-contrast-light
 * 4. high-contrast-dark
 *
 * Across:
 * - Desktop Viewport (1440 x 900)
 * - Mobile Viewport (390 x 844)
 * - Auth Screen, Home Launcher, Settings Portal, Tables/Components
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/theme-audit/t2')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const MODES = [
  { mode: 'light', name: 'Light (Classic Premium)', dark: false },
  { mode: 'dark', name: 'Dark (Midnight Pearl)', dark: true },
  { mode: 'high-contrast-light', name: 'High Contrast Light (WCAG AAA)', dark: false },
  { mode: 'high-contrast-dark', name: 'High Contrast Dark (WCAG AAA)', dark: true },
] as const

async function run() {
  console.log('========================================================================')
  console.log(' PREONE THEME SYSTEM T2 — SCREENSHOT CAPTURE SUITE')
  console.log(` Target: ${BASE_URL}`)
  console.log(` Output: ${OUTPUT_DIR}`)
  console.log('========================================================================\n')

  const browser = await chromium.launch({ headless: true })

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. AUTH SCREEN (DESKTOP 1440x900 & MOBILE 390x844) ACROSS ALL 4 MODES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📸 1. Capturing Auth Screen in 4 Theme Modes (Desktop & Mobile)...')

    for (const m of MODES) {
      // Desktop Auth
      const desktopCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: m.dark ? 'dark' : 'light',
      })
      await desktopCtx.addCookies([
        { name: 'preone_theme_mode', value: m.mode, url: BASE_URL },
      ])
      const dPage = await desktopCtx.newPage()
      await dPage.goto(`${BASE_URL}`, { waitUntil: 'networkidle' })
      await dPage.evaluate((mode) => {
        localStorage.setItem('preone_theme_mode', mode)
        document.documentElement.setAttribute('data-theme', mode)
        if (mode === 'dark' || mode === 'high-contrast-dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }, m.mode)
      await dPage.waitForTimeout(300)

      const desktopAuthFile = path.join(OUTPUT_DIR, `auth-desktop-${m.mode}-1440.png`)
      await dPage.screenshot({ path: desktopAuthFile, fullPage: false })
      console.log(`   ✓ Desktop Auth [${m.mode}] saved: ${desktopAuthFile}`)
      await desktopCtx.close()

      // Mobile Auth
      const mobileCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: m.dark ? 'dark' : 'light',
      })
      await mobileCtx.addCookies([
        { name: 'preone_theme_mode', value: m.mode, url: BASE_URL },
      ])
      const mPage = await mobileCtx.newPage()
      await mPage.goto(`${BASE_URL}`, { waitUntil: 'networkidle' })
      await mPage.evaluate((mode) => {
        localStorage.setItem('preone_theme_mode', mode)
        document.documentElement.setAttribute('data-theme', mode)
        if (mode === 'dark' || mode === 'high-contrast-dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }, m.mode)
      await mPage.waitForTimeout(300)

      const mobileAuthFile = path.join(OUTPUT_DIR, `auth-mobile-${m.mode}-390.png`)
      await mPage.screenshot({ path: mobileAuthFile, fullPage: false })
      console.log(`   ✓ Mobile Auth [${m.mode}] saved: ${mobileAuthFile}`)
      await mobileCtx.close()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. HOME LAUNCHER & WORKSPACE (DESKTOP & MOBILE) ACROSS ALL 4 MODES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📸 2. Capturing Home Launcher / App Shell in 4 Theme Modes...')

    for (const m of MODES) {
      // Desktop Launcher
      const desktopCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: m.dark ? 'dark' : 'light',
      })
      await desktopCtx.addCookies([
        { name: 'preone_theme_mode', value: m.mode, url: BASE_URL },
      ])
      const dPage = await desktopCtx.newPage()
      await dPage.goto(`${BASE_URL}/app/home`, { waitUntil: 'domcontentloaded' })
      await dPage.evaluate((mode) => {
        localStorage.setItem('preone_theme_mode', mode)
        document.documentElement.setAttribute('data-theme', mode)
        if (mode === 'dark' || mode === 'high-contrast-dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }, m.mode)
      await dPage.waitForTimeout(500)

      const desktopLauncherFile = path.join(OUTPUT_DIR, `launcher-desktop-${m.mode}-1440.png`)
      await dPage.screenshot({ path: desktopLauncherFile, fullPage: false })
      console.log(`   ✓ Desktop Launcher [${m.mode}] saved: ${desktopLauncherFile}`)
      await desktopCtx.close()

      // Mobile Launcher
      const mobileCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: m.dark ? 'dark' : 'light',
      })
      await mobileCtx.addCookies([
        { name: 'preone_theme_mode', value: m.mode, url: BASE_URL },
      ])
      const mPage = await mobileCtx.newPage()
      await mPage.goto(`${BASE_URL}/app/home`, { waitUntil: 'domcontentloaded' })
      await mPage.evaluate((mode) => {
        localStorage.setItem('preone_theme_mode', mode)
        document.documentElement.setAttribute('data-theme', mode)
        if (mode === 'dark' || mode === 'high-contrast-dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }, m.mode)
      await mPage.waitForTimeout(500)

      const mobileLauncherFile = path.join(OUTPUT_DIR, `launcher-mobile-${m.mode}-390.png`)
      await mPage.screenshot({ path: mobileLauncherFile, fullPage: false })
      console.log(`   ✓ Mobile Launcher [${m.mode}] saved: ${mobileLauncherFile}`)
      await mobileCtx.close()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. SETTINGS & FORM CONTROLS IN HIGH CONTRAST (FOCUS & INTERACTION)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📸 3. Capturing Settings Portal & Component States...')

    for (const m of ['high-contrast-light', 'high-contrast-dark'] as const) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: m === 'high-contrast-dark' ? 'dark' : 'light',
      })
      await ctx.addCookies([
        { name: 'preone_theme_mode', value: m, url: BASE_URL },
      ])
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}/app/settings`, { waitUntil: 'domcontentloaded' })
      await page.evaluate((mode) => {
        localStorage.setItem('preone_theme_mode', mode)
        document.documentElement.setAttribute('data-theme', mode)
        if (mode === 'dark' || mode === 'high-contrast-dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }, m)
      await page.waitForTimeout(500)

      const settingsFile = path.join(OUTPUT_DIR, `settings-desktop-${m}-1440.png`)
      await page.screenshot({ path: settingsFile, fullPage: false })
      console.log(`   ✓ Settings Screen [${m}] saved: ${settingsFile}`)
      await ctx.close()
    }

    console.log('\n========================================================================')
    console.log(' ALL SCREENSHOT CAPTURES COMPLETED SUCCESSFULLY')
    console.log('========================================================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Fatal error during screenshot capture:', err)
  process.exit(1)
})
