import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/theme-audit/t2')

async function run() {
  const browser = await chromium.launch({ headless: true })

  const routes = [
    { name: 'admin-dashboard', path: '/app/dashboard' },
    { name: 'teacher-attendance', path: '/app/attendance' },
    { name: 'parent-diary', path: '/app/daily-diary' },
  ]

  const modes = [
    { mode: 'high-contrast-light', dark: false },
    { mode: 'high-contrast-dark', dark: true },
  ] as const

  for (const r of routes) {
    for (const m of modes) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: m.dark ? 'dark' : 'light',
      })
      await ctx.addCookies([{ name: 'preone_theme_mode', value: m.mode, url: BASE_URL }])
      const page = await ctx.newPage()
      await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' })
      await page.evaluate((mode) => {
        localStorage.setItem('preone_theme_mode', mode)
        document.documentElement.setAttribute('data-theme', mode)
        if (mode === 'dark' || mode === 'high-contrast-dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }, m.mode)
      await page.waitForTimeout(400)

      const file = path.join(OUTPUT_DIR, `${r.name}-${m.mode}-1440.png`)
      await page.screenshot({ path: file, fullPage: false })
      console.log(`✓ Saved ${file}`)
      await ctx.close()
    }
  }

  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
