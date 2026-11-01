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
  },
  setup: {
    defaultBg: '#F5F0FF',
    hoverBg: '#EAE0FF',
    accent: '#7952C6',
    text: '#7952C6',
    bg: '#F5F0FF',
    titleText: '#7952C6',
    darkBg: 'rgba(121, 82, 198, 0.16)',
    darkHoverBg: 'rgba(121, 82, 198, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#C4B5FD',
  },
  users: {
    defaultBg: '#FFF3F6',
    hoverBg: '#FFE6ED',
    accent: '#C34F73',
    text: '#B74A6C',
    bg: '#FFF3F6',
    titleText: '#B74A6C',
    darkBg: 'rgba(195, 79, 115, 0.16)',
    darkHoverBg: 'rgba(195, 79, 115, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  admissions: {
    defaultBg: '#EFFAF4',
    hoverBg: '#DFF5E9',
    accent: '#269B69',
    text: '#1F7F56',
    bg: '#EFFAF4',
    titleText: '#1F7F56',
    darkBg: 'rgba(38, 155, 105, 0.16)',
    darkHoverBg: 'rgba(38, 155, 105, 0.28)',
    darkAccent: '#34D399',
    darkTitleText: '#A7F3D0',
  },
  students: {
    defaultBg: '#FFF2F5',
    hoverBg: '#FFE5EC',
    accent: '#C34F73',
    text: '#B74A6C',
    bg: '#FFF2F5',
    titleText: '#B74A6C',
    darkBg: 'rgba(195, 79, 115, 0.16)',
    darkHoverBg: 'rgba(195, 79, 115, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  'daily-diary': {
    defaultBg: '#F0FAFF',
    hoverBg: '#E1F5FF',
    accent: '#278DBB',
    text: '#21769D',
    bg: '#F0FAFF',
    titleText: '#21769D',
    darkBg: 'rgba(39, 141, 187, 0.16)',
    darkHoverBg: 'rgba(39, 141, 187, 0.28)',
    darkAccent: '#38BDF8',
    darkTitleText: '#BAE6FD',
  },
  finance: {
    defaultBg: '#FFF8ED',
    hoverBg: '#FFF0D8',
    accent: '#C47A20',
    text: '#9D621A',
    bg: '#FFF8ED',
    titleText: '#9D621A',
    darkBg: 'rgba(196, 122, 32, 0.16)',
    darkHoverBg: 'rgba(196, 122, 32, 0.28)',
    darkAccent: '#FBBF24',
    darkTitleText: '#FDE68A',
  },
  fees: {
    defaultBg: '#FFF8ED',
    hoverBg: '#FFF0D8',
    accent: '#C47A20',
    text: '#9D621A',
    bg: '#FFF8ED',
    titleText: '#9D621A',
    darkBg: 'rgba(196, 122, 32, 0.16)',
    darkHoverBg: 'rgba(196, 122, 32, 0.28)',
    darkAccent: '#FBBF24',
    darkTitleText: '#FDE68A',
  },
  transport: {
    defaultBg: '#EFF9F7',
    hoverBg: '#DDF3EE',
    accent: '#258C7B',
    text: '#217B6C',
    bg: '#EFF9F7',
    titleText: '#217B6C',
    darkBg: 'rgba(37, 140, 123, 0.16)',
    darkHoverBg: 'rgba(37, 140, 123, 0.28)',
    darkAccent: '#2DD4BF',
    darkTitleText: '#99F6E4',
  },
  inventory: {
    defaultBg: '#FFF8EF',
    hoverBg: '#FFF0DB',
    accent: '#C58A35',
    text: '#926627',
    bg: '#FFF8EF',
    titleText: '#926627',
    darkBg: 'rgba(197, 138, 53, 0.16)',
    darkHoverBg: 'rgba(197, 138, 53, 0.28)',
    darkAccent: '#FBBF24',
    darkTitleText: '#FDE68A',
  },
  learning: {
    defaultBg: '#FFF4EF',
    hoverBg: '#FFE8DE',
    accent: '#D76D46',
    text: '#AC5738',
    bg: '#FFF4EF',
    titleText: '#AC5738',
    darkBg: 'rgba(215, 109, 70, 0.16)',
    darkHoverBg: 'rgba(215, 109, 70, 0.28)',
    darkAccent: '#FB923C',
    darkTitleText: '#FED7AA',
  },
  'preo-learning': {
    defaultBg: '#FFF4EF',
    hoverBg: '#FFE8DE',
    accent: '#D76D46',
    text: '#AC5738',
    bg: '#FFF4EF',
    titleText: '#AC5738',
    darkBg: 'rgba(215, 109, 70, 0.16)',
    darkHoverBg: 'rgba(215, 109, 70, 0.28)',
    darkAccent: '#FB923C',
    darkTitleText: '#FED7AA',
  },
  preo_learning: {
    defaultBg: '#FFF4EF',
    hoverBg: '#FFE8DE',
    accent: '#D76D46',
    text: '#AC5738',
    bg: '#FFF4EF',
    titleText: '#AC5738',
    darkBg: 'rgba(215, 109, 70, 0.16)',
    darkHoverBg: 'rgba(215, 109, 70, 0.28)',
    darkAccent: '#FB923C',
    darkTitleText: '#FED7AA',
  },
  hr: {
    defaultBg: '#F5F2FF',
    hoverBg: '#EAE3FF',
    accent: '#7759B8',
    text: '#7759B8',
    bg: '#F5F2FF',
    titleText: '#7759B8',
    darkBg: 'rgba(119, 89, 184, 0.16)',
    darkHoverBg: 'rgba(119, 89, 184, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#DDD6FE',
  },
  reports: {
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
  },
  reports_analytics: {
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
  },
  communication: {
    defaultBg: '#FFF3F7',
    hoverBg: '#FFE5EF',
    accent: '#C44F82',
    text: '#B44978',
    bg: '#FFF3F7',
    titleText: '#B44978',
    darkBg: 'rgba(196, 79, 130, 0.16)',
    darkHoverBg: 'rgba(196, 79, 130, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  announcements: {
    defaultBg: '#FFF3F7',
    hoverBg: '#FFE5EF',
    accent: '#C44F82',
    text: '#B44978',
    bg: '#FFF3F7',
    titleText: '#B44978',
    darkBg: 'rgba(196, 79, 130, 0.16)',
    darkHoverBg: 'rgba(196, 79, 130, 0.28)',
    darkAccent: '#F472B6',
    darkTitleText: '#FBCFE8',
  },
  settings: {
    defaultBg: '#F3F5F8',
    hoverBg: '#E8EDF4',
    accent: '#64748B',
    text: '#606F85',
    bg: '#F3F5F8',
    titleText: '#606F85',
    darkBg: 'rgba(100, 116, 139, 0.18)',
    darkHoverBg: 'rgba(100, 116, 139, 0.30)',
    darkAccent: '#94A3B8',
    darkTitleText: '#CBD5E1',
  },
  audit: {
    defaultBg: '#F4F1FF',
    hoverBg: '#EAE4FF',
    accent: '#6953B4',
    text: '#6953B4',
    bg: '#F4F1FF',
    titleText: '#6953B4',
    darkBg: 'rgba(105, 83, 180, 0.16)',
    darkHoverBg: 'rgba(105, 83, 180, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#C4B5FD',
  },
  audit_logs: {
    defaultBg: '#F4F1FF',
    hoverBg: '#EAE4FF',
    accent: '#6953B4',
    text: '#6953B4',
    bg: '#F4F1FF',
    titleText: '#6953B4',
    darkBg: 'rgba(105, 83, 180, 0.16)',
    darkHoverBg: 'rgba(105, 83, 180, 0.28)',
    darkAccent: '#A78BFA',
    darkTitleText: '#C4B5FD',
  },
  platform: {
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
