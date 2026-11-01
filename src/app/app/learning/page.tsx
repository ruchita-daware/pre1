import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { can } from '@/lib/auth'
import { normalizeRole } from '@/lib/roles'
import { LearningClient } from './LearningClient'
import { ParentLearningView } from '@/components/parent/ParentLearningView'

export default async function LearningPage() {
  const session = await getSession()
  if (!session?.tenantId) redirect('/')

  const roles = session.roles && session.roles.length > 0 ? session.roles : [session.role]
  if (!can(roles, 'academics:read') && !can(roles, 'academics:read-linked')) {
    redirect('/app/dashboard')
  }

  const isParent = roles.some((r) => ['PARENT', 'GUARDIAN'].includes(normalizeRole(r)))
  if (isParent) {
    return <ParentLearningView session={session} />
  }

  return <LearningClient session={session} />
}
