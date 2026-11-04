import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors, bad } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { db } from '@/lib/db'
import { recordChildEvent } from '@/lib/notify'
import { recordAudit } from '@/lib/audit'
import { TransportSecurityService } from '@/lib/transport/transport-security'

/**
 * GET /api/v1/transport/trips/[id]/manifest — List all manifest items for this trip
 */
async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  const { id: tripId } = await params
  try {
    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: session.tenantId },
      include: {
        route: { select: { id: true, name: true, code: true, driverProfileId: true } },
        vehicle: true,
        manifest: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNo: true,
                photoUrl: true,
                currentClassroom: { select: { id: true, name: true } },
                guardians: {
                  include: {
                    guardian: {
                      select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        relationship: true,
                        pickupPin: true,
                      },
                    },
                  },
                },
              },
            },
            stop: true,
          },
        },
      },
    })

    if (!trip) return Errors.notFound('Trip not found')

    // Role scoping
    const context = {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }
    const scope = await TransportSecurityService.getRoleScopingFilter(context)
    if (scope.isDriver && scope.allowedRouteIds !== null && !scope.allowedRouteIds.includes(trip.routeId)) {
      return Errors.forbidden('Unauthorized access to unassigned trip manifest')
    }

    return ok(trip)
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/transport/trips/[id]/manifest — Update student status on manifest
 * Supports BOARDED, DROPPED, ABSENT, MISSED, EXPECTED
 */
async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, ['transport:board', 'transport:drop', 'transport:trip', 'transport:write'])
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  const { id: tripId } = await params
  try {
    const body = await req.json().catch(() => ({}))
    const { studentId, status, notes, verifiedRecipient } = body

    if (!studentId) return bad('studentId is required')
    if (!status || !['BOARDED', 'DROPPED', 'ABSENT', 'MISSED', 'EXPECTED'].includes(status)) {
      return bad('Valid status (BOARDED, DROPPED, ABSENT, MISSED, EXPECTED) is required')
    }

    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: session.tenantId },
      include: {
        route: true,
        vehicle: true,
      },
    })
    if (!trip) return Errors.notFound('Trip not found')

    // Driver verification
    const context = {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }
    const scope = await TransportSecurityService.getRoleScopingFilter(context)
    if (scope.isDriver && scope.allowedRouteIds !== null && !scope.allowedRouteIds.includes(trip.routeId)) {
      return Errors.forbidden('Unauthorized: You are not assigned to this route')
    }

    const manifestItem = await db.tripManifestItem.findUnique({
      where: { tripId_studentId: { tripId, studentId } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
        stop: true,
      },
    })
    if (!manifestItem) return Errors.notFound('Student is not in this trip manifest')

    const now = new Date()
    const updateData: any = {
      status,
      actionById: session.uid,
      actionByName: session.name,
      notes: notes?.trim() || (verifiedRecipient ? `Recipient: ${verifiedRecipient}` : null),
    }

    if (status === 'BOARDED') {
      updateData.boardedAt = now
    } else if (status === 'DROPPED') {
      updateData.droppedAt = now
      if (verifiedRecipient) {
        updateData.notes = `Handed over to: ${verifiedRecipient.trim()}`
      }
    } else if (status === 'EXPECTED') {
      updateData.boardedAt = null
      updateData.droppedAt = null
      updateData.notes = null
    }

    const updated = await db.tripManifestItem.update({
      where: { id: manifestItem.id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNo: true,
            photoUrl: true,
            currentClassroom: { select: { id: true, name: true } },
          },
        },
        stop: true,
      },
    })

    // Timeline event notification
    if (status === 'BOARDED') {
      await recordChildEvent({
        tenantId: session.tenantId,
        studentId,
        type: 'ARRIVAL',
        title: 'Boarded School Bus',
        body: `${manifestItem.student.firstName} safely boarded bus ${trip.vehicle.registrationNumber} (Route: ${trip.route.name}) at ${manifestItem.stop.name}.`,
        actorId: session.uid,
      })
    } else if (status === 'DROPPED') {
      await recordChildEvent({
        tenantId: session.tenantId,
        studentId,
        type: 'PICKUP',
        title: 'Safely Dropped at Stop',
        body: `${manifestItem.student.firstName} safely dropped at ${manifestItem.stop.name}${verifiedRecipient ? ` (Handover: ${verifiedRecipient})` : ''}.`,
        actorId: session.uid,
      })
    } else if (status === 'ABSENT') {
      await recordChildEvent({
        tenantId: session.tenantId,
        studentId,
        type: 'NOTE',
        title: 'Bus Transit: Marked Absent',
        body: `${manifestItem.student.firstName} marked absent for bus run at ${manifestItem.stop.name}. Reason: ${notes || 'No show'}.`,
        actorId: session.uid,
      })
    } else if (status === 'MISSED') {
      await recordChildEvent({
        tenantId: session.tenantId,
        studentId,
        type: 'NOTE',
        title: 'Bus Transit Exception',
        body: `Transit exception recorded for ${manifestItem.student.firstName} at ${manifestItem.stop.name}. Note: ${notes || 'Exception'}.`,
        actorId: session.uid,
      })
    }

    await recordAudit({
      tenantId: session.tenantId,
      branchId: trip.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
      action: `TRANSPORT_${status}`,
      entity: 'TripManifestItem',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Updated passenger status for ${manifestItem.student.firstName} to ${status} at ${manifestItem.stop.name}`,
    })

    return ok(updated)
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)

