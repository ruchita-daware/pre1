import { describe, test, expect } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { MODULE_PASTEL_TOKENS, getModulePastelTokens } from '@/lib/modules'
import { PreschoolSideDecorations } from '@/components/home'

describe('PRE1-CLASSIC-PREMIUM-HOME-V1.0: Classic Premium Preschool Home Launcher Suite', () => {
  const globalsCss = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
  const homeClientSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/app/home/HomeClient.tsx'), 'utf-8')
  const sideDecorationsSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/home/PreschoolSideDecorations.tsx'),
    'utf-8'
  )

  describe('1. Module Pastel Identity Tokens Specification (Sections 09 & 11)', () => {
    test('verifies all 15 modules have the exact specified pastel and accent tokens', () => {
      // Dashboard
      expect(MODULE_PASTEL_TOKENS.dashboard.defaultBg).toBe('#FBFCFF')
      expect(MODULE_PASTEL_TOKENS.dashboard.hoverBg).toBe('#EAF1FD')
      expect(MODULE_PASTEL_TOKENS.dashboard.accent).toBe('#4385D8')
      expect(MODULE_PASTEL_TOKENS.dashboard.text).toBe('#2A67B5')

      // Setup
      expect(MODULE_PASTEL_TOKENS.setup.defaultBg).toBe('#FCFAFF')
      expect(MODULE_PASTEL_TOKENS.setup.hoverBg).toBe('#F1EAFE')
      expect(MODULE_PASTEL_TOKENS.setup.accent).toBe('#8661D2')
      expect(MODULE_PASTEL_TOKENS.setup.text).toBe('#6E48BD')

      // Users
      expect(MODULE_PASTEL_TOKENS.users.defaultBg).toBe('#FFFBFC')
      expect(MODULE_PASTEL_TOKENS.users.hoverBg).toBe('#FFEBF1')
      expect(MODULE_PASTEL_TOKENS.users.accent).toBe('#D56D91')
      expect(MODULE_PASTEL_TOKENS.users.text).toBe('#B94972')

      // Admissions
      expect(MODULE_PASTEL_TOKENS.admissions.defaultBg).toBe('#FAFDFB')
      expect(MODULE_PASTEL_TOKENS.admissions.hoverBg).toBe('#E8F8F0')
      expect(MODULE_PASTEL_TOKENS.admissions.accent).toBe('#35A879')
      expect(MODULE_PASTEL_TOKENS.admissions.text).toBe('#23875D')

      // Students
      expect(MODULE_PASTEL_TOKENS.students.defaultBg).toBe('#FFFBFC')
      expect(MODULE_PASTEL_TOKENS.students.hoverBg).toBe('#FFEBF1')
      expect(MODULE_PASTEL_TOKENS.students.accent).toBe('#D56D91')
      expect(MODULE_PASTEL_TOKENS.students.text).toBe('#B94972')

      // Daily Diary
      expect(MODULE_PASTEL_TOKENS['daily-diary'].defaultBg).toBe('#FAFDFF')
      expect(MODULE_PASTEL_TOKENS['daily-diary'].hoverBg).toBe('#E8F5FD')
      expect(MODULE_PASTEL_TOKENS['daily-diary'].accent).toBe('#439BCB')
      expect(MODULE_PASTEL_TOKENS['daily-diary'].text).toBe('#277FAA')

      // Finance & Fees
      expect(MODULE_PASTEL_TOKENS.finance.defaultBg).toBe('#FFFCF8')
      expect(MODULE_PASTEL_TOKENS.finance.hoverBg).toBe('#FFF2DF')
      expect(MODULE_PASTEL_TOKENS.finance.accent).toBe('#D99A3C')
      expect(MODULE_PASTEL_TOKENS.finance.text).toBe('#AD721C')

      expect(MODULE_PASTEL_TOKENS.fees.defaultBg).toBe('#FFFCF8')
      expect(MODULE_PASTEL_TOKENS.fees.hoverBg).toBe('#FFF2DF')
      expect(MODULE_PASTEL_TOKENS.fees.accent).toBe('#D99A3C')
      expect(MODULE_PASTEL_TOKENS.fees.text).toBe('#AD721C')

      // Transport
      expect(MODULE_PASTEL_TOKENS.transport.defaultBg).toBe('#F9FDFC')
      expect(MODULE_PASTEL_TOKENS.transport.hoverBg).toBe('#E7F7F4')
      expect(MODULE_PASTEL_TOKENS.transport.accent).toBe('#38A391')
      expect(MODULE_PASTEL_TOKENS.transport.text).toBe('#258575')

      // Inventory
      expect(MODULE_PASTEL_TOKENS.inventory.defaultBg).toBe('#FFFCF9')
      expect(MODULE_PASTEL_TOKENS.inventory.hoverBg).toBe('#FFF3E3')
      expect(MODULE_PASTEL_TOKENS.inventory.accent).toBe('#CA9145')
      expect(MODULE_PASTEL_TOKENS.inventory.text).toBe('#A46E26')

      // PreO Learning
      expect(MODULE_PASTEL_TOKENS.learning.defaultBg).toBe('#FFFBF9')
      expect(MODULE_PASTEL_TOKENS.learning.hoverBg).toBe('#FFF0E8')
      expect(MODULE_PASTEL_TOKENS.learning.accent).toBe('#E4815A')
      expect(MODULE_PASTEL_TOKENS.learning.text).toBe('#BA5D38')

      // HR & Workforce
      expect(MODULE_PASTEL_TOKENS.hr.defaultBg).toBe('#FCFBFF')
      expect(MODULE_PASTEL_TOKENS.hr.hoverBg).toBe('#F1ECFC')
      expect(MODULE_PASTEL_TOKENS.hr.accent).toBe('#896BC5')
      expect(MODULE_PASTEL_TOKENS.hr.text).toBe('#6F51AC')

      // Reports
      expect(MODULE_PASTEL_TOKENS.reports.defaultBg).toBe('#FBFCFF')
      expect(MODULE_PASTEL_TOKENS.reports.hoverBg).toBe('#EAF1FD')
      expect(MODULE_PASTEL_TOKENS.reports.accent).toBe('#5486D0')
      expect(MODULE_PASTEL_TOKENS.reports.text).toBe('#3567B1')

      // Announcements / Communication
      expect(MODULE_PASTEL_TOKENS.communication.defaultBg).toBe('#FFFBFC')
      expect(MODULE_PASTEL_TOKENS.communication.hoverBg).toBe('#FFEBF1')
      expect(MODULE_PASTEL_TOKENS.communication.accent).toBe('#D56D91')
      expect(MODULE_PASTEL_TOKENS.communication.text).toBe('#B94972')

      // Settings
      expect(MODULE_PASTEL_TOKENS.settings.defaultBg).toBe('#FBFCFD')
      expect(MODULE_PASTEL_TOKENS.settings.hoverBg).toBe('#EBF0F6')
      expect(MODULE_PASTEL_TOKENS.settings.accent).toBe('#75869F')
      expect(MODULE_PASTEL_TOKENS.settings.text).toBe('#55667E')

      // Audit Logs
      expect(MODULE_PASTEL_TOKENS.audit.defaultBg).toBe('#FCFBFF')
      expect(MODULE_PASTEL_TOKENS.audit.hoverBg).toBe('#F0EBFC')
      expect(MODULE_PASTEL_TOKENS.audit.accent).toBe('#7866C2')
      expect(MODULE_PASTEL_TOKENS.audit.text).toBe('#5F4CAE')
    })

    test('verifies getModulePastelTokens resolves correctly with fallback safety', () => {
      const dashboard = getModulePastelTokens('dashboard')
      expect(dashboard.defaultBg).toBe('#FBFCFF')
      expect(dashboard.accent).toBe('#4385D8')

      const unknown = getModulePastelTokens('unknown-module-xyz')
      expect(unknown).toBeDefined()
      expect(unknown.accent).toBeDefined()
    })

    test('verifies CSS variables match exact module token values in globals.css', () => {
      expect(globalsCss).toContain('--mod-dashboard-bg: #FBFCFF;')
      expect(globalsCss).toContain('--mod-dashboard-hover-bg: #EAF1FD;')
      expect(globalsCss).toContain('--mod-dashboard-accent: #4385D8;')
      expect(globalsCss).toContain('--mod-dashboard-text: #2A67B5;')

      expect(globalsCss).toContain('--mod-setup-bg: #FCFAFF;')
      expect(globalsCss).toContain('--mod-setup-hover-bg: #F1EAFE;')
      expect(globalsCss).toContain('--mod-setup-accent: #8661D2;')

      expect(globalsCss).toContain('--mod-admissions-bg: #FAFDFB;')
      expect(globalsCss).toContain('--mod-admissions-hover-bg: #E8F8F0;')
      expect(globalsCss).toContain('--mod-admissions-accent: #35A879;')

      expect(globalsCss).toContain('--mod-finance-bg: #FFFCF8;')
      expect(globalsCss).toContain('--mod-finance-hover-bg: #FFF2DF;')
      expect(globalsCss).toContain('--mod-finance-accent: #D99A3C;')

      expect(globalsCss).toContain('--mod-transport-bg: #F9FDFC;')
      expect(globalsCss).toContain('--mod-transport-hover-bg: #E7F7F4;')
      expect(globalsCss).toContain('--mod-transport-accent: #38A391;')

      expect(globalsCss).toContain('--mod-learning-bg: #FFFBF9;')
      expect(globalsCss).toContain('--mod-learning-hover-bg: #FFF0E8;')
      expect(globalsCss).toContain('--mod-learning-accent: #E4815A;')

      expect(globalsCss).toContain('--mod-hr-bg: #FCFBFF;')
      expect(globalsCss).toContain('--mod-hr-hover-bg: #F1ECFC;')
      expect(globalsCss).toContain('--mod-hr-accent: #896BC5;')
    })
  })

  describe('2. Preschool Side Decorations Architecture (Section 05)', () => {
    test('verifies PreschoolSideDecorations component is exported and callable', () => {
      expect(typeof PreschoolSideDecorations).toBe('function')
    })

    test('verifies side decorations contain all 4 perimeter illustrations', () => {
      // 1. Upper-Left: Hot-Air Balloon with children
      expect(sideDecorationsSrc).toContain('UPPER-LEFT: Hot-Air Balloon')
      expect(sideDecorationsSrc).toContain('balloonLilac')
      expect(sideDecorationsSrc).toContain('basketWood')

      // 2. Upper-Right: Rainbow & Clouds
      expect(sideDecorationsSrc).toContain('UPPER-RIGHT: Soft Pastel Rainbow')
      expect(sideDecorationsSrc).toContain('#FDA4AF') // Arc 1: coral
      expect(sideDecorationsSrc).toContain('#FDE68A') // Arc 2: butter
      expect(sideDecorationsSrc).toContain('#A7F3D0') // Arc 3: mint
      expect(sideDecorationsSrc).toContain('#BAE6FD') // Arc 4: blue
      expect(sideDecorationsSrc).toContain('#DDD6FE') // Arc 5: lavender

      // 3. Lower-Left: Garden Foliage & Flowers
      expect(sideDecorationsSrc).toContain('LOWER-LEFT: Gentle Garden Foliage')
      expect(sideDecorationsSrc).toContain('flowerRose')
      expect(sideDecorationsSrc).toContain('flowerLavender')

      // 4. Lower-Right: Preschool Schoolhouse
      expect(sideDecorationsSrc).toContain('LOWER-RIGHT: Preschool Schoolhouse')
      expect(sideDecorationsSrc).toContain('schoolWall')
      expect(sideDecorationsSrc).toContain('roofCoral')
      expect(sideDecorationsSrc).toContain('hillGreen')
      expect(sideDecorationsSrc).toContain('pathGold')
    })

    test('verifies side decorations have pointer-events-none & select-none to protect card interactions', () => {
      expect(sideDecorationsSrc).toContain('pointer-events-none')
      expect(sideDecorationsSrc).toContain('select-none')
      expect(sideDecorationsSrc).toContain('aria-hidden="true"')
    })

    test('verifies HomeClient mounts PreschoolSideDecorations', () => {
      expect(homeClientSrc).toContain("import { PreschoolSideDecorations } from '@/components/home'")
      expect(homeClientSrc).toContain('<PreschoolSideDecorations />')
    })
  })

  describe('3. Ambient Canvas Atmosphere & Lavender Wash (Section 03 & 04)', () => {
    test('verifies --brand-ambient-wash includes the 4 perimeter radial lavender gradients', () => {
      expect(globalsCss).toContain('radial-gradient(ellipse at 50% 8%, rgba(224, 211, 255, 0.32), transparent 38%)')
      expect(globalsCss).toContain('radial-gradient(ellipse at 92% 12%, rgba(230, 218, 255, 0.25), transparent 30%)')
      expect(globalsCss).toContain('radial-gradient(ellipse at 0% 72%, rgba(229, 219, 255, 0.22), transparent 34%)')
      expect(globalsCss).toContain('radial-gradient(ellipse at 100% 85%, rgba(221, 232, 255, 0.20), transparent 32%)')
    })
  })

  describe('4. Preschool Hero & Context Bar Architecture (Section 06)', () => {
    test('verifies .home-context-bar has pill shape, translucent surface, and lavender border', () => {
      expect(globalsCss).toContain('.home-context-bar')
      expect(globalsCss).toContain('border: 1px solid rgba(215, 204, 250, 0.70);')
      expect(globalsCss).toContain('box-shadow: 0 4px 16px -2px rgba(124, 58, 237, 0.08)')
    })

    test('verifies .home-tenant-dot has active pulse animation', () => {
      expect(globalsCss).toContain('.home-tenant-dot')
      expect(globalsCss).toContain('animation: preonePulsingDot 2s ease-in-out infinite;')
      expect(globalsCss).toContain('@keyframes preonePulsingDot')
    })

    test('verifies HomeClient renders school title, tenant badge, and greeting', () => {
      expect(homeClientSrc).toContain('data-testid="home-school-title"')
      expect(homeClientSrc).toContain('data-testid="home-tenant-badge"')
      expect(homeClientSrc).toContain('home-greeting')
    })
  })

  describe('5. Responsive Module Grid & Card Dimensions (Section 07 & 09)', () => {
    test('verifies desktop module grid is 6 columns', () => {
      expect(globalsCss).toContain('.module-grid{')
      expect(globalsCss).toContain('grid-template-columns:repeat(6,minmax(0,1fr));')
    })

    test('verifies tablet module grid is 4 columns', () => {
      expect(globalsCss).toContain('grid-template-columns:repeat(4,minmax(0,1fr));')
    })

    test('verifies mobile module grid is 2 columns', () => {
      expect(globalsCss).toContain('grid-template-columns:repeat(2,minmax(0,1fr));')
    })

    test('verifies .module-card dimensions, top specular highlight, and 3px lift hover', () => {
      expect(globalsCss).toContain('border-radius: 20px;')
      expect(globalsCss).toContain('box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.95)')
      expect(globalsCss).toContain('transform: translateY(-3px) !important;')
    })
  })

  // ── 6. Module Bottom Accent Line Specification (PRE1-HOME-FINAL-AUDIT-003) ──
  describe('6. Module Card Bottom Accent Line Architecture (PRE1-HOME-FINAL-AUDIT-003)', () => {
    const moduleCardSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/components/preone/ModuleCard.tsx'),
      'utf-8'
    )

    test('verifies ModuleCard renders dedicated .module-card-accent-line element with pointer-events-none', () => {
      expect(moduleCardSrc).toContain('className="module-card-accent-line"')
      expect(moduleCardSrc).toContain('aria-hidden="true"')
    })

    test('verifies .module-card-accent-line default 2px thin line height, 40% width capsule, and centered alignment', () => {
      expect(globalsCss).toContain('.module-card-accent-line {')
      expect(globalsCss).toContain('height: 2px;')
      expect(globalsCss).toContain('width: 40%;')
      expect(globalsCss).toContain('left: 50%;')
      expect(globalsCss).toContain('transform: translateX(-50%);')
      expect(globalsCss).toContain('border-radius: 999px;')
      expect(globalsCss).toContain('background-color: var(--module-accent, #7c3aed);')
      expect(globalsCss).toContain('opacity: 0.85;')
      expect(globalsCss).toContain('pointer-events: none;')
    })

    test('verifies .module-card-accent-line expands to 100% on hover and focus-visible with smooth transition', () => {
      expect(globalsCss).toContain('.module-card:hover .module-card-accent-line {')
      expect(globalsCss).toContain('.module-card:focus-visible .module-card-accent-line {')
      expect(globalsCss).toContain('width: 100%;')
      expect(globalsCss).toContain('opacity: 1;')
      expect(globalsCss).toContain('transition: width 250ms')
    })

    test('verifies prefers-reduced-motion disables accent line transitions', () => {
      expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)')
      expect(globalsCss).toContain('.module-card-accent-line {')
      expect(globalsCss).toContain('transition: none !important;')
    })
  })

  // ── 7. 15-Module 3D Icon Asset & PreO Learning Audit (PRE1-HOME-FINAL-AUDIT-003) ──
  describe('7. 15-Module 3D Icon Asset & PreO Learning Audit', () => {
    const modulesSrc = fs.readFileSync(path.join(process.cwd(), 'src/lib/modules.ts'), 'utf-8')
    const bottomNavSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/components/shell/BottomNav.tsx'),
      'utf-8'
    )

    const expected15Assets = [
      'dashboard.webp',
      'setup.webp',
      'users.webp',
      'admissions.webp',
      'students.webp',
      'daily_diary.webp',
      'fees.webp',
      'transport.webp',
      'inventory.webp',
      'preo_learning.webp',
      'hr_workforce.webp',
      'reports_analytics.webp',
      'announcements.webp',
      'settings.webp',
      'audit_logs.webp',
    ]

    test('verifies all 15 module WebP illustrations physically exist on disk in /public/animations/home/', () => {
      expected15Assets.forEach((file) => {
        const filePath = path.join(process.cwd(), 'public/animations/home', file)
        expect(fs.existsSync(filePath)).toBe(true)
        const stat = fs.statSync(filePath)
        expect(stat.size).toBeGreaterThan(10000)
      })
    })

    test('verifies PreO Learning canonical asset is /animations/home/preo_learning.json (transparent 3D mascot)', () => {
      expect(modulesSrc).toContain("animation: '/animations/home/preo_learning.json'")
      expect(modulesSrc).not.toContain("animation: '/animations/home/preo_learning_mascot.json'")
    })

    test('verifies Bottom Navigation dock uses canonical /animations/home/preo_learning.webp', () => {
      expect(bottomNavSrc).toContain("image: '/animations/home/preo_learning.webp'")
      expect(bottomNavSrc).not.toContain("image: '/animations/home/preo_learning_mascot.webp'")
    })
  })

  // ── 8. Midnight Pearl Dark Edition Specification (PRE1-DARK-PREMIUM-REFINEMENT-001) ──
  describe('8. Midnight Pearl Dark Edition Architecture', () => {
    test('verifies dedicated dark theme token architecture in globals.css', () => {
      expect(globalsCss).toContain('--page-background: #131626;')
      expect(globalsCss).toContain('--page-background-secondary: #171B2D;')
      expect(globalsCss).toContain('--surface-card: #20263A;')
      expect(globalsCss).toContain('--surface-card-elevated: #272E45;')
      expect(globalsCss).toContain('--border-subtle: #343D56;')
      expect(globalsCss).toContain('--text-primary: #F4F3FF;')
      expect(globalsCss).toContain('--brand-primary: #B69AFF;')
    })

    test('verifies all 15 module dark surfaces match Section 4 specification in modules.ts', () => {
      expect(MODULE_PASTEL_TOKENS.dashboard.darkBg).toBe('#202C45')
      expect(MODULE_PASTEL_TOKENS.dashboard.darkAccent).toBe('#70A7FF')

      expect(MODULE_PASTEL_TOKENS.setup.darkBg).toBe('#2A2342')
      expect(MODULE_PASTEL_TOKENS.setup.darkAccent).toBe('#B69AFF')

      expect(MODULE_PASTEL_TOKENS.users.darkBg).toBe('#392333')
      expect(MODULE_PASTEL_TOKENS.users.darkAccent).toBe('#F28AB0')

      expect(MODULE_PASTEL_TOKENS.admissions.darkBg).toBe('#1E352F')
      expect(MODULE_PASTEL_TOKENS.admissions.darkAccent).toBe('#68D6A2')

      expect(MODULE_PASTEL_TOKENS.students.darkBg).toBe('#392333')
      expect(MODULE_PASTEL_TOKENS.students.darkAccent).toBe('#F28AB0')

      expect(MODULE_PASTEL_TOKENS['daily-diary'].darkBg).toBe('#1E3342')
      expect(MODULE_PASTEL_TOKENS['daily-diary'].darkAccent).toBe('#72C9F0')

      expect(MODULE_PASTEL_TOKENS.finance.darkBg).toBe('#3B3022')
      expect(MODULE_PASTEL_TOKENS.finance.darkAccent).toBe('#F4BC69')

      expect(MODULE_PASTEL_TOKENS.transport.darkBg).toBe('#1D3637')
      expect(MODULE_PASTEL_TOKENS.transport.darkAccent).toBe('#69D4C4')

      expect(MODULE_PASTEL_TOKENS.inventory.darkBg).toBe('#37302A')
      expect(MODULE_PASTEL_TOKENS.inventory.darkAccent).toBe('#E6B36F')

      expect(MODULE_PASTEL_TOKENS.learning.darkBg).toBe('#3A292B')
      expect(MODULE_PASTEL_TOKENS.learning.darkAccent).toBe('#F29B7D')

      expect(MODULE_PASTEL_TOKENS.hr.darkBg).toBe('#302844')
      expect(MODULE_PASTEL_TOKENS.hr.darkAccent).toBe('#BBA3F2')

      expect(MODULE_PASTEL_TOKENS.reports.darkBg).toBe('#202E43')
      expect(MODULE_PASTEL_TOKENS.reports.darkAccent).toBe('#80B6F4')

      expect(MODULE_PASTEL_TOKENS.communication.darkBg).toBe('#3B2634')
      expect(MODULE_PASTEL_TOKENS.communication.darkAccent).toBe('#F18AB5')

      expect(MODULE_PASTEL_TOKENS.settings.darkBg).toBe('#293144')
      expect(MODULE_PASTEL_TOKENS.settings.darkAccent).toBe('#A8B7CF')

      expect(MODULE_PASTEL_TOKENS.audit.darkBg).toBe('#302A46')
      expect(MODULE_PASTEL_TOKENS.audit.darkAccent).toBe('#B7A5F5')
    })

    test('verifies dark mode module card titles have high contrast #F4F3FF', () => {
      expect(globalsCss).toContain('[data-theme="dark"] .module-card .module-card-title,')
      expect(globalsCss).toContain('color: #F4F3FF !important;')
    })

    test('verifies dark toolbar, context bar, and dock styling in globals.css', () => {
      expect(globalsCss).toContain('[data-theme="dark"] .workspace-header,')
      expect(globalsCss).toContain('background: rgba(27, 32, 51, 0.94) !important;')
      expect(globalsCss).toContain('[data-theme="dark"] .home-context-bar,')
      expect(globalsCss).toContain('background: rgba(32, 38, 58, 0.85);')
      expect(globalsCss).toContain('[data-theme="dark"] .taskbar.preone-dock,')
      expect(globalsCss).toContain('background: rgba(27, 32, 51, 0.96) !important;')
    })
  })
})
