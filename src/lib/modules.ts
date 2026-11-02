import { navForRole, type NavItem } from './nav'
import type { Role } from './auth'
import { can } from './auth'

export type TileSize = 'sm' | 'md' | 'lg'
export type SemanticTheme = 'lavender' | 'blue' | 'teal' | 'orange' | 'pink' | 'green' | 'purple'

export interface QuickAction {
  label: string
  href: string
  perm?: string
}

export interface ModuleMeta {
  description: string
  tileSize: TileSize
  semanticTheme?: SemanticTheme
  quickActions?: QuickAction[]
  animation?: string
}

export interface SemanticThemeTokens {
  iconBg: string
  iconColor: string
  iconBorder: string
  hoverBorder: string
  accentGlow: string
}

export interface ModulePastelIdentity {
  defaultBg: string
  hoverBg: string
  accent: string
  text: string
  bg: string
  titleText: string
  darkBg: string
  darkHoverBg: string
  darkAccent: string
  darkTitleText: string
}

export interface HomeModule extends NavItem {
  description: string
  tileSize: TileSize
  semanticTheme: SemanticTheme
  quickActions: QuickAction[]
  animation?: string
  pastelIdentity?: ModulePastelIdentity
}

/**
 * PreOne Soft Pastel Module Identity Tokens (Phase 2 & 3 - Color Enforcement)
 *
 * Each primary module has:
 * - A visible light pastel default background in resting state (defaultBg)
 * - A distinctly stronger pastel background on hover/interaction (hoverBg)
 * - A dedicated module accent color for border, halo & focus (accent)
 * - A WCAG-compliant high-contrast title color (text)
 */
