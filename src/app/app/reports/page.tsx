import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { can } from '@/lib/auth'
import { normalizeRole } from '@/lib/roles'
import ReportsClient from './ReportsClient'
import { ParentReportsView } from '@/components/parent/ParentReportsView'

export const metadata: Metadata = {
  title: 'Reports & Analytics | PreOne',
  description: 'Executive MIS, operational dashboards, exports, and custom report builder',
}

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/')
  }

  const roles = session.roles && session.roles.length > 0 ? session.roles : [session.role]
  if (!can(roles, 'reports:read') && !can(roles, 'reports:read-linked')) {
    redirect('/app/dashboard')
  }

  const isParent = roles.some((r) => ['PARENT', 'GUARDIAN'].includes(normalizeRole(r)))
  if (isParent) {
    return <ParentReportsView session={session as any} />
  }

  return <ReportsClient />
}

