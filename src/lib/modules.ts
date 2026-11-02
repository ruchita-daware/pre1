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
    darkBg: '#202C45',
    darkHoverBg: '#283756',
    darkAccent: '#70A7FF',
    darkTitleText: '#F4F3FF',
  },
  setup: {
    defaultBg: '#FCFAFF',
    hoverBg: '#F1EAFE',
    accent: '#8661D2',
    text: '#6E48BD',
    bg: '#FCFAFF',
    titleText: '#6E48BD',
    darkBg: '#2A2342',
    darkHoverBg: '#352C53',
    darkAccent: '#B69AFF',
    darkTitleText: '#F4F3FF',
  },
  users: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: '#392333',
    darkHoverBg: '#472C40',
    darkAccent: '#F28AB0',
    darkTitleText: '#F4F3FF',
  },
  admissions: {
    defaultBg: '#FAFDFB',
    hoverBg: '#E8F8F0',
    accent: '#35A879',
    text: '#23875D',
    bg: '#FAFDFB',
    titleText: '#23875D',
    darkBg: '#1E352F',
    darkHoverBg: '#26433C',
    darkAccent: '#68D6A2',
    darkTitleText: '#F4F3FF',
  },
  students: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: '#392333',
    darkHoverBg: '#472C40',
    darkAccent: '#F28AB0',
    darkTitleText: '#F4F3FF',
  },
  'daily-diary': {
    defaultBg: '#FAFDFF',
    hoverBg: '#E8F5FD',
    accent: '#439BCB',
    text: '#277FAA',
    bg: '#FAFDFF',
    titleText: '#277FAA',
    darkBg: '#1E3342',
    darkHoverBg: '#274154',
    darkAccent: '#72C9F0',
    darkTitleText: '#F4F3FF',
  },
  finance: {
    defaultBg: '#FFFCF8',
    hoverBg: '#FFF2DF',
    accent: '#D99A3C',
    text: '#AD721C',
    bg: '#FFFCF8',
    titleText: '#AD721C',
    darkBg: '#3B3022',
    darkHoverBg: '#4A3D2B',
    darkAccent: '#F4BC69',
    darkTitleText: '#F4F3FF',
  },
  fees: {
    defaultBg: '#FFFCF8',
    hoverBg: '#FFF2DF',
    accent: '#D99A3C',
    text: '#AD721C',
    bg: '#FFFCF8',
    titleText: '#AD721C',
    darkBg: '#3B3022',
    darkHoverBg: '#4A3D2B',
    darkAccent: '#F4BC69',
    darkTitleText: '#F4F3FF',
  },
  transport: {
    defaultBg: '#F9FDFC',
    hoverBg: '#E7F7F4',
    accent: '#38A391',
    text: '#258575',
    bg: '#F9FDFC',
    titleText: '#258575',
    darkBg: '#1D3637',
    darkHoverBg: '#254445',
    darkAccent: '#69D4C4',
    darkTitleText: '#F4F3FF',
  },
  inventory: {
    defaultBg: '#FFFCF9',
    hoverBg: '#FFF3E3',
    accent: '#CA9145',
    text: '#A46E26',
    bg: '#FFFCF9',
    titleText: '#A46E26',
    darkBg: '#37302A',
    darkHoverBg: '#453D35',
    darkAccent: '#E6B36F',
    darkTitleText: '#F4F3FF',
  },
  learning: {
    defaultBg: '#FFFBF9',
    hoverBg: '#FFF0E8',
    accent: '#E4815A',
    text: '#BA5D38',
    bg: '#FFFBF9',
    titleText: '#BA5D38',
    darkBg: '#3A292B',
    darkHoverBg: '#483336',
    darkAccent: '#F29B7D',
    darkTitleText: '#F4F3FF',
  },
  'preo-learning': {
    defaultBg: '#FFFBF9',
    hoverBg: '#FFF0E8',
    accent: '#E4815A',
    text: '#BA5D38',
    bg: '#FFFBF9',
    titleText: '#BA5D38',
    darkBg: '#3A292B',
    darkHoverBg: '#483336',
    darkAccent: '#F29B7D',
    darkTitleText: '#F4F3FF',
  },
  preo_learning: {
    defaultBg: '#FFFBF9',
    hoverBg: '#FFF0E8',
    accent: '#E4815A',
    text: '#BA5D38',
    bg: '#FFFBF9',
    titleText: '#BA5D38',
    darkBg: '#3A292B',
    darkHoverBg: '#483336',
    darkAccent: '#F29B7D',
    darkTitleText: '#F4F3FF',
  },
  hr: {
    defaultBg: '#FCFBFF',
    hoverBg: '#F1ECFC',
    accent: '#896BC5',
    text: '#6F51AC',
    bg: '#FCFBFF',
    titleText: '#6F51AC',
    darkBg: '#302844',
    darkHoverBg: '#3C3355',
    darkAccent: '#BBA3F2',
    darkTitleText: '#F4F3FF',
  },
  reports: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#5486D0',
    text: '#3567B1',
    bg: '#FBFCFF',
    titleText: '#3567B1',
    darkBg: '#202E43',
    darkHoverBg: '#283953',
    darkAccent: '#80B6F4',
    darkTitleText: '#F4F3FF',
  },
  reports_analytics: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#5486D0',
    text: '#3567B1',
    bg: '#FBFCFF',
    titleText: '#3567B1',
    darkBg: '#202E43',
    darkHoverBg: '#283953',
    darkAccent: '#80B6F4',
    darkTitleText: '#F4F3FF',
  },
  communication: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: '#3B2634',
    darkHoverBg: '#493041',
    darkAccent: '#F18AB5',
    darkTitleText: '#F4F3FF',
  },
  announcements: {
    defaultBg: '#FFFBFC',
    hoverBg: '#FFEBF1',
    accent: '#D56D91',
    text: '#B94972',
    bg: '#FFFBFC',
    titleText: '#B94972',
    darkBg: '#3B2634',
    darkHoverBg: '#493041',
    darkAccent: '#F18AB5',
    darkTitleText: '#F4F3FF',
  },
  settings: {
    defaultBg: '#FBFCFD',
    hoverBg: '#EBF0F6',
    accent: '#75869F',
    text: '#55667E',
    bg: '#FBFCFD',
    titleText: '#55667E',
    darkBg: '#293144',
    darkHoverBg: '#343E56',
    darkAccent: '#A8B7CF',
    darkTitleText: '#F4F3FF',
  },
  audit: {
    defaultBg: '#FCFBFF',
    hoverBg: '#F0EBFC',
    accent: '#7866C2',
    text: '#5F4CAE',
    bg: '#FCFBFF',
    titleText: '#5F4CAE',
    darkBg: '#302A46',
    darkHoverBg: '#3C3558',
    darkAccent: '#B7A5F5',
    darkTitleText: '#F4F3FF',
  },
  audit_logs: {
    defaultBg: '#FCFBFF',
    hoverBg: '#F0EBFC',
    accent: '#7866C2',
    text: '#5F4CAE',
    bg: '#FCFBFF',
    titleText: '#5F4CAE',
    darkBg: '#302A46',
    darkHoverBg: '#3C3558',
    darkAccent: '#B7A5F5',
    darkTitleText: '#F4F3FF',
  },
  platform: {
    defaultBg: '#FBFCFF',
    hoverBg: '#EAF1FD',
    accent: '#4385D8',
    text: '#2A67B5',
    bg: '#FBFCFF',
    titleText: '#2A67B5',
    darkBg: '#202E43',
    darkHoverBg: '#283953',
    darkAccent: '#80B6F4',
    darkTitleText: '#F4F3FF',
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
    animation: '/animations/home/preo_learning.json',
    quickActions: [{ label: 'Open workspace', href: '/app/learning' }],
  },
  'preo-learning': {
    description: 'Early childhood curriculum & activities',
    tileSize: 'lg',
    semanticTheme: 'lavender',
    animation: '/animations/home/preo_learning.json',
    quickActions: [{ label: 'Open workspace', href: '/app/learning' }],
  },
  preo_learning: {
    description: 'Early childhood curriculum & activities',
    tileSize: 'lg',
    semanticTheme: 'lavender',
    animation: '/animations/home/preo_learning.json',
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