export const MODULE_PASTEL_TOKENS: Record<string, ModulePastelIdentity> = {
  dashboard: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#4385D8',
    text: '#2A67B5',
    bg: '#FBFCFF',
    titleText: '#2A67B5',
    darkBg: 'rgba(67, 133, 216, 0.16)',
    darkHoverBg: 'rgba(67, 133, 216, 0.28)',
    darkAccent: '#60A5FA',
    darkTitleText: '#93C5FD',
  },
  setup: {
    defaultBg: '#FCFAFF',
    hoverBg: '#F1EAFE',
    accent: '#8661D2',
    text: '#6E48BD',
    bg: '#FCFAFF',
    titleText: '#6E48BD',
    darkBg: 'rgba(134, 97, 210, 0.16)',
    darkHoverBg: 'rgba(134, 97, 210, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#DDD6FE',
  },
  users: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: 'rgba(213, 109, 145, 0.16)',
    darkHoverBg: 'rgba(213, 109, 145, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  admissions: {
    defaultBg: '#FAFDFB',
    hoverBg: '#E8F8F0',
    accent: '#35A879',
    text: '#23875D',
    bg: '#FAFDFB',
    titleText: '#23875D',
    darkBg: 'rgba(53, 168, 121, 0.16)',
    darkHoverBg: 'rgba(53, 168, 121, 0.28)',
    darkAccent: '#34D399',
    darkTitleText: '#A7F3D0',
  },
  students: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: 'rgba(213, 109, 145, 0.16)',
    darkHoverBg: 'rgba(213, 109, 145, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  'daily-diary': {
    defaultBg: '#FAFDFF',
    hoverBg: '#E8F5FD',
    accent: '#439BCB',
    text: '#277FAA',
    bg: '#FAFDFF',
    titleText: '#277FAA',
    darkBg: 'rgba(67, 155, 203, 0.16)',
    darkHoverBg: 'rgba(67, 155, 203, 0.28)',
    darkAccent: '#38BDF8',
    darkTitleText: '#BAE6FD',
  },
  finance: {
    defaultBg: '#FFFCF8',
    hoverBg: '#FFF2DF',
    accent: '#D99A3C',
    text: '#AD721C',
    bg: '#FFFCF8',
    titleText: '#AD721C',
    darkBg: 'rgba(217, 154, 60, 0.16)',
    darkHoverBg: 'rgba(217, 154, 60, 0.28)',
    darkAccent: '#FBBF24',
    darkTitleText: '#FDE68A',
  },
  fees: {
    defaultBg: '#FFFCF8',
    hoverBg: '#FFF2DF',
    accent: '#D99A3C',
    text: '#AD721C',
    bg: '#FFFCF8',
    titleText: '#AD721C',
    darkBg: 'rgba(217, 154, 60, 0.16)',
    darkHoverBg: 'rgba(217, 154, 60, 0.28)',
    darkAccent: '#FBBF24',
    darkTitleText: '#FDE68A',
  },
  transport: {
    defaultBg: '#F9FDFC',
    hoverBg: '#E7F7F4',
    accent: '#38A391',
    text: '#258575',
    bg: '#F9FDFC',
    titleText: '#258575',
    darkBg: 'rgba(56, 163, 145, 0.16)',
    darkHoverBg: 'rgba(56, 163, 145, 0.28)',
    darkAccent: '#2DD4BF',
    darkTitleText: '#99F6E4',
  },
  inventory: {
    defaultBg: '#FFFCF9',
    hoverBg: '#FFF3E3',
    accent: '#CA9145',
    text: '#A46E26',
    bg: '#FFFCF9',
    titleText: '#A46E26',
    darkBg: 'rgba(202, 145, 69, 0.16)',
    darkHoverBg: 'rgba(202, 145, 69, 0.28)',
    darkAccent: '#FBBF24',
    darkTitleText: '#FDE68A',
  },
  learning: {
    defaultBg: '#FFFBF9',
    hoverBg: '#FFF0E8',
    accent: '#E4815A',
    text: '#BA5D38',
    bg: '#FFFBF9',
    titleText: '#BA5D38',
    darkBg: 'rgba(228, 129, 90, 0.16)',
    darkHoverBg: 'rgba(228, 129, 90, 0.28)',
    darkAccent: '#FB923C',
    darkTitleText: '#FED7AA',
  },
  'preo-learning': {
    defaultBg: '#FFFBF9',
    hoverBg: '#FFF0E8',
    accent: '#E4815A',
    text: '#BA5D38',
    bg: '#FFFBF9',
    titleText: '#BA5D38',
    darkBg: 'rgba(228, 129, 90, 0.16)',
    darkHoverBg: 'rgba(228, 129, 90, 0.28)',
    darkAccent: '#FB923C',
    darkTitleText: '#FED7AA',
  },
  preo_learning: {
    defaultBg: '#FFFBF9',
    hoverBg: '#FFF0E8',
    accent: '#E4815A',
    text: '#BA5D38',
    bg: '#FFFBF9',
    titleText: '#BA5D38',
    darkBg: 'rgba(228, 129, 90, 0.16)',
    darkHoverBg: 'rgba(228, 129, 90, 0.28)',
    darkAccent: '#FB923C',
    darkTitleText: '#FED7AA',
  },
  hr: {
    defaultBg: '#FCFBFF',
    hoverBg: '#F1ECFC',
    accent: '#896BC5',
    text: '#6F51AC',
    bg: '#FCFBFF',
    titleText: '#6F51AC',
    darkBg: 'rgba(137, 107, 197, 0.16)',
    darkHoverBg: 'rgba(137, 107, 197, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#DDD6FE',
  },
  reports: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#5486D0',
    text: '#3567B1',
    bg: '#FBFCFF',
    titleText: '#3567B1',
    darkBg: 'rgba(84, 134, 208, 0.16)',
    darkHoverBg: 'rgba(84, 134, 208, 0.28)',
    darkAccent: '#60A5FA',
    darkTitleText: '#93C5FD',
  },
  reports_analytics: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#5486D0',
    text: '#3567B1',
    bg: '#FBFCFF',
    titleText: '#3567B1',
    darkBg: 'rgba(84, 134, 208, 0.16)',
    darkHoverBg: 'rgba(84, 134, 208, 0.28)',
    darkAccent: '#60A5FA',
    darkTitleText: '#93C5FD',
  },
  communication: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: 'rgba(213, 109, 145, 0.16)',
    darkHoverBg: 'rgba(213, 109, 145, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  announcements: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: 'rgba(213, 109, 145, 0.16)',
    darkHoverBg: 'rgba(213, 109, 145, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  settings: {
    defaultBg: '#FBFCFD',
    hoverBg: '#EBF0F6',
    accent: '#75869F',
    text: '#55667E',
    bg: '#FBFCFD',
    titleText: '#55667E',
    darkBg: 'rgba(117, 134, 159, 0.18)',
    darkHoverBg: 'rgba(117, 134, 159, 0.30)',
    darkAccent: '#94A3B8',
    darkTitleText: '#CBD5E1',
  },
  audit: {
    defaultBg: '#FCFBFF',
    hoverBg: '#F0EBFC',
    accent: '#7866C2',
    text: '#5F4CAE',
    bg: '#FCFBFF',
    titleText: '#5F4CAE',
    darkBg: 'rgba(120, 102, 194, 0.16)',
    darkHoverBg: 'rgba(120, 102, 194, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#C4B5FD',
  },
  audit_logs: {
    defaultBg: '#FCFBFF',
    hoverBg: '#F0EBFC',
    accent: '#7866C2',
    text: '#5F4CAE',
    bg: '#FCFBFF',
    titleText: '#5F4CAE',
    darkBg: 'rgba(120, 102, 194, 0.16)',
    darkHoverBg: 'rgba(120, 102, 194, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#C4B5FD',
  },
  platform: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#4385D8',
    text: '#2A67B5',
    bg: '#FBFCFF',
    titleText: '#2A67B5',
    darkBg: 'rgba(67, 133, 216, 0.16)',
    darkHoverBg: 'rgba(67, 133, 216, 0.28)',
    darkAccent: '#60A5FA',
    darkTitleText: '#93C5FD',
  },
}

