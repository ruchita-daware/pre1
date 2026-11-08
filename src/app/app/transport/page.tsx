import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { TransportClient } from './TransportClient'

export const metadata = {
  title: 'Transport & Safety Operations — PreOne Preschool OS',
  description: 'Preschool child safety, bus routes, fleet, driver assignment, live trips, and authorized guardian drop verification',
}

export default async function TransportPage() {
  const session = await getSession()
  if (!session) {
    redirect('/')
  }

  const effectiveRoles = (session.roles && session.roles.length > 0 ? session.roles : [session.role]).filter(Boolean) as string[]
  const isDriverOnly = effectiveRoles.some((r) => ['DRIVER', 'ATTENDANT'].includes(r)) && !effectiveRoles.some((r) => ['OWNER', 'PRINCIPAL', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'TEACHER', 'COORDINATOR'].includes(r))
  if (isDriverOnly) {
    redirect('/app/driver')
  }

  return <TransportClient session={session as any} />
}