export function getModulePastelTokens(key: string): ModulePastelIdentity {
  const normalizedKey = key.toLowerCase().replace(/_/g, '-')
  return (
    MODULE_PASTEL_TOKENS[normalizedKey] ||
    MODULE_PASTEL_TOKENS[key] || {
      defaultBg: '#F1F6FF',
      hoverBg: '#E3EEFF',
      accent: '#3977D5',
      text: '#346DC4',
      bg: '#F1F6FF',
      titleText: '#346DC4',
      darkBg: 'rgba(57, 119, 213, 0.16)',
      darkHoverBg: 'rgba(57, 119, 213, 0.28)',
      darkAccent: '#60A5FA',
      darkTitleText: '#93C5FD',
    }
  )
}

export const SEMANTIC_THEME_TOKENS: Record<SemanticTheme, SemanticThemeTokens> = {
  lavender: {
    iconBg: 'var(--primary-light, #F3EEFF)',
    iconColor: 'var(--primary, #7C3AED)',
    iconBorder: 'color-mix(in srgb, var(--primary, #7C3AED) 20%, transparent)',
    hoverBorder: 'var(--primary, #7C3AED)',
    accentGlow: 'color-mix(in srgb, var(--primary, #7C3AED) 8%, transparent)',
  },
  blue: {
    iconBg: 'var(--info-soft, #EBF5FF)',
    iconColor: 'var(--info, #2563EB)',
    iconBorder: 'color-mix(in srgb, var(--info, #2563EB) 20%, transparent)',
    hoverBorder: 'var(--info, #2563EB)',
    accentGlow: 'color-mix(in srgb, var(--info, #2563EB) 8%, transparent)',
  },
  teal: {
    iconBg: 'var(--secondary-light, #E6FFFA)',
    iconColor: 'var(--secondary, #0D9488)',
    iconBorder: 'color-mix(in srgb, var(--secondary, #0D9488) 20%, transparent)',
    hoverBorder: 'var(--secondary, #0D9488)',
    accentGlow: 'color-mix(in srgb, var(--secondary, #0D9488) 8%, transparent)',
  },
  orange: {
    iconBg: 'var(--accent-light, #FFF7ED)',
    iconColor: 'var(--warning, #D97706)',
    iconBorder: 'color-mix(in srgb, var(--warning, #D97706) 20%, transparent)',
    hoverBorder: 'var(--warning, #D97706)',
    accentGlow: 'color-mix(in srgb, var(--warning, #D97706) 8%, transparent)',
  },
  pink: {
    iconBg: 'var(--pink-soft, #FDF2F8)',
    iconColor: 'var(--pink, #DB2777)',
    iconBorder: 'color-mix(in srgb, var(--pink, #DB2777) 20%, transparent)',
    hoverBorder: 'var(--pink, #DB2777)',
    accentGlow: 'color-mix(in srgb, var(--pink, #DB2777) 8%, transparent)',
  },
  green: {
    iconBg: 'var(--success-soft, #ECFDF5)',
    iconColor: 'var(--success, #16A34A)',
    iconBorder: 'color-mix(in srgb, var(--success, #16A34A) 20%, transparent)',
    hoverBorder: 'var(--success, #16A34A)',
    accentGlow: 'color-mix(in srgb, var(--success, #16A34A) 8%, transparent)',
  },
  purple: {
    iconBg: 'var(--primary-soft, #EDE9FE)',
    iconColor: 'var(--primary, #7C3AED)',
    iconBorder: 'color-mix(in srgb, var(--primary, #7C3AED) 20%, transparent)',
    hoverBorder: 'var(--primary, #7C3AED)',
    accentGlow: 'color-mix(in srgb, var(--primary, #7C3AED) 8%, transparent)',
  },
}

const DEFAULT_META: ModuleMeta = {
  description: '',
  tileSize: 'sm',
  semanticTheme: 'lavender',
}

export const MODULE_META: Record<string, ModuleMeta> = {
  home: {
    description: 'Your control center',
    tileSize: 'md',
    semanticTheme: 'lavender',
  },
  dashboard: {
    description: 'Insights at a glance',
    tileSize: 'lg',
    semanticTheme: 'blue',
    animation: '/animations/home/dashboard.json',
  },
  'daily-diary': {
    description: 'Timetable, activities & attendance',
    tileSize: 'lg',
    semanticTheme: 'teal',
    animation: '/animations/home/daily_diary.json',
    quickActions: [
      { label: "Today's Schedule", href: '/app/daily-diary', perm: 'attendance:read' },
      { label: 'Mark Attendance', href: '/app/daily-diary?tab=attendance', perm: 'attendance:mark' },
      { label: 'Add Activity', href: '/app/daily-diary?tab=activities', perm: 'academics:write' },
    ],
  },
  users: {
    description: 'Manage access & roles',
    tileSize: 'md',
    semanticTheme: 'teal',
    animation: '/animations/home/users.json',
    quickActions: [{ label: 'Add user', href: '/app/users', perm: 'users:write' }],
  },
  hr: {
    description: 'Staff, leaves & payroll',
    tileSize: 'md',
    semanticTheme: 'orange',
    animation: '/animations/home/hr_workforce.json',
  },
  setup: {
    description: 'School configuration & classrooms',
    tileSize: 'md',
    semanticTheme: 'lavender',
    animation: '/animations/home/setup.json',
    quickActions: [
      { label: 'Classrooms', href: '/app/setup/classroom', perm: 'settings:read' },
      { label: 'School Profile', href: '/app/setup/school_profile', perm: 'settings:read' },
    ],
  },
  admissions: {
    description: 'Inquiries & enrollments',
    tileSize: 'lg',
    semanticTheme: 'pink',
    animation: '/animations/home/admissions.json',
    quickActions: [
      { label: 'Record enquiry', href: '/app/admissions', perm: 'admissions:write' },
      { label: 'New application', href: '/app/admissions', perm: 'admissions:write' },
    ],
  },
  students: {
    description: 'Student records & profiles',
    tileSize: 'lg',
    semanticTheme: 'green',
    animation: '/animations/home/students.json',
    quickActions: [{ label: 'Add student', href: '/app/students', perm: 'students:write' }],
  },
  learning: {
    description: 'Early childhood curriculum & activities',
    tileSize: 'lg',
    semanticTheme: 'lavender',
    animation: '/animations/home/preo_learning_mascot.json',
    quickActions: [{ label: 'Open workspace', href: '/app/learning' }],
  },
  'preo-learning': {
    description: 'Early childhood curriculum & activities',
    tileSize: 'lg',
    semanticTheme: 'lavender',
    animation: '/animations/home/preo_learning_mascot.json',
    quickActions: [{ label: 'Open workspace', href: '/app/learning' }],
  },
  preo_learning: {
    description: 'Early childhood curriculum & activities',
    tileSize: 'lg',
    semanticTheme: 'lavender',
    animation: '/animations/home/preo_learning_mascot.json',
    quickActions: [{ label: 'Open workspace', href: '/app/learning' }],
  },
  transport: {
    description: 'Routes & vehicle tracking',
    tileSize: 'lg',
    semanticTheme: 'blue',
    animation: '/animations/home/transport.json',
    quickActions: [
      { label: "Today's trips", href: '/app/transport?tab=trips', perm: 'transport:trip' },
      { label: 'Assign student', href: '/app/transport?tab=students', perm: 'transport:assign' },
    ],
  },
  inventory: {
    description: 'Supplies & assets',
    tileSize: 'lg',
    semanticTheme: 'orange',
    animation: '/animations/home/inventory.json',
    quickActions: [
      { label: 'Request materials', href: '/app/inventory?tab=requests', perm: 'inventory:request' },
      { label: 'Receive stock', href: '/app/inventory?tab=grn', perm: 'inventory:receive' },
    ],
  },
  finance: {
    description: 'Billing & payments',
    tileSize: 'lg',
    semanticTheme: 'green',
    animation: '/animations/home/fees.json',
    quickActions: [{ label: 'Create invoice', href: '/app/finance', perm: 'finance:write' }],
  },
  fees: {
    description: 'Billing & payments',
    tileSize: 'lg',
    semanticTheme: 'green',
    animation: '/animations/home/fees.json',
    quickActions: [{ label: 'Create invoice', href: '/app/finance', perm: 'finance:write' }],
  },
  reports: {
    description: 'Data-driven insights',
    tileSize: 'lg',
    semanticTheme: 'purple',
    animation: '/animations/home/reports_analytics.json',
    quickActions: [
      { label: 'Executive MIS', href: '/app/reports?tab=executive', perm: 'reports:read' },
      { label: 'Custom Builder', href: '/app/reports?tab=custom', perm: 'reports:custom' },
    ],
  },
  reports_analytics: {
    description: 'Data-driven insights',
    tileSize: 'lg',
    semanticTheme: 'purple',
    animation: '/animations/home/reports_analytics.json',
    quickActions: [
      { label: 'Executive MIS', href: '/app/reports?tab=executive', perm: 'reports:read' },
      { label: 'Custom Builder', href: '/app/reports?tab=custom', perm: 'reports:custom' },
    ],
  },
  communication: {
    description: 'Communicate with your community',
    tileSize: 'md',
    semanticTheme: 'pink',
    animation: '/animations/home/announcements.json',
    quickActions: [{ label: 'Send announcement', href: '/app/communication', perm: 'communication:write' }],
  },
  announcements: {
    description: 'Communicate with your community',
    tileSize: 'md',
    semanticTheme: 'pink',
    animation: '/animations/home/announcements.json',
    quickActions: [{ label: 'Send announcement', href: '/app/communication', perm: 'communication:write' }],
  },
  settings: {
    description: 'System preferences',
    tileSize: 'sm',
    semanticTheme: 'blue',
    animation: '/animations/home/settings.json',
  },
  audit: {
    description: 'Track system activities',
    tileSize: 'sm',
    semanticTheme: 'orange',
    animation: '/animations/home/audit_logs.json',
  },
  audit_logs: {
    description: 'Track system activities',
    tileSize: 'sm',
    semanticTheme: 'orange',
    animation: '/animations/home/audit_logs.json',
  },
  platform: {
    description: 'Multi-tenant platform console',
    tileSize: 'sm',
    semanticTheme: 'blue',
  },
}

export function homeModules(roleOrRoles: Role | Role[]): HomeModule[] {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
  return navForRole(roles).map((n) => {
    const meta = MODULE_META[n.key] ?? DEFAULT_META
    const qas = (meta.quickActions ?? []).filter((qa) => !qa.perm || can(roles, qa.perm))
    return {
      ...n,
      description: meta.description,
      tileSize: meta.tileSize,
      semanticTheme: meta.semanticTheme ?? 'lavender',
      animation: meta.animation,
      quickActions: qas,
      pastelIdentity: getModulePastelTokens(n.key),
    }
  })
}
