/**
 * PreOne — Transport Management Domain Service
 *
 * Core business orchestration for Preschool Child Transportation Safety & Route Operations:
 * 1. Fleet & Vehicle Management (Capacity enforcement, Maintenance, Branch Scope)
 * 2. Route & Stop Architecture (Ordered stops, Landmark sequences, Timings)
 * 3. Driver & Attendant Eligibility (Linked to HR StaffProfile with active check and designation)
 * 4. Student Transport Assignment (Capacity guard, Sibling/Multi-guardian, Session, Duplicate guard)
 * 5. Morning & Evening Operational Trips (Dynamic manifest generation from active assignments)
 * 6. Child Boarding (Idempotent, Timestamped, TimelineEntry, Parent Alert)
 * 7. School Arrival (Trip completion, Operations sync)
 * 8. Evening Drop & Guardian Verification (Integrates OperationPolicies.verifyPickupPerson)
 * 9. Delay Management & Targeted Parent Notification
 * 10. Operational Incidents & Safety Follow-ups
 * 11. Vehicle & Driver Substitution (Safe snapshots preserving historical data)
 * 12. Cross-Module Invariants (Student withdrawal ends transport, Driver offboarding blocks trips, Finance fee sync)
 */

import { db } from '@/lib/db'
import { recordAudit } from '@/lib/audit'
import { recordChildEvent } from '@/lib/notify'
import { raiseFollowUp } from '@/lib/followups'
import { OperationPolicies } from '@/lib/operations/operation-policies'
import { FeeService } from '@/lib/fees/fee-service'
import { TransportSecurityService } from '@/lib/transport/transport-security'
import {
  VehicleStatus,
  RouteStatus,
  StopStatus,
  TransportTripType,
  TransportAssignmentStatus,
  TripOperationalType,
  TripStatus,
  ManifestItemStatus,
  TransportIncidentSeverity,
  TransportIncidentCategory,
  TransportIncidentStatus,
  UserStatus,
} from '@prisma/client'

export interface ScopeContext {
  tenantId: string
  branchId?: string | null
  academicSessionId?: string | null
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export interface VehicleExpiryWarning {
  field: 'registrationExpiry' | 'insuranceExpiry' | 'fitnessExpiry' | 'permitExpiry' | 'pollutionExpiry'
  label: string
  expiryDate: string
  status: 'EXPIRED' | 'EXPIRING_SOON'
  message: string
}

export interface VehicleCustomMetadata {
  notes?: string | null
  displayName?: string | null
  registrationExpiry?: string | null
  insuranceExpiry?: string | null
  fitnessExpiry?: string | null
  permitExpiry?: string | null
  pollutionExpiry?: string | null
  documents?: Array<{
    id?: string
    name: string
    type: string
    url?: string
    expiryDate?: string | null
  }>
}

export interface CreateVehicleInput {
  branchId?: string | null
  registrationNumber: string
  vehicleType?: string
  capacity: number
  makeModel?: string
  displayName?: string | null
  registrationExpiry?: string | null
  insuranceExpiry?: string | null
  fitnessExpiry?: string | null
  permitExpiry?: string | null
  pollutionExpiry?: string | null
  documents?: Array<{
    id?: string
    name: string
    type: string
    url?: string
    expiryDate?: string | null
  }>
  notes?: string | null
}

export interface UpdateVehicleInput {
  capacity?: number
  status?: VehicleStatus
  makeModel?: string | null
  vehicleType?: string | null
  displayName?: string | null
  registrationExpiry?: string | null
  insuranceExpiry?: string | null
  fitnessExpiry?: string | null
  permitExpiry?: string | null
  pollutionExpiry?: string | null
  documents?: Array<{
    id?: string
    name: string
    type: string
    url?: string
    expiryDate?: string | null
  }>
  notes?: string | null
  branchId?: string | null
}

export function parseVehicleNotes(notesStr: string | null | undefined): {
  plainNotes: string | null
  displayName: string | null
  registrationExpiry: string | null
  insuranceExpiry: string | null
  fitnessExpiry: string | null
  permitExpiry: string | null
  pollutionExpiry: string | null
  documents: Array<{ id?: string; name: string; type: string; url?: string; expiryDate?: string | null }>
  expiryWarnings: VehicleExpiryWarning[]
} {
  let plainNotes: string | null = notesStr || null
  let displayName: string | null = null
  let registrationExpiry: string | null = null
  let insuranceExpiry: string | null = null
  let fitnessExpiry: string | null = null
  let permitExpiry: string | null = null
  let pollutionExpiry: string | null = null
  let documents: any[] = []

  if (notesStr && notesStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(notesStr)
      plainNotes = parsed.notes !== undefined ? (parsed.notes || null) : null
      displayName = parsed.displayName || null
      registrationExpiry = parsed.registrationExpiry || null
      insuranceExpiry = parsed.insuranceExpiry || null
      fitnessExpiry = parsed.fitnessExpiry || null
      permitExpiry = parsed.permitExpiry || null
      pollutionExpiry = parsed.pollutionExpiry || null
      documents = Array.isArray(parsed.documents) ? parsed.documents : []
    } catch {
      // keep plainNotes as notesStr
    }
  }

  const now = new Date()
  const thirtyDaysAhead = new Date()
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30)

  const warnings: VehicleExpiryWarning[] = []
  const checkExpiry = (field: VehicleExpiryWarning['field'], label: string, dateStr: string | null) => {
    if (!dateStr) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    if (d < now) {
      warnings.push({
        field,
        label,
        expiryDate: dateStr,
        status: 'EXPIRED',
        message: `${label} expired on ${d.toISOString().split('T')[0]}`,
      })
    } else if (d <= thirtyDaysAhead) {
      const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      warnings.push({
        field,
        label,
        expiryDate: dateStr,
        status: 'EXPIRING_SOON',
        message: `${label} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      })
    }
  }

  checkExpiry('registrationExpiry', 'Registration Certificate', registrationExpiry)
  checkExpiry('insuranceExpiry', 'Insurance Policy', insuranceExpiry)
  checkExpiry('fitnessExpiry', 'Fitness Certificate', fitnessExpiry)
  checkExpiry('permitExpiry', 'Transport Permit', permitExpiry)
  checkExpiry('pollutionExpiry', 'Pollution Certificate (PUC)', pollutionExpiry)

  return {
    plainNotes,
    displayName,
    registrationExpiry,
    insuranceExpiry,
    fitnessExpiry,
    permitExpiry,
    pollutionExpiry,
    documents,
    expiryWarnings: warnings,
  }
}

export function serializeVehicleNotes(
  plainNotes: string | null | undefined,
  metadata?: {
    displayName?: string | null
    registrationExpiry?: string | null
    insuranceExpiry?: string | null
    fitnessExpiry?: string | null
    permitExpiry?: string | null
    pollutionExpiry?: string | null
    documents?: any[]
  }
): string | null {
  const hasMetadata =
    (metadata?.displayName && metadata.displayName.trim().length > 0) ||
    metadata?.registrationExpiry ||
    metadata?.insuranceExpiry ||
    metadata?.fitnessExpiry ||
    metadata?.permitExpiry ||
    metadata?.pollutionExpiry ||
    (metadata?.documents && metadata.documents.length > 0)

  if (!hasMetadata) {
    return plainNotes?.trim() || null
  }

  const payload: any = {}
  if (plainNotes?.trim()) payload.notes = plainNotes.trim()
  if (metadata?.displayName?.trim()) payload.displayName = metadata.displayName.trim()
  if (metadata?.registrationExpiry) payload.registrationExpiry = metadata.registrationExpiry
  if (metadata?.insuranceExpiry) payload.insuranceExpiry = metadata.insuranceExpiry
  if (metadata?.fitnessExpiry) payload.fitnessExpiry = metadata.fitnessExpiry
  if (metadata?.permitExpiry) payload.permitExpiry = metadata.permitExpiry
  if (metadata?.pollutionExpiry) payload.pollutionExpiry = metadata.pollutionExpiry
  if (metadata?.documents && metadata.documents.length > 0) payload.documents = metadata.documents

  return JSON.stringify(payload)
}

export interface CreateStopInput {
  name: string
  landmark?: string
  sequence: number
  morningPickupTime?: string
  eveningDropTime?: string
}

export interface CreateRouteInput {
  branchId?: string | null
  code: string
  name: string
  description?: string
  vehicleId?: string | null
  driverProfileId?: string | null
  attendantProfileId?: string | null
  stops?: CreateStopInput[]
}

export interface AssignStudentInput {
  studentId: string
  routeId: string
  pickupStopId: string
  dropStopId: string
  tripType?: TransportTripType
  startDate?: Date | string
  endDate?: Date | string
  monthlyFeeCents?: number
  generateFeeInvoice?: boolean
}

export interface StartTripInput {
  routeId: string
  tripDate: Date | string
  tripType: TripOperationalType
  vehicleId?: string
  driverProfileId?: string
  attendantProfileId?: string
}

export interface RecordBoardingInput {
  tripId: string
  studentId: string
  stopId?: string
  notes?: string
}

export interface RecordDropInput {
  tripId: string
  studentId: string
  guardianId?: string
  phone?: string
  userId?: string
  pin?: string
  notes?: string
}

export interface ReportIncidentInput {
  tripId?: string
  vehicleId?: string
  studentId?: string
  severity: TransportIncidentSeverity
  category: TransportIncidentCategory
  title: string
  description: string
  actionTaken?: string
}

export class TransportService {
  /**
   * 1. DASHBOARD & OPERATIONAL METRICS
   * Real database aggregates — zero dummy data.
   */
  static async getDashboardMetrics(ctx: ScopeContext) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const branchFilter = ctx.branchId ? { branchId: ctx.branchId } : {}

    const [
      activeRoutesCount,
      activeVehiclesCount,
      vehiclesInMaintenanceCount,
      activeAssignmentsCount,
      todayTrips,
      openIncidentsCount,
    ] = await Promise.all([
      db.transportRoute.count({
        where: { tenantId: ctx.tenantId, status: 'ACTIVE', deletedAt: null, ...branchFilter },
      }),
      db.vehicle.count({
        where: { tenantId: ctx.tenantId, status: 'ACTIVE', deletedAt: null, ...branchFilter },
      }),
      db.vehicle.count({
        where: { tenantId: ctx.tenantId, status: 'MAINTENANCE', deletedAt: null, ...branchFilter },
      }),
      db.studentTransportAssignment.count({
        where: { tenantId: ctx.tenantId, status: 'ACTIVE', deletedAt: null, ...branchFilter },
      }),
      db.transportTrip.findMany({
        where: {
          tenantId: ctx.tenantId,
          tripDate: { gte: today, lt: tomorrow },
          ...branchFilter,
        },
        include: {
          manifest: true,
          route: { select: { name: true, code: true } },
          vehicle: { select: { registrationNumber: true } },
          driverProfile: { include: { user: { select: { fullName: true } } } },
        },
      }),
      db.transportIncident.count({
        where: {
          tenantId: ctx.tenantId,
          status: { in: ['REPORTED', 'INVESTIGATING'] },
          ...branchFilter,
        },
      }),
    ])

    // Aggregate manifest numbers across today's trips
    let boardedCount = 0
    let droppedCount = 0
    let absentCount = 0
    let delayedTripsCount = 0

    for (const trip of todayTrips) {
      if (trip.delayMinutes > 0) delayedTripsCount++
      for (const item of trip.manifest) {
        if (item.status === 'BOARDED') boardedCount++
        if (item.status === 'DROPPED') droppedCount++
        if (item.status === 'ABSENT') absentCount++
      }
    }

    return {
      activeRoutes: activeRoutesCount,
      activeVehicles: activeVehiclesCount,
      vehiclesInMaintenance: vehiclesInMaintenanceCount,
      studentsUsingTransport: activeAssignmentsCount,
      todayTripsCount: todayTrips.length,
      childrenBoarded: boardedCount,
      childrenDropped: droppedCount,
      childrenAbsent: absentCount,
      delayedTrips: delayedTripsCount,
      openIncidents: openIncidentsCount,
      todayTrips: todayTrips.map((t) => ({
        id: t.id,
        routeName: t.route.name,
        routeCode: t.route.code,
        vehicleReg: t.vehicle.registrationNumber,
        driverName: t.driverProfile.user.fullName,
        tripType: t.tripType,
        status: t.status,
        delayMinutes: t.delayMinutes,
        totalManifest: t.manifest.length,
        boarded: t.manifest.filter((m) => m.status === 'BOARDED').length,
        dropped: t.manifest.filter((m) => m.status === 'DROPPED').length,
      })),
    }
  }

  /**
   * 2. VEHICLE MANAGEMENT
   */
  static formatVehicle(vehicle: any) {
    if (!vehicle) return null
    const meta = parseVehicleNotes(vehicle.notes)
    return {
      ...vehicle,
      displayName: meta.displayName,
      registrationExpiry: meta.registrationExpiry,
      insuranceExpiry: meta.insuranceExpiry,
      fitnessExpiry: meta.fitnessExpiry,
      permitExpiry: meta.permitExpiry,
      pollutionExpiry: meta.pollutionExpiry,
      documents: meta.documents,
      expiryWarnings: meta.expiryWarnings,
      notes: meta.plainNotes,
    }
  }

  static async listVehicles(ctx: ScopeContext, filter?: { status?: VehicleStatus; branchId?: string; search?: string }) {
    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.branchId || ctx.branchId ? { branchId: filter?.branchId || ctx.branchId } : {}),
    }

    if (filter?.search?.trim()) {
      const q = filter.search.trim()
      where.OR = [
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { makeModel: { contains: q, mode: 'insensitive' } },
      ]
    }

    const vehicles = await db.vehicle.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        routes: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return vehicles.map((v) => this.formatVehicle(v))
  }

  static async createVehicle(ctx: ScopeContext, input: CreateVehicleInput) {
    if (!input.registrationNumber || !input.registrationNumber.trim()) {
      throw new Error('Vehicle registration number is required')
    }
    if (!input.capacity || input.capacity <= 0) {
      throw new Error('Vehicle capacity must be greater than 0')
    }

    const regNorm = input.registrationNumber.trim().toUpperCase()

    // Uniqueness check within tenant
    const existing = await db.vehicle.findUnique({
      where: { tenantId_registrationNumber: { tenantId: ctx.tenantId, registrationNumber: regNorm } },
    })
    if (existing && !existing.deletedAt) {
      throw new Error(`Vehicle with registration number ${regNorm} already exists in this school`)
    }

    const notesToStore = serializeVehicleNotes(input.notes, {
      displayName: input.displayName,
      registrationExpiry: input.registrationExpiry,
      insuranceExpiry: input.insuranceExpiry,
      fitnessExpiry: input.fitnessExpiry,
      permitExpiry: input.permitExpiry,
      pollutionExpiry: input.pollutionExpiry,
      documents: input.documents,
    })

    const vehicle = await db.vehicle.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: input.branchId || ctx.branchId || null,
        registrationNumber: regNorm,
        vehicleType: input.vehicleType?.trim() || 'BUS',
        capacity: input.capacity,
        makeModel: input.makeModel?.trim() || null,
        notes: notesToStore,
        status: 'ACTIVE',
      },
      include: { branch: true, routes: { select: { id: true, name: true, code: true } } },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: vehicle.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'CREATE_VEHICLE',
      entity: 'Vehicle',
      entityId: vehicle.id,
      module: 'TRANSPORT',
      summary: `Vehicle created: ${vehicle.registrationNumber} (${vehicle.capacity} seats)`,
    })

    return this.formatVehicle(vehicle)
  }

  static async updateVehicle(
    ctx: ScopeContext,
    id: string,
    data: UpdateVehicleInput
  ) {
    const existing = await db.vehicle.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
    })
    if (!existing) throw new Error('Vehicle not found')

    if (data.capacity !== undefined && data.capacity <= 0) {
      throw new Error('Capacity must be greater than 0')
    }

    const existingMeta = parseVehicleNotes(existing.notes)
    const newNotes = data.notes !== undefined ? data.notes : existingMeta.plainNotes
    const notesToStore = serializeVehicleNotes(newNotes, {
      displayName: data.displayName !== undefined ? data.displayName : existingMeta.displayName,
      registrationExpiry: data.registrationExpiry !== undefined ? data.registrationExpiry : existingMeta.registrationExpiry,
      insuranceExpiry: data.insuranceExpiry !== undefined ? data.insuranceExpiry : existingMeta.insuranceExpiry,
      fitnessExpiry: data.fitnessExpiry !== undefined ? data.fitnessExpiry : existingMeta.fitnessExpiry,
      permitExpiry: data.permitExpiry !== undefined ? data.permitExpiry : existingMeta.permitExpiry,
      pollutionExpiry: data.pollutionExpiry !== undefined ? data.pollutionExpiry : existingMeta.pollutionExpiry,
      documents: data.documents !== undefined ? data.documents : existingMeta.documents,
    })

    const updated = await db.vehicle.update({
      where: { id },
      data: {
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.makeModel !== undefined ? { makeModel: data.makeModel?.trim() || null } : {}),
        ...(data.vehicleType !== undefined ? { vehicleType: data.vehicleType?.trim() || 'BUS' } : {}),
        ...(notesToStore !== undefined ? { notes: notesToStore } : {}),
        ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
      },
      include: { branch: true, routes: { select: { id: true, name: true, code: true } } },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: updated.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'UPDATE_VEHICLE',
      entity: 'Vehicle',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Vehicle updated: ${updated.registrationNumber} (Status: ${updated.status})`,
    })

    return this.formatVehicle(updated)
  }

  /**
   * 3. ROUTE & STOP ARCHITECTURE
   */
  static async listRoutes(ctx: ScopeContext, filter?: { branchId?: string; status?: RouteStatus }) {
    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.branchId || ctx.branchId ? { branchId: filter?.branchId || ctx.branchId } : {}),
    }

    const routes = await db.transportRoute.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        vehicle: true,
        driverProfile: { include: { user: { select: { id: true, fullName: true, phone: true, email: true } } } },
        attendantProfile: { include: { user: { select: { id: true, fullName: true, phone: true, email: true } } } },
        stops: { orderBy: { sequence: 'asc' } },
        assignments: {
          where: { status: 'ACTIVE', deletedAt: null },
          select: { id: true, studentId: true },
        },
      },
      orderBy: { code: 'asc' },
    })

    return routes.map((r) => ({
      ...r,
      activeStudentsCount: r.assignments.length,
      availableCapacity: r.vehicle ? Math.max(0, r.vehicle.capacity - r.assignments.length) : 0,
    }))
  }

  static async createRoute(ctx: ScopeContext, input: CreateRouteInput) {
    if (!input.code || !input.code.trim()) throw new Error('Route code is required')
    if (!input.name || !input.name.trim()) throw new Error('Route name is required')

    const codeNorm = input.code.trim().toUpperCase()

    // Validate uniqueness of route code in tenant
    const existing = await db.transportRoute.findUnique({
      where: { tenantId_code: { tenantId: ctx.tenantId, code: codeNorm } },
    })
    if (existing && !existing.deletedAt) {
      throw new Error(`Route code ${codeNorm} already exists in this school`)
    }

    // Validate vehicle if provided
    if (input.vehicleId) {
      const vehicle = await db.vehicle.findFirst({
        where: { id: input.vehicleId, tenantId: ctx.tenantId, deletedAt: null },
      })
      if (!vehicle) throw new Error('Vehicle not found')
      if (vehicle.status !== 'ACTIVE') {
        throw new Error(`Selected vehicle ${vehicle.registrationNumber} is ${vehicle.status} and cannot be assigned to an active route`)
      }
    }

    // Validate driver if provided
    if (input.driverProfileId) {
      await this.validateStaffEligibility(ctx.tenantId, input.driverProfileId, 'driver')
    }

    // Validate attendant if provided
    if (input.attendantProfileId) {
      await this.validateStaffEligibility(ctx.tenantId, input.attendantProfileId, 'attendant')
    }

    // Validate stops sequence if provided
    if (input.stops && input.stops.length > 0) {
      const sequences = input.stops.map((s) => s.sequence)
      const uniqueSeq = new Set(sequences)
      if (uniqueSeq.size !== sequences.length) {
        throw new Error('Stop sequence numbers within a route must be unique')
      }
    }

    const route = await db.transportRoute.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: input.branchId || ctx.branchId || null,
        code: codeNorm,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        vehicleId: input.vehicleId || null,
        driverProfileId: input.driverProfileId || null,
        attendantProfileId: input.attendantProfileId || null,
        status: 'ACTIVE',
        stops: input.stops && input.stops.length > 0
          ? {
              create: input.stops.map((s) => ({
                tenantId: ctx.tenantId,
                name: s.name.trim(),
                landmark: s.landmark?.trim() || null,
                sequence: s.sequence,
                morningPickupTime: s.morningPickupTime?.trim() || '08:00',
                eveningDropTime: s.eveningDropTime?.trim() || '15:00',
                status: 'ACTIVE',
              })),
            }
          : undefined,
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        vehicle: true,
        driverProfile: { include: { user: true } },
      },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: route.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'CREATE_ROUTE',
      entity: 'TransportRoute',
      entityId: route.id,
      module: 'TRANSPORT',
      summary: `Transport route created: ${route.name} (${route.code}) with ${route.stops.length} stops`,
    })

    return route
  }

  static async updateRoute(
    ctx: ScopeContext,
    id: string,
    data: {
      name?: string
      description?: string
      status?: RouteStatus
      vehicleId?: string | null
      driverProfileId?: string | null
      attendantProfileId?: string | null
      branchId?: string | null
      stops?: CreateStopInput[]
    }
  ) {
    const existing = await db.transportRoute.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
      include: { stops: true },
    })
    if (!existing) throw new Error('Transport route not found')

    if (data.vehicleId) {
      const v = await db.vehicle.findFirst({
        where: { id: data.vehicleId, tenantId: ctx.tenantId, deletedAt: null },
      })
      if (!v) throw new Error('Vehicle not found')
      if (v.status !== 'ACTIVE') {
        throw new Error(`Selected vehicle ${v.registrationNumber} is ${v.status} and cannot be assigned to an active route`)
      }
    }

    if (data.driverProfileId) {
      await this.validateStaffEligibility(ctx.tenantId, data.driverProfileId, 'driver')
    }

    if (data.attendantProfileId) {
      await this.validateStaffEligibility(ctx.tenantId, data.attendantProfileId, 'attendant')
    }

    const updated = await db.$transaction(async (tx) => {
      // If stops provided, replace them safely
      if (data.stops) {
        const sequences = data.stops.map((s) => s.sequence)
        const uniqueSeq = new Set(sequences)
        if (uniqueSeq.size !== sequences.length) {
          throw new Error('Stop sequence numbers within a route must be unique')
        }

        // Safely update or add stops without violating foreign key constraints on existing assignments
        const existingStops = await tx.routeStop.findMany({ where: { routeId: id } })
        const existingMap = new Map(existingStops.map((s) => [s.sequence, s]))
        const touchedStopIds: string[] = []

        for (const stopInput of data.stops) {
          const matched = existingMap.get(stopInput.sequence) || existingStops.find((s) => s.name.toLowerCase() === stopInput.name.trim().toLowerCase())
          if (matched) {
            const updatedStop = await tx.routeStop.update({
              where: { id: matched.id },
              data: {
                name: stopInput.name.trim(),
                landmark: stopInput.landmark?.trim() || null,
                sequence: stopInput.sequence,
                morningPickupTime: stopInput.morningPickupTime?.trim() || '08:00',
                eveningDropTime: stopInput.eveningDropTime?.trim() || '15:00',
                status: 'ACTIVE',
              },
            })
            touchedStopIds.push(updatedStop.id)
          } else {
            const newStop = await tx.routeStop.create({
              data: {
                tenantId: ctx.tenantId,
                routeId: id,
                name: stopInput.name.trim(),
                landmark: stopInput.landmark?.trim() || null,
                sequence: stopInput.sequence,
                morningPickupTime: stopInput.morningPickupTime?.trim() || '08:00',
                eveningDropTime: stopInput.eveningDropTime?.trim() || '15:00',
                status: 'ACTIVE',
              },
            })
            touchedStopIds.push(newStop.id)
          }
        }

        // Safely remove any unreferenced old stops
        const stopsToRemove = existingStops.filter((s) => !touchedStopIds.includes(s.id))
        for (const oldStop of stopsToRemove) {
          const hasAssignments = await tx.studentTransportAssignment.findFirst({
            where: { OR: [{ pickupStopId: oldStop.id }, { dropStopId: oldStop.id }] },
          })
          if (!hasAssignments) {
            await tx.routeStop.delete({ where: { id: oldStop.id } }).catch(() => {})
          }
        }
      }

      return tx.transportRoute.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.vehicleId !== undefined ? { vehicleId: data.vehicleId || null } : {}),
          ...(data.driverProfileId !== undefined ? { driverProfileId: data.driverProfileId || null } : {}),
          ...(data.attendantProfileId !== undefined ? { attendantProfileId: data.attendantProfileId || null } : {}),
          ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
        },
        include: { stops: { orderBy: { sequence: 'asc' } }, vehicle: true, driverProfile: { include: { user: true } } },
      })
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: updated.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'UPDATE_ROUTE',
      entity: 'TransportRoute',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Route ${updated.name} updated (Status: ${updated.status})`,
    })

    return updated
  }

  static async deleteRoute(ctx: ScopeContext, id: string) {
    const existing = await db.transportRoute.findFirst({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
      include: {
        trips: { where: { status: 'IN_PROGRESS' } },
        assignments: { where: { status: 'ACTIVE', deletedAt: null } },
      },
    })
    if (!existing) throw new Error('Transport route not found')

    if (existing.trips && existing.trips.length > 0) {
      throw new Error(`Cannot remove route "${existing.name}" because a trip is currently IN_PROGRESS. Complete or cancel the active trip first.`)
    }

    const deleted = await db.$transaction(async (tx) => {
      // Deactivate active student assignments on this route
      await tx.studentTransportAssignment.updateMany({
        where: { routeId: id, tenantId: ctx.tenantId, status: 'ACTIVE' },
        data: { status: 'CANCELLED', deletedAt: new Date() },
      })

      // Soft-delete the route
      return tx.transportRoute.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE',
        },
      })
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: existing.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'DELETE_ROUTE',
      entity: 'TransportRoute',
      entityId: existing.id,
      module: 'TRANSPORT',
      summary: `Transport route deleted: ${existing.name} (${existing.code})`,
    })

    return deleted
  }

  /**
   * 4. STUDENT TRANSPORT ASSIGNMENT & CAPACITY ENFORCEMENT
   */
  static async assignStudent(ctx: ScopeContext, input: AssignStudentInput) {
    const {
      studentId,
      routeId,
      pickupStopId,
      dropStopId,
      tripType = 'TWO_WAY',
      startDate = new Date(),
      endDate,
      monthlyFeeCents = 0,
      generateFeeInvoice = false,
    } = input

    // 1. Verify Student exists in tenant and is ACTIVE
    const student = await db.student.findFirst({
      where: { id: studentId, tenantId: ctx.tenantId, deletedAt: null },
      include: { guardians: { include: { guardian: true } } },
    })
    if (!student) throw new Error('Student not found in this school')
    if (student.status !== 'ACTIVE') {
      throw new Error(`Cannot assign transport: Student status is ${student.status}`)
    }

    // 2. Resolve AcademicSession
    const session = await db.academicSession.findFirst({
      where: {
        tenantId: ctx.tenantId,
        ...(ctx.academicSessionId ? { id: ctx.academicSessionId } : { isCurrent: true, status: 'ACTIVE' }),
      },
    })
    if (!session) throw new Error('No active academic session found')

    // 3. Verify Route and Stops
    const route = await db.transportRoute.findFirst({
      where: { id: routeId, tenantId: ctx.tenantId, deletedAt: null },
      include: { vehicle: true, stops: true },
    })
    if (!route) throw new Error('Transport route not found')
    if (route.status !== 'ACTIVE') throw new Error('Cannot assign student to an INACTIVE route')

    const pStop = route.stops.find((s) => s.id === pickupStopId) || route.stops[0]
    if (!pStop) throw new Error('Selected route does not have any pickup stops configured')

    const dStop = route.stops.find((s) => s.id === dropStopId) || route.stops[route.stops.length - 1]
    if (!dStop) throw new Error('Selected route does not have any drop stops configured')

    // Normalize tripType to valid Prisma enum (TWO_WAY, MORNING_ONLY, EVENING_ONLY)
    const normalizedTripType: TransportTripType =
      (tripType as any) === 'ROUND_TRIP' || !tripType ? 'TWO_WAY' : (tripType as any)

    // 4. Concurrency-Safe Vehicle Capacity Enforcement
    if (!route.vehicle) {
      throw new Error('Selected route does not have an assigned vehicle. Assign a vehicle before enrolling students.')
    }
    if (route.vehicle.status !== 'ACTIVE') {
      throw new Error(`Assigned vehicle ${route.vehicle.registrationNumber} is ${route.vehicle.status}. Cannot accept new assignments.`)
    }

    // 5. Duplicate Active Assignment Protection
    const existingActive = await db.studentTransportAssignment.findFirst({
      where: {
        tenantId: ctx.tenantId,
        studentId,
        academicSessionId: session.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
    })
    if (existingActive) {
      throw new Error('Student already has an active transport assignment for this academic session. Cancel or end-date the existing assignment first.')
    }

    // Execute within database transaction with capacity count check
    const assignment = await db.$transaction(async (tx) => {
      const activeCount = await tx.studentTransportAssignment.count({
        where: {
          tenantId: ctx.tenantId,
          routeId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      })

      if (activeCount >= route.vehicle!.capacity) {
        throw new Error(`Vehicle capacity exceeded: Route ${route.code} vehicle ${route.vehicle!.registrationNumber} is full (${activeCount}/${route.vehicle!.capacity} seats filled).`)
      }

      const created = await tx.studentTransportAssignment.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: student.branchId || route.branchId || null,
          academicSessionId: session.id,
          studentId,
          routeId,
          pickupStopId: pStop.id,
          dropStopId: dStop.id,
          tripType: normalizedTripType,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          status: 'ACTIVE',
          monthlyFeeCents: Math.max(0, monthlyFeeCents),
        },
        include: {
          student: true,
          route: { include: { vehicle: true } },
          pickupStop: true,
          dropStop: true,
        },
      })

      // If transport fee is configured and invoice requested, generate canonical Invoice
      if (generateFeeInvoice && monthlyFeeCents > 0) {
        let invoiceBranchId = student.branchId || route.branchId
        if (!invoiceBranchId) {
          const fallbackBranch = await tx.branch.findFirst({ where: { tenantId: ctx.tenantId } })
          invoiceBranchId = fallbackBranch?.id || null
        }

        if (invoiceBranchId) {
          const invNumber = `INV-TRP-${Date.now().toString().slice(-6)}`
          await tx.invoice.create({
            data: {
              tenantId: ctx.tenantId,
              branchId: invoiceBranchId,
              studentId: student.id,
              academicSessionId: session.id,
              invoiceNumber: invNumber,
              title: `Transport Fee — Route ${route.code}`,
              dueDate: new Date(Date.now() + 15 * 86400000),
              subtotalCents: monthlyFeeCents,
              totalCents: monthlyFeeCents,
              paidCents: 0,
              balanceCents: monthlyFeeCents,
              status: 'ISSUED',
              notes: `Monthly transport fee for Route ${route.name} (${pStop.name} to ${dStop.name})`,
              items: {
                create: [
                  {
                    feeHead: 'TRANSPORT',
                    description: `Transport fee: Route ${route.code} (${route.name})`,
                    amountCents: monthlyFeeCents,
                  },
                ],
              },
            },
          })
        }
      }

      return created
    })

    // Child event on timeline
    await recordChildEvent({
      tenantId: ctx.tenantId,
      studentId,
      type: 'NOTE',
      title: 'Transport Assigned',
      body: `Assigned to Route ${route.name} (${route.code}). Pickup: ${pStop.name} (${pStop.morningPickupTime}), Drop: ${dStop.name} (${dStop.eveningDropTime}).`,
      actorId: ctx.actorId,
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: student.branchId,
      academicSessionId: session.id,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'ASSIGN_STUDENT_TRANSPORT',
      entity: 'StudentTransportAssignment',
      entityId: assignment.id,
      module: 'TRANSPORT',
      summary: `Assigned student ${student.firstName} to Route ${route.name} (${route.code})`,
    })

    return assignment
  }

  static async listAssignments(
    ctx: ScopeContext,
    filter?: { routeId?: string; studentId?: string; status?: TransportAssignmentStatus; branchId?: string }
  ) {
    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
      ...(filter?.routeId ? { routeId: filter.routeId } : {}),
      ...(filter?.studentId ? { studentId: filter.studentId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.branchId || ctx.branchId ? { branchId: filter?.branchId || ctx.branchId } : {}),
    }

    return db.studentTransportAssignment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNo: true,
            currentClassroom: { select: { id: true, name: true } },
            guardians: {
              include: {
                guardian: {
                  select: { id: true, fullName: true, phone: true, relationship: true, userId: true },
                },
              },
            },
          },
        },
        route: {
          include: {
            vehicle: true,
            driverProfile: { include: { user: { select: { fullName: true, phone: true } } } },
          },
        },
        pickupStop: true,
        dropStop: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async cancelAssignment(ctx: ScopeContext, assignmentId: string, reason?: string) {
    const existing = await db.studentTransportAssignment.findFirst({
      where: { id: assignmentId, tenantId: ctx.tenantId, deletedAt: null },
      include: { student: true, route: true },
    })
    if (!existing) throw new Error('Transport assignment not found')

    const updated = await db.studentTransportAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'CANCELLED',
        endDate: new Date(),
      },
    })

    await recordChildEvent({
      tenantId: ctx.tenantId,
      studentId: existing.studentId,
      type: 'NOTE',
      title: 'Transport Service Discontinued',
      body: `Transport discontinued for Route ${existing.route.name}. Reason: ${reason || 'Requested by school/parent'}.`,
      actorId: ctx.actorId,
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: existing.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'CANCEL_TRANSPORT_ASSIGNMENT',
      entity: 'StudentTransportAssignment',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Cancelled transport assignment for student ${existing.student.firstName} on Route ${existing.route.name}`,
    })

    return updated
  }

  /**
   * 5. DAILY OPERATIONAL TRIPS & MANIFESTS
   */
  static async startTrip(ctx: ScopeContext, input: StartTripInput) {
    const { routeId, tripType, tripDate = new Date() } = input

    const dateObj = new Date(tripDate)
    dateObj.setHours(0, 0, 0, 0)

    const route = await db.transportRoute.findFirst({
      where: { id: routeId, tenantId: ctx.tenantId, deletedAt: null },
      include: {
        vehicle: true,
        driverProfile: true,
        attendantProfile: true,
        stops: { orderBy: { sequence: 'asc' } },
      },
    })
    if (!route) throw new Error('Route not found')
    if (route.status !== 'ACTIVE') throw new Error('Cannot start a trip for an INACTIVE route')

    // Determine and validate vehicle
    const vehicleId = input.vehicleId || route.vehicleId
    if (!vehicleId) throw new Error('No vehicle assigned to this route or trip')
    const vehicle = await db.vehicle.findFirst({
      where: { id: vehicleId, tenantId: ctx.tenantId, deletedAt: null },
    })
    if (!vehicle) throw new Error('Vehicle not found')
    if (vehicle.status !== 'ACTIVE') {
      throw new Error(`Vehicle ${vehicle.registrationNumber} is ${vehicle.status}. Trip cannot start with an unavailable vehicle.`)
    }

    // Determine and validate driver from StaffProfile
    const driverId = input.driverProfileId || route.driverProfileId
    if (!driverId) throw new Error('No driver assigned to this route or trip')
    await this.validateStaffEligibility(ctx.tenantId, driverId, 'driver')

    // Determine and validate attendant from StaffProfile if present
    const attendantId = input.attendantProfileId || route.attendantProfileId
    if (attendantId) {
      await this.validateStaffEligibility(ctx.tenantId, attendantId, 'attendant')
    }

    // Concurrency / overlapping trip check: Ensure vehicle is not already running an active trip
    const overlappingVehicleTrip = await db.transportTrip.findFirst({
      where: {
        tenantId: ctx.tenantId,
        vehicleId,
        tripDate: dateObj,
        status: 'IN_PROGRESS',
        routeId: { not: routeId },
      },
      include: { route: true },
    })
    if (overlappingVehicleTrip) {
      throw new Error(`Vehicle ${vehicle.registrationNumber} is already in use for active trip on route ${overlappingVehicleTrip.route.name}`)
    }

    // Concurrency / overlapping trip check: Ensure driver is not already running an active trip
    const overlappingDriverTrip = await db.transportTrip.findFirst({
      where: {
        tenantId: ctx.tenantId,
        driverProfileId: driverId,
        tripDate: dateObj,
        status: 'IN_PROGRESS',
        routeId: { not: routeId },
      },
      include: { route: true },
    })
    if (overlappingDriverTrip) {
      throw new Error(`Driver is currently running an active trip in progress on route ${overlappingDriverTrip.route.name}`)
    }

    // Check if trip already exists for this route, date and trip type
    const existingTrip = await db.transportTrip.findUnique({
      where: {
        tenantId_routeId_tripDate_tripType: {
          tenantId: ctx.tenantId,
          routeId,
          tripDate: dateObj,
          tripType,
        },
      },
      include: { manifest: true },
    })

    if (existingTrip) {
      if (existingTrip.status === 'COMPLETED') {
        throw new Error(`Trip for ${tripType} on this date is already COMPLETED`)
      }
      return existingTrip
    }

    // Dynamic Manifest Generation: Query active assignments for this route
    const tripFilter: TransportTripType[] = tripType === 'MORNING' ? ['TWO_WAY', 'MORNING_ONLY'] : ['TWO_WAY', 'EVENING_ONLY']
    const activeAssignments = await db.studentTransportAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        routeId,
        status: 'ACTIVE',
        tripType: { in: tripFilter },
        deletedAt: null,
      },
      include: { student: true },
    })

    const trip = await db.$transaction(async (tx) => {
      const createdTrip = await tx.transportTrip.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: route.branchId,
          routeId,
          vehicleId,
          driverProfileId: driverId,
          attendantProfileId: attendantId || null,
          tripDate: dateObj,
          tripType,
          status: 'IN_PROGRESS',
          scheduledStartTime: tripType === 'MORNING' ? '08:00' : '15:00',
          actualStartTime: new Date(),
        },
      })

      // Create manifest entries for each assigned active student
      if (activeAssignments.length > 0) {
        await tx.tripManifestItem.createMany({
          data: activeAssignments.map((a) => ({
            tripId: createdTrip.id,
            studentId: a.studentId,
            stopId: tripType === 'MORNING' ? a.pickupStopId : a.dropStopId,
            status: 'EXPECTED',
          })),
        })
      }

      return tx.transportTrip.findUniqueOrThrow({
        where: { id: createdTrip.id },
        include: {
          manifest: { include: { student: true, stop: true } },
          vehicle: true,
          route: true,
          driverProfile: { include: { user: true } },
        },
      })
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: route.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'START_TRANSPORT_TRIP',
      entity: 'TransportTrip',
      entityId: trip.id,
      module: 'TRANSPORT',
      summary: `Started ${tripType} trip for Route ${route.name} (${route.code}) with ${trip.manifest.length} students`,
    })

    return trip
  }

  static async recordBoarding(ctx: ScopeContext, input: RecordBoardingInput) {
    const { tripId, studentId, notes } = input

    const manifestItem = await db.tripManifestItem.findUnique({
      where: { tripId_studentId: { tripId, studentId } },
      include: {
        trip: { include: { route: true, vehicle: true } },
        student: true,
        stop: true,
      },
    })

    if (!manifestItem) {
      throw new Error('Student is not registered on this trip manifest')
    }

    if (manifestItem.status === 'BOARDED') {
      // Idempotency: already boarded, do not create duplicate events
      return manifestItem
    }

    const now = new Date()
    const updated = await db.tripManifestItem.update({
      where: { id: manifestItem.id },
      data: {
        status: 'BOARDED',
        boardedAt: now,
        actionById: ctx.actorId || null,
        actionByName: ctx.actorName || 'Attendant',
        notes: notes?.trim() || null,
      },
      include: { student: true, stop: true },
    })

    // Publish child timeline entry
    await recordChildEvent({
      tenantId: manifestItem.trip.tenantId,
      studentId,
      type: 'ARRIVAL',
      title: 'Boarded School Bus',
      body: `${manifestItem.student.firstName} safely boarded bus ${manifestItem.trip.vehicle.registrationNumber} (Route: ${manifestItem.trip.route.name}) at ${manifestItem.stop.name}.`,
      actorId: ctx.actorId,
    })

    await recordAudit({
      tenantId: manifestItem.trip.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'BOARD_STUDENT',
      entity: 'TripManifestItem',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Marked child ${manifestItem.student.firstName} as BOARDED at ${manifestItem.stop.name}`,
    })

    return updated
  }

  /**
   * 6. EVENING DROP & GUARDIAN VERIFICATION
   * Strictly evaluates the multi-guardian hierarchy using OperationPolicies.verifyPickupPerson.
   * Unauthorized persons are BLOCKED, and a CRITICAL safety follow-up is raised.
   */
  static async recordDrop(ctx: ScopeContext, input: RecordDropInput) {
    const { tripId, studentId, guardianId, phone, userId, pin, notes } = input

    const manifestItem = await db.tripManifestItem.findUnique({
      where: { tripId_studentId: { tripId, studentId } },
      include: {
        trip: { include: { route: true, vehicle: true } },
        student: true,
        stop: true,
      },
    })

    if (!manifestItem) {
      throw new Error('Student is not registered on this trip manifest')
    }

    if (manifestItem.status === 'DROPPED') {
      return manifestItem
    }

    // Tenant & Branch Context Scoping Guard
    if (ctx.tenantId && manifestItem.trip.tenantId !== ctx.tenantId) {
      throw new Error('UNAUTHORIZED_PICKUP: Tenant mismatch. Cannot drop student from different organization.')
    }
    if (ctx.branchId && manifestItem.trip.branchId && manifestItem.trip.branchId !== ctx.branchId) {
      throw new Error('UNAUTHORIZED_PICKUP: Branch mismatch. Cannot drop student from different campus branch.')
    }

    // 1. Verify Guardian Authorization & PIN via canonical OperationPolicies
    const authCheck = await OperationPolicies.verifyPickupPerson(
      manifestItem.trip.tenantId,
      studentId,
      { guardianId, phone, userId, pin: pin || undefined },
      pin
    )

    if (!authCheck.authorized) {
      const attemptedTarget = guardianId || phone || userId || 'Provided-PIN'

      // Raise emergency safety follow-up
      await raiseFollowUp({
        tenantId: manifestItem.trip.tenantId,
        branchId: manifestItem.trip.branchId || manifestItem.student.branchId,
        domain: 'SAFETY',
        severity: 'EMERGENCY',
        title: `Bus Drop Blocked: Unauthorized Guardian for ${manifestItem.student.firstName}`,
        detail: `Attempted bus drop verification failed for ${attemptedTarget}. Reason: ${authCheck.reason}. Bus: ${manifestItem.trip.vehicle.registrationNumber}, Stop: ${manifestItem.stop.name}.`,
        sourceType: 'TransportDrop',
        sourceId: tripId,
        studentId,
        responsibleRole: 'PRINCIPAL',
      })

      await recordAudit({
        tenantId: manifestItem.trip.tenantId,
        branchId: manifestItem.trip.branchId || undefined,
        actorId: ctx.actorId,
        actorName: ctx.actorName,
        actorRole: ctx.actorRole,
        action: 'PICKUP_BLOCKED',
        entity: 'TripManifestItem',
        entityId: manifestItem.id,
        module: 'TRANSPORT',
        severity: 'CRITICAL',
        summary: `Unauthorized pickup blocked at bus stop ${manifestItem.stop.name} for child ${manifestItem.student.firstName}. Reason: ${authCheck.reason}`,
      })

      throw new Error(`UNAUTHORIZED_PICKUP: ${authCheck.reason}`)
    }

    // 2. Drop Approved: Update manifest and timeline atomically to prevent duplicate pickup races
    const now = new Date()
    const updateResult = await db.tripManifestItem.updateMany({
      where: { id: manifestItem.id, status: { not: 'DROPPED' } },
      data: {
        status: 'DROPPED',
        droppedAt: now,
        verifiedGuardianId: authCheck.guardianId || null,
        actionById: ctx.actorId || null,
        actionByName: ctx.actorName || 'Attendant',
        notes: notes?.trim() || null,
      },
    })

    if (updateResult.count === 0) {
      throw new Error('DUPLICATE_PICKUP: Child has already been dropped/handed over.')
    }

    const updated = await db.tripManifestItem.findUniqueOrThrow({
      where: { id: manifestItem.id },
      include: { student: true, stop: true },
    })

    await recordChildEvent({
      tenantId: manifestItem.trip.tenantId,
      studentId,
      type: 'PICKUP',
      title: 'Handed Over to Guardian',
      body: `${manifestItem.student.firstName} was handed over to ${authCheck.guardianName || 'authorized guardian'} (${authCheck.relationship || 'Guardian'}) at ${manifestItem.stop.name}.`,
      actorId: ctx.actorId,
    })

    await recordAudit({
      tenantId: manifestItem.trip.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'DROP_STUDENT',
      entity: 'TripManifestItem',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Student ${manifestItem.student.firstName} safely dropped to ${authCheck.guardianName} (${authCheck.relationship}) at ${manifestItem.stop.name}`,
    })

    return updated
  }

  /**
   * 7. SCHOOL ARRIVAL & TRIP COMPLETION
   */
  static async completeTrip(ctx: ScopeContext, tripId: string) {
    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: { route: true, manifest: { include: { student: true } } },
    })
    if (!trip) throw new Error('Trip not found')

    const updated = await db.transportTrip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        actualEndTime: new Date(),
      },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: trip.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'COMPLETE_TRIP',
      entity: 'TransportTrip',
      entityId: trip.id,
      module: 'TRANSPORT',
      summary: `Trip ${trip.tripType} completed for Route ${trip.route.name}. Total students: ${trip.manifest.length}`,
    })

    return updated
  }

  /**
   * 8. DELAY MANAGEMENT & TARGETED NOTIFICATION
   */
  static async recordDelay(ctx: ScopeContext, tripId: string, delayMinutes: number, reason: string) {
    if (delayMinutes <= 0) throw new Error('Delay minutes must be greater than 0')
    if (!reason || !reason.trim()) throw new Error('Delay reason is required')

    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: {
        route: true,
        vehicle: true,
        manifest: { include: { student: true } },
      },
    })
    if (!trip) throw new Error('Trip not found')

    // Delay Idempotency: If the delay minutes and reason are identical, do not duplicate timeline alerts
    if (trip.delayMinutes === delayMinutes && trip.delayReason?.trim() === reason.trim()) {
      return trip
    }

    const updated = await db.transportTrip.update({
      where: { id: tripId },
      data: {
        delayMinutes,
        delayReason: reason.trim(),
      },
    })

    // Notify affected students only (via ChildEvent Timeline)
    for (const item of trip.manifest) {
      await recordChildEvent({
        tenantId: ctx.tenantId,
        studentId: item.studentId,
        type: 'NOTE',
        title: 'Bus Delay Alert',
        body: `School bus ${trip.vehicle.registrationNumber} (Route: ${trip.route.name}) is delayed by approximately ${delayMinutes} mins. Reason: ${reason.trim()}.`,
        actorId: ctx.actorId,
      })
    }

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: trip.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'TRIP_DELAYED',
      entity: 'TransportTrip',
      entityId: trip.id,
      module: 'TRANSPORT',
      summary: `Trip for Route ${trip.route.name} delayed by ${delayMinutes}m. Reason: ${reason}`,
    })

    return updated
  }

  /**
   * 9. INCIDENT REPORTING & EMERGENCY SAFETY INTEGRATION
   */
  static async reportIncident(ctx: ScopeContext, input: ReportIncidentInput) {
    const { tripId, vehicleId, studentId, severity, category, title, description, actionTaken } = input

    if (!title?.trim() || !description?.trim()) {
      throw new Error('Title and description are required for an incident report')
    }

    const incident = await db.transportIncident.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId || null,
        tripId: tripId || null,
        vehicleId: vehicleId || null,
        studentId: studentId || null,
        severity,
        category,
        title: title.trim(),
        description: description.trim(),
        actionTaken: actionTaken?.trim() || null,
        status: 'REPORTED',
        reportedById: ctx.actorId || 'system',
        reportedByName: ctx.actorName || 'Staff Member',
      },
    })

    // For HIGH or CRITICAL severity, raise emergency FollowUp in Operations
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      await raiseFollowUp({
        tenantId: ctx.tenantId,
        branchId: ctx.branchId || null,
        domain: 'SAFETY',
        severity: severity === 'CRITICAL' ? 'EMERGENCY' : 'URGENT',
        title: `Transport Safety Incident: ${title.trim()}`,
        detail: `[Category: ${category}] ${description.trim()}. Reported by: ${ctx.actorName || 'Staff'}.`,
        sourceType: 'TransportIncident',
        sourceId: incident.id,
        studentId: studentId || undefined,
        responsibleRole: 'PRINCIPAL',
      })
    }

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'REPORT_TRANSPORT_INCIDENT',
      entity: 'TransportIncident',
      entityId: incident.id,
      module: 'TRANSPORT',
      severity: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      summary: `Reported transport incident: ${title.trim()} (${severity}/${category})`,
    })

    return incident
  }

  /**
   * 9b. INCIDENT RESOLUTION & CORRECTION
   */
  static async updateIncident(
    ctx: ScopeContext,
    id: string,
    data: {
      status?: TransportIncidentStatus
      actionTaken?: string
      resolutionNotes?: string
      severity?: TransportIncidentSeverity
      category?: TransportIncidentCategory
      correctionReason?: string
    }
  ) {
    const existing = await db.transportIncident.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { trip: true, vehicle: true, student: true },
    })
    if (!existing) throw new Error('Transport incident not found')

    const oldStatus = existing.status
    const isResolving = data.status === 'RESOLVED' && oldStatus !== 'RESOLVED'

    const updated = await db.transportIncident.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.actionTaken !== undefined ? { actionTaken: data.actionTaken?.trim() || null } : {}),
        ...(isResolving ? { resolvedAt: new Date() } : {}),
        ...(data.severity ? { severity: data.severity } : {}),
        ...(data.category ? { category: data.category } : {}),
      },
    })

    // If there was an operations FollowUp created for this incident and it's being resolved
    if (isResolving) {
      await db.followUp.updateMany({
        where: {
          tenantId: ctx.tenantId,
          sourceType: 'TransportIncident',
          sourceId: id,
          status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      }).catch(() => {})
    }

    await recordAudit({
      tenantId: ctx.tenantId,
      branchId: existing.branchId || undefined,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: isResolving ? 'RESOLVE_TRANSPORT_INCIDENT' : 'UPDATE_TRANSPORT_INCIDENT',
      entity: 'TransportIncident',
      entityId: existing.id,
      module: 'TRANSPORT',
      summary: `Incident "${existing.title}" status changed: ${oldStatus} -> ${updated.status}. ${data.correctionReason ? `Correction reason: ${data.correctionReason}` : ''}`,
    })

    return updated
  }

  /**
   * 10. IN-FLIGHT VEHICLE & DRIVER SUBSTITUTION
   * Preserves historical records safely without mutating past completed trips.
   */
  static async replaceTripVehicle(ctx: ScopeContext, tripId: string, newVehicleId: string, reason?: string) {
    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: { vehicle: true },
    })
    if (!trip) throw new Error('Trip not found')
    if (trip.status === 'COMPLETED') throw new Error('Cannot change vehicle on a COMPLETED trip')

    const newVehicle = await db.vehicle.findFirst({
      where: { id: newVehicleId, tenantId: ctx.tenantId, deletedAt: null },
    })
    if (!newVehicle) throw new Error('Replacement vehicle not found')
    if (newVehicle.status !== 'ACTIVE') {
      throw new Error(`Replacement vehicle ${newVehicle.registrationNumber} is ${newVehicle.status}. Cannot be assigned.`)
    }

    const updated = await db.transportTrip.update({
      where: { id: tripId },
      data: {
        vehicleId: newVehicleId,
        notes: [trip.notes, `Vehicle replaced from ${trip.vehicle.registrationNumber} to ${newVehicle.registrationNumber}. Reason: ${reason || 'Operational replacement'}`].filter(Boolean).join('. '),
      },
      include: { vehicle: true },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'REPLACE_TRIP_VEHICLE',
      entity: 'TransportTrip',
      entityId: trip.id,
      module: 'TRANSPORT',
      summary: `Replaced trip vehicle: ${trip.vehicle.registrationNumber} -> ${newVehicle.registrationNumber}`,
    })

    return updated
  }

  static async replaceTripDriver(ctx: ScopeContext, tripId: string, newStaffProfileId: string, reason?: string) {
    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: { driverProfile: { include: { user: true } } },
    })
    if (!trip) throw new Error('Trip not found')
    if (trip.status === 'COMPLETED') throw new Error('Cannot change driver on a COMPLETED trip')

    await this.validateStaffEligibility(ctx.tenantId, newStaffProfileId, 'driver')

    const newDriver = await db.staffProfile.findUniqueOrThrow({
      where: { id: newStaffProfileId },
      include: { user: true },
    })

    const updated = await db.transportTrip.update({
      where: { id: tripId },
      data: {
        driverProfileId: newStaffProfileId,
        notes: [trip.notes, `Driver replaced from ${trip.driverProfile.user.fullName} to ${newDriver.user.fullName}. Reason: ${reason || 'Duty handover'}`].filter(Boolean).join('. '),
      },
      include: { driverProfile: { include: { user: true } } },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'REPLACE_TRIP_DRIVER',
      entity: 'TransportTrip',
      entityId: trip.id,
      module: 'TRANSPORT',
      summary: `Replaced trip driver: ${trip.driverProfile.user.fullName} -> ${newDriver.user.fullName}`,
    })

    return updated
  }

  /**
   * 11. STAFF ELIGIBILITY VALIDATION
   * Validates active status, tenant, branch, non-terminated HR state, transport designation, and license expiry.
   */
  static async validateStaffEligibility(tenantId: string, staffProfileId: string, roleType: 'driver' | 'attendant') {
    const profile = await db.staffProfile.findFirst({
      where: { id: staffProfileId, tenantId, deletedAt: null },
      include: {
        user: true,
        tenantUser: { select: { role: true, roles: true } },
        documents: true,
      },
    })

    if (!profile) {
      throw new Error(`Assigned ${roleType} staff profile not found in this school`)
    }

    if (profile.status !== 'ACTIVE' || profile.user.status !== 'ACTIVE') {
      throw new Error(`Selected staff member ${profile.user.fullName} is ${profile.status} and cannot be assigned as ${roleType}. Active staff required.`)
    }

    // Role / designation check: Staff must have transport role, designation, or department
    const des = (profile.designation || '').toLowerCase().trim()
    const dept = (profile.department || '').toLowerCase().trim()
    const role = profile.tenantUser?.role
    const roles = profile.tenantUser?.roles || []

    const isTransportRole = role === 'DRIVER' || role === 'ATTENDANT' || roles.includes('DRIVER') || roles.includes('ATTENDANT')
    const transportKeywords = ['driver', 'attendant', 'conductor', 'chaperone', 'transport', 'pilot', 'bus']
    const hasTransportKeyword = transportKeywords.some((kw) => des.includes(kw))
    const transportDepts = ['transport', 'transportation', 'logistics', 'fleet']
    const hasTransportDept = transportDepts.some((kw) => dept.includes(kw))

    if (!isTransportRole && !hasTransportKeyword && !hasTransportDept) {
      throw new Error(`Staff member ${profile.user.fullName} (${profile.designation || 'Staff'}) is not designated for transport operations and cannot be assigned as a ${roleType}.`)
    }

    // Check driving license validity if roleType is driver
    if (roleType === 'driver') {
      let licenseExpiry: Date | null = null
      let licenseNo: string | null = null

      if (profile.qualification && profile.qualification.startsWith('{')) {
        try {
          const q = JSON.parse(profile.qualification)
          if (q.licenseExpiry) licenseExpiry = new Date(q.licenseExpiry)
          if (q.licenseNumber) licenseNo = q.licenseNumber
        } catch {}
      }

      const dlDoc = profile.documents?.find((d) => d.fileName === 'DRIVING_LICENSE' || (d.docType === 'OTHER' && d.documentNumber))
      if (dlDoc) {
        if (dlDoc.expiryDate) licenseExpiry = dlDoc.expiryDate
        if (dlDoc.documentNumber) licenseNo = dlDoc.documentNumber
      }

      if (licenseExpiry && !isNaN(licenseExpiry.getTime())) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (licenseExpiry < today) {
          throw new Error(`Cannot assign driver ${profile.user.fullName}: Driving license ${licenseNo ? `(${licenseNo}) ` : ''}expired on ${licenseExpiry.toISOString().split('T')[0]}`)
        }
      }
    }

    return profile
  }

  /**
   * 12. DRIVER DIRECTORY & MANAGEMENT
   */
  static async listDrivers(ctx: ScopeContext, filter?: { branchId?: string; search?: string }) {
    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
      ...(filter?.branchId || ctx.branchId ? { branchId: filter?.branchId || ctx.branchId } : {}),
    }

    const staffList = await db.staffProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, avatarUrl: true, status: true } },
        branch: { select: { id: true, name: true, code: true } },
        tenantUser: { select: { role: true, roles: true } },
        documents: true,
        drivenRoutes: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true, vehicle: { select: { id: true, registrationNumber: true, makeModel: true } } },
        },
      },
      orderBy: { employeeCode: 'asc' },
    })

    const transportStaff = staffList.filter((s) => {
      const des = (s.designation || '').toLowerCase().trim()
      const dept = (s.department || '').toLowerCase().trim()
      const role = s.tenantUser?.role
      const roles = s.tenantUser?.roles || []

      if (role === 'DRIVER' || role === 'ATTENDANT') return true
      if (roles.includes('DRIVER') || roles.includes('ATTENDANT')) return true

      const transportKeywords = ['driver', 'attendant', 'conductor', 'chaperone', 'transport', 'pilot', 'bus']
      if (transportKeywords.some((kw) => des.includes(kw))) return true

      const transportDepts = ['transport', 'transportation', 'logistics', 'fleet']
      if (transportDepts.some((kw) => dept.includes(kw))) return true

      return false
    })

    const now = new Date()
    const thirtyDaysAhead = new Date()
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30)

    return transportStaff.map((s) => {
      let licenseNumber: string | null = null
      let licenseExpiry: string | null = null
      let licenseCategory: string | null = null

      if (s.qualification && s.qualification.startsWith('{')) {
        try {
          const q = JSON.parse(s.qualification)
          licenseNumber = q.licenseNumber || null
          licenseExpiry = q.licenseExpiry || null
          licenseCategory = q.licenseCategory || null
        } catch {}
      }

      const dlDoc = s.documents.find((d) => d.fileName === 'DRIVING_LICENSE' || (d.docType === 'OTHER' && d.documentNumber))
      if (dlDoc) {
        if (!licenseNumber && dlDoc.documentNumber) licenseNumber = dlDoc.documentNumber
        if (!licenseExpiry && dlDoc.expiryDate) licenseExpiry = dlDoc.expiryDate.toISOString().split('T')[0]
      }

      let licenseStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNSPECIFIED' = 'UNSPECIFIED'
      let licenseWarning: string | null = null

      if (licenseExpiry) {
        const d = new Date(licenseExpiry)
        if (!isNaN(d.getTime())) {
          if (d < now) {
            licenseStatus = 'EXPIRED'
            licenseWarning = `License expired on ${d.toISOString().split('T')[0]}`
          } else if (d <= thirtyDaysAhead) {
            licenseStatus = 'EXPIRING_SOON'
            const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            licenseWarning = `License expires in ${days} day${days === 1 ? '' : 's'}`
          } else {
            licenseStatus = 'VALID'
          }
        }
      }

      return {
        id: s.id,
        userId: s.userId,
        employeeCode: s.employeeCode,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        avatarUrl: s.user.avatarUrl,
        designation: s.designation || 'Driver',
        department: s.department || 'Transport',
        role: s.tenantUser?.role || 'DRIVER',
        status: s.status,
        userStatus: s.user.status,
        branchId: s.branchId,
        branchName: s.branch?.name || null,
        emergencyContactName: s.emergencyContactName,
        emergencyContactPhone: s.emergencyContactPhone,
        licenseNumber,
        licenseExpiry,
        licenseCategory,
        licenseStatus,
        licenseWarning,
        assignedRoutes: s.drivenRoutes.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          vehicle: r.vehicle ? { id: r.vehicle.id, registrationNumber: r.vehicle.registrationNumber, makeModel: r.vehicle.makeModel } : null,
        })),
      }
    })
  }

  static async getDriver(ctx: ScopeContext, staffProfileId: string) {
    const drivers = await this.listDrivers(ctx)
    return drivers.find((d) => d.id === staffProfileId) || null
  }

  static async registerDriver(
    ctx: ScopeContext,
    input: {
      staffProfileId?: string
      userId?: string
      branchId?: string | null
      employeeCode?: string
      fullName?: string
      phone?: string
      email?: string
      licenseNumber?: string
      licenseExpiry?: string | null
      licenseCategory?: string
      emergencyContactName?: string
      emergencyContactPhone?: string
    }
  ) {
    if (input.staffProfileId) {
      // Existing staff onboarding to transport
      const staff = await db.staffProfile.findFirst({
        where: { id: input.staffProfileId, tenantId: ctx.tenantId, deletedAt: null },
        include: { user: true },
      })
      if (!staff) throw new Error('Staff profile not found')

      const qualificationData = {
        licenseNumber: input.licenseNumber?.trim() || null,
        licenseExpiry: input.licenseExpiry || null,
        licenseCategory: input.licenseCategory?.trim() || 'LMV/HMV',
      }

      const updated = await db.$transaction(async (tx) => {
        const sp = await tx.staffProfile.update({
          where: { id: staff.id },
          data: {
            designation: staff.designation && staff.designation.toLowerCase().includes('driver') ? staff.designation : 'Transport Driver',
            department: staff.department || 'Transport',
            qualification: JSON.stringify(qualificationData),
            emergencyContactName: input.emergencyContactName?.trim() || staff.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone?.trim() || staff.emergencyContactPhone,
            status: 'ACTIVE',
          },
        })

        if (input.licenseNumber?.trim()) {
          const existingDoc = await tx.staffDocument.findFirst({
            where: { staffProfileId: staff.id, fileName: 'DRIVING_LICENSE' },
          })
          if (existingDoc) {
            await tx.staffDocument.update({
              where: { id: existingDoc.id },
              data: {
                documentNumber: input.licenseNumber.trim(),
                expiryDate: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
              },
            })
          } else {
            await tx.staffDocument.create({
              data: {
                tenantId: ctx.tenantId,
                staffProfileId: staff.id,
                docType: 'OTHER',
                fileName: 'DRIVING_LICENSE',
                fileUrl: '/documents/driving-license',
                documentNumber: input.licenseNumber.trim(),
                expiryDate: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
                verificationStatus: 'VERIFIED',
              },
            })
          }
        }

        return sp
      })

      await recordAudit({
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        actorName: ctx.actorName,
        actorRole: ctx.actorRole,
        action: 'ONBOARD_DRIVER',
        entity: 'StaffProfile',
        entityId: updated.id,
        module: 'TRANSPORT',
        summary: `Staff ${staff.user.fullName} onboarded as Transport Driver`,
      })

      return this.getDriver(ctx, updated.id)
    }

    // New driver creation requires employeeCode, fullName, phone
    if (!input.fullName || !input.fullName.trim()) throw new Error('Driver full name is required')
    if (!input.phone || !input.phone.trim()) throw new Error('Driver phone number is required')
    if (!input.employeeCode || !input.employeeCode.trim()) throw new Error('Driver employee code is required')

    const empNorm = input.employeeCode.trim().toUpperCase()
    const existingCode = await db.staffProfile.findUnique({
      where: { tenantId_employeeCode: { tenantId: ctx.tenantId, employeeCode: empNorm } },
    })
    if (existingCode) throw new Error(`Employee code ${empNorm} is already in use`)

    const driverName = input.fullName.trim()
    const driverPhone = input.phone.trim()

    const qualificationData = {
      licenseNumber: input.licenseNumber?.trim() || null,
      licenseExpiry: input.licenseExpiry || null,
      licenseCategory: input.licenseCategory?.trim() || 'LMV/HMV',
    }

    const created = await db.$transaction(async (tx) => {
      const email = input.email?.trim() || `driver.${empNorm.toLowerCase()}@school.internal`
      const user = await tx.user.create({
        data: {
          fullName: driverName,
          phone: driverPhone,
          email,
          passwordHash: 'DRIVER_AUTH_MANAGED',
          status: 'ACTIVE',
        },
      })

      await tx.tenantUser.create({
        data: {
          tenantId: ctx.tenantId,
          userId: user.id,
          role: 'DRIVER' as any,
          roles: ['DRIVER'] as any,
        },
      })

      const sp = await tx.staffProfile.create({
        data: {
          tenantId: ctx.tenantId,
          userId: user.id,
          branchId: input.branchId || ctx.branchId || null,
          employeeCode: empNorm,
          designation: 'Transport Driver',
          department: 'Transport',
          qualification: JSON.stringify(qualificationData),
          emergencyContactName: input.emergencyContactName?.trim() || null,
          emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
          status: 'ACTIVE',
        },
      })

      if (input.licenseNumber?.trim()) {
        await tx.staffDocument.create({
          data: {
            tenantId: ctx.tenantId,
            staffProfileId: sp.id,
            docType: 'OTHER',
            fileName: 'DRIVING_LICENSE',
            fileUrl: '/documents/driving-license',
            documentNumber: input.licenseNumber.trim(),
            expiryDate: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
            verificationStatus: 'VERIFIED',
          },
        })
      }

      return sp
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'CREATE_DRIVER',
      entity: 'StaffProfile',
      entityId: created.id,
      module: 'TRANSPORT',
      summary: `New transport driver created: ${input.fullName} (${empNorm})`,
    })

    return this.getDriver(ctx, created.id)
  }

  static async updateDriver(
    ctx: ScopeContext,
    staffProfileId: string,
    input: {
      licenseNumber?: string | null
      licenseExpiry?: string | null
      licenseCategory?: string | null
      emergencyContactName?: string | null
      emergencyContactPhone?: string | null
      status?: UserStatus
      branchId?: string | null
    }
  ) {
    const staff = await db.staffProfile.findFirst({
      where: { id: staffProfileId, tenantId: ctx.tenantId, deletedAt: null },
      include: { user: true },
    })
    if (!staff) throw new Error('Driver staff profile not found')

    let currentQ: any = {}
    if (staff.qualification && staff.qualification.startsWith('{')) {
      try {
        currentQ = JSON.parse(staff.qualification)
      } catch {}
    }

    const updatedQ = {
      ...currentQ,
      ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
      ...(input.licenseExpiry !== undefined ? { licenseExpiry: input.licenseExpiry } : {}),
      ...(input.licenseCategory !== undefined ? { licenseCategory: input.licenseCategory } : {}),
    }

    const updated = await db.$transaction(async (tx) => {
      const sp = await tx.staffProfile.update({
        where: { id: staff.id },
        data: {
          ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName?.trim() || null } : {}),
          ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone?.trim() || null } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.branchId !== undefined ? { branchId: input.branchId || null } : {}),
          qualification: JSON.stringify(updatedQ),
        },
      })

      if (input.licenseNumber !== undefined || input.licenseExpiry !== undefined) {
        const existingDoc = await tx.staffDocument.findFirst({
          where: { staffProfileId: staff.id, fileName: 'DRIVING_LICENSE' },
        })
        const licNo = input.licenseNumber !== undefined ? input.licenseNumber : currentQ.licenseNumber
        const licExp = input.licenseExpiry !== undefined ? input.licenseExpiry : currentQ.licenseExpiry

        if (existingDoc) {
          await tx.staffDocument.update({
            where: { id: existingDoc.id },
            data: {
              ...(licNo !== undefined ? { documentNumber: licNo } : {}),
              ...(licExp !== undefined ? { expiryDate: licExp ? new Date(licExp) : null } : {}),
            },
          })
        } else if (licNo) {
          await tx.staffDocument.create({
            data: {
              tenantId: ctx.tenantId,
              staffProfileId: staff.id,
              docType: 'OTHER',
              fileName: 'DRIVING_LICENSE',
              fileUrl: '/documents/driving-license',
              documentNumber: licNo,
              expiryDate: licExp ? new Date(licExp) : null,
              verificationStatus: 'VERIFIED',
            },
          })
        }
      }

      return sp
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'UPDATE_DRIVER',
      entity: 'StaffProfile',
      entityId: updated.id,
      module: 'TRANSPORT',
      summary: `Driver profile updated for ${staff.user.fullName} (${staff.employeeCode})`,
    })

    return this.getDriver(ctx, updated.id)
  }

  // ── BACKWARD COMPATIBILITY ALIASES ──
  static async getVehicles(ctx: ScopeContext, filter?: { status?: VehicleStatus; branchId?: string; search?: string }) {
    return this.listVehicles(ctx, filter)
  }

  static async getVehicle(ctx: ScopeContext, vehicleId: string) {
    const v = await db.vehicle.findFirst({
      where: { id: vehicleId, tenantId: ctx.tenantId, deletedAt: null },
      include: { routes: true, branch: true },
    })
    return v ? this.formatVehicle(v) : null
  }

  static async getRoutes(ctx: ScopeContext, filter?: { status?: RouteStatus; branchId?: string }) {
    return this.listRoutes(ctx, filter)
  }

  static async getRoute(ctx: ScopeContext, routeId: string) {
    return db.transportRoute.findFirst({
      where: { id: routeId, tenantId: ctx.tenantId, deletedAt: null },
      include: {
        vehicle: true,
        stops: { orderBy: { sequence: 'asc' } },
        driverProfile: { include: { user: true } },
        assignments: { where: { status: 'ACTIVE' }, include: { student: true } },
      },
    })
  }

  static async getStopsForRoute(ctx: ScopeContext, routeId: string) {
    return db.routeStop.findMany({
      where: { routeId, tenantId: ctx.tenantId },
      orderBy: { sequence: 'asc' },
    })
  }

  static async addStopToRoute(
    ctx: ScopeContext,
    input: {
      routeId: string
      name: string
      stopOrder?: number
      pickupTime?: string
      dropTime?: string
      landmark?: string
      address?: string
    }
  ) {
    const route = await db.transportRoute.findFirst({
      where: { id: input.routeId, tenantId: ctx.tenantId, deletedAt: null },
    })
    if (!route) throw new Error('Route not found')

    const count = await db.routeStop.count({ where: { routeId: input.routeId, tenantId: ctx.tenantId } })

    return db.routeStop.create({
      data: {
        tenantId: ctx.tenantId,
        routeId: input.routeId,
        name: input.name.trim(),
        sequence: input.stopOrder ?? count + 1,
        morningPickupTime: input.pickupTime || '07:30 AM',
        eveningDropTime: input.dropTime || '02:30 PM',
        landmark: input.landmark || input.address || null,
      },
    })
  }

  static async getStudentAssignments(
    ctx: ScopeContext,
    filter?: { routeId?: string; studentId?: string; status?: TransportAssignmentStatus; branchId?: string }
  ) {
    return this.listAssignments(ctx, filter)
  }

  static async assignStudentToRoute(ctx: ScopeContext, input: AssignStudentInput) {
    return this.assignStudent(ctx, input)
  }

  static async getStudentAssignmentById(ctx: ScopeContext, assignmentId: string) {
    return db.studentTransportAssignment.findFirst({
      where: { id: assignmentId, tenantId: ctx.tenantId, deletedAt: null },
      include: {
        student: true,
        route: true,
        pickupStop: true,
        dropStop: true,
      },
    })
  }

  static async updateStudentAssignment(ctx: ScopeContext, assignmentId: string, data: any) {
    const existing = await db.studentTransportAssignment.findFirst({
      where: { id: assignmentId, tenantId: ctx.tenantId, deletedAt: null },
    })
    if (!existing) throw new Error('Assignment not found')

    return db.studentTransportAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.pickupStopId ? { pickupStopId: data.pickupStopId } : {}),
        ...(data.dropStopId ? { dropStopId: data.dropStopId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    })
  }

  static async deleteStudentAssignment(ctx: ScopeContext, assignmentId: string) {
    return this.cancelAssignment(ctx, assignmentId)
  }

  static async getTrips(
    ctx: ScopeContext,
    filter?: { routeId?: string; driverId?: string; status?: TripStatus; date?: Date }
  ) {
    const where: any = {
      tenantId: ctx.tenantId,
      ...(filter?.routeId ? { routeId: filter.routeId } : {}),
      ...(filter?.driverId ? { driverProfileId: filter.driverId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.date
        ? {
            scheduledDate: {
              gte: new Date(filter.date.setHours(0, 0, 0, 0)),
              lte: new Date(filter.date.setHours(23, 59, 59, 999)),
            },
          }
        : {}),
    }

    return db.transportTrip.findMany({
      where,
      include: {
        route: true,
        vehicle: true,
        driverProfile: { include: { user: true } },
        manifest: { include: { student: true, stop: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async getTripById(ctx: ScopeContext, tripId: string) {
    return db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: {
        route: true,
        vehicle: true,
        driverProfile: { include: { user: true } },
        manifest: { include: { student: true, stop: true } },
      },
    })
  }

  /**
   * Submit Bus Arrival (Driver operation)
   */
  static async submitTripArrival(ctx: ScopeContext, tripId: string, studentIds: string[]) {
    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: { route: true, vehicle: true },
    })
    if (!trip) throw new Error('Trip not found')

    if (studentIds.length > 0) {
      await db.tripManifestItem.updateMany({
        where: { tripId, studentId: { in: studentIds } },
        data: { status: 'ARRIVAL_SUBMITTED', boardedAt: new Date() },
      })

      // Fetch students and notify their class teachers
      const students = await db.student.findMany({
        where: { id: { in: studentIds }, tenantId: ctx.tenantId },
        include: {
          currentClassroom: {
            select: { primaryTeacherId: true },
          },
        },
      })

      for (const student of students) {
        const teacherUserId = student.currentClassroom?.primaryTeacherId
        if (teacherUserId) {
          await db.inAppNotification.create({
            data: {
              tenantId: ctx.tenantId,
              userId: teacherUserId,
              title: `Transport Arrival Reported: ${student.firstName} ${student.lastName || ''}`,
              body: `Bus ${trip.vehicle.registrationNumber} on ${trip.route.name} reported arrival for ${student.firstName}. Please verify arrival.`,
              category: 'TRANSPORT',
              severity: 'INFO',
              linkUrl: '/app/transport?tab=TEACHER',
              metadata: { tripId, studentId: student.id },
            },
          })
        }
      }

      await db.transportSecurityEvent.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: ctx.branchId ?? undefined,
          eventType: 'ARRIVAL_SUBMITTED',
          tripId: trip.id,
          vehicleId: trip.vehicleId,
          routeId: trip.routeId,
          driverProfileId: trip.driverProfileId,
          actorId: ctx.actorId || 'system',
          actorName: ctx.actorName || 'Driver',
          actorRole: ctx.actorRole || 'DRIVER',
          action: 'Driver Submitted Student Arrival',
          result: 'SUCCESS',
          reason: `Driver reported arrival for ${studentIds.length} student(s) on ${trip.route.name}`,
        },
      })
    }

    return db.transportTrip.update({
      where: { id: tripId },
      data: { status: 'COMPLETED', actualEndTime: new Date() },
    })
  }

  /**
   * Verify Student Arrival (Class Teacher operation)
   */
  static async verifyTripArrival(ctx: ScopeContext, tripId: string, studentIds: string[], notes?: string) {
    const trip = await db.transportTrip.findFirst({
      where: { id: tripId, tenantId: ctx.tenantId },
      include: { route: true, vehicle: true },
    })
    if (!trip) throw new Error('Trip not found')

    if (studentIds.length > 0) {
      await db.tripManifestItem.updateMany({
        where: { tripId, studentId: { in: studentIds } },
        data: { status: 'ARRIVAL_VERIFIED', droppedAt: new Date() },
      })

      // Fetch students and notify parents
      const students = await db.student.findMany({
        where: { id: { in: studentIds }, tenantId: ctx.tenantId },
        include: {
          guardians: {
            include: { guardian: { select: { userId: true, fullName: true } } },
          },
        },
      })

      for (const student of students) {
        for (const link of student.guardians) {
          if (link.guardian?.userId) {
            await db.inAppNotification.create({
              data: {
                tenantId: ctx.tenantId,
                userId: link.guardian.userId,
                title: `Safe Arrival Verified: ${student.firstName}`,
                body: `${student.firstName} ${student.lastName || ''}'s arrival at preschool has been verified by Class Teacher ${ctx.actorName}.`,
                category: 'TRANSPORT',
                severity: 'INFO',
                linkUrl: '/app/transport',
                metadata: { tripId, studentId: student.id },
              },
            })
          }
        }
      }

      await db.transportSecurityEvent.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: ctx.branchId ?? undefined,
          eventType: 'ARRIVAL_VERIFIED',
          tripId: trip.id,
          vehicleId: trip.vehicleId,
          routeId: trip.routeId,
          actorId: ctx.actorId || 'system',
          actorName: ctx.actorName || 'Teacher',
          actorRole: ctx.actorRole || 'TEACHER',
          action: 'Class Teacher Verified Student Arrival',
          result: 'SUCCESS',
          reason: `Teacher ${ctx.actorName} verified arrival for ${studentIds.length} student(s)`,
        },
      })
    }

    return db.transportTrip.update({
      where: { id: tripId },
      data: { notes: notes ? `${trip.notes || ''}\nArrival Verified by ${ctx.actorName}: ${notes}` : trip.notes },
    })
  }

  /**
   * Create Parent Route Selection / Request
   */
  static async createParentRouteSelection(
    ctx: ScopeContext,
    input: {
      studentId: string
      routeId: string
      pickupStopId: string
      dropStopId: string
      tripType?: TransportTripType
    }
  ) {
    if (!ctx.actorId) throw new Error('Authentication required')

    // Find guardian linked to student
    const guardian = await db.guardian.findFirst({
      where: { userId: ctx.actorId, tenantId: ctx.tenantId, deletedAt: null },
      include: { studentLinks: { where: { studentId: input.studentId } } },
    })

    if (!guardian || guardian.studentLinks.length === 0) {
      const isAdmin = ['OWNER', 'PRINCIPAL', 'COORDINATOR', 'PLATFORM_ADMIN'].includes(ctx.actorRole?.toUpperCase() || '')
      if (!isAdmin) {
        throw new Error('You are not authorized to select transport route for this student')
      }
    }

    // Verify route and stops
    const route = await db.transportRoute.findFirst({
      where: { id: input.routeId, tenantId: ctx.tenantId, deletedAt: null },
      include: { stops: true },
    })
    if (!route) throw new Error('Transport route not found')

    const pickupStop = route.stops.find((s) => s.id === input.pickupStopId)
    const dropStop = route.stops.find((s) => s.id === input.dropStopId)
    if (!pickupStop || !dropStop) throw new Error('Selected pickup or drop stop does not belong to this route')

    // Find active academic session
    const session = await db.academicSession.findFirst({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    })
    const academicSessionId = session?.id || ctx.academicSessionId || 'default-session'

    // Upsert student transport assignment with PENDING or ACTIVE status
    const existing = await db.studentTransportAssignment.findFirst({
      where: { tenantId: ctx.tenantId, studentId: input.studentId, deletedAt: null },
    })

    let assignment
    if (existing) {
      assignment = await db.studentTransportAssignment.update({
        where: { id: existing.id },
        data: {
          routeId: input.routeId,
          pickupStopId: input.pickupStopId,
          dropStopId: input.dropStopId,
          tripType: input.tripType || 'TWO_WAY',
          requestedByGuardianId: guardian?.id,
          status: 'PENDING',
        },
        include: { route: true, pickupStop: true, dropStop: true, student: true },
      })
    } else {
      assignment = await db.studentTransportAssignment.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: ctx.branchId || null,
          academicSessionId,
          studentId: input.studentId,
          routeId: input.routeId,
          pickupStopId: input.pickupStopId,
          dropStopId: input.dropStopId,
          tripType: input.tripType || 'TWO_WAY',
          requestedByGuardianId: guardian?.id,
          status: 'PENDING',
        },
        include: { route: true, pickupStop: true, dropStop: true, student: true },
      })
    }

    await recordAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'PARENT_ROUTE_SELECTION_SUBMITTED',
      entity: 'StudentTransportAssignment',
      entityId: assignment.id,
      module: 'TRANSPORT',
      summary: `Parent selected route ${route.name} for student ${assignment.student.firstName}`,
    })

    return assignment
  }

  /**
   * Fetch All Linked Children and Transport Details for Parent
   */
  static async getMyChildrenTransport(ctx: ScopeContext) {
    if (!ctx.actorId) return []

    const guardian = await db.guardian.findFirst({
      where: { userId: ctx.actorId, tenantId: ctx.tenantId, deletedAt: null },
      include: {
        studentLinks: {
          include: {
            student: {
              include: {
                currentClassroom: { select: { id: true, name: true, code: true } },
                transportAssignments: {
                  where: { deletedAt: null },
                  include: {
                    route: { select: { id: true, code: true, name: true, description: true } },
                    pickupStop: { select: { id: true, name: true, morningPickupTime: true } },
                    dropStop: { select: { id: true, name: true, eveningDropTime: true } },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!guardian) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const children: any[] = []

    for (const link of guardian.studentLinks) {
      const s = link.student
      const assignment = s.transportAssignments[0] || null

      // Fetch today's manifest status for this child
      const manifestItem = await db.tripManifestItem.findFirst({
        where: {
          studentId: s.id,
          trip: { tenantId: ctx.tenantId, tripDate: { gte: today, lt: tomorrow } },
        },
        include: { trip: true, stop: true },
        orderBy: { createdAt: 'desc' },
      })

      // Fetch pending pickup/drop authorizations for this child
      const pendingAuthorizations = await db.transportPickupAuthorization.findMany({
        where: { tenantId: ctx.tenantId, studentId: s.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      })

      children.push({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.firstName} ${s.lastName || ''}`,
        admissionNo: s.admissionNo,
        photoUrl: s.photoUrl,
        className: s.currentClassroom?.name || 'Unassigned',
        assignment: assignment
          ? {
              id: assignment.id,
              status: assignment.status,
              tripType: assignment.tripType,
              routeId: assignment.routeId,
              pickupStopId: assignment.pickupStopId,
              dropStopId: assignment.dropStopId,
              routeName: assignment.route.name,
              routeCode: assignment.route.code,
              pickupStop: assignment.pickupStop.name,
              pickupTime: assignment.pickupStop.morningPickupTime,
              dropStop: assignment.dropStop.name,
              dropTime: assignment.dropStop.eveningDropTime,
            }
          : null,
        todayStatus: manifestItem
          ? {
              status: manifestItem.status,
              boardedAt: manifestItem.boardedAt,
              droppedAt: manifestItem.droppedAt,
              tripType: manifestItem.trip.tripType,
            }
          : { status: 'EXPECTED', boardedAt: null, droppedAt: null },
        pendingAuthorizations,
      })
    }

    return children
  }

  /**
   * Fetch Class Transport Details for Class Teacher
   */
  static async getTeacherClassTransport(ctx: ScopeContext) {
    if (!ctx.actorId) return { students: [], pendingArrivals: [], pendingAuthorizations: [] }

    const teacherUser = await db.user.findFirst({
      where: { id: ctx.actorId },
      include: { taughtClasses: true },
    })

    const classroomIds = teacherUser ? teacherUser.taughtClasses.map((c) => c.id) : []

    const students = await db.student.findMany({
      where: { tenantId: ctx.tenantId, currentClassroomId: { in: classroomIds }, deletedAt: null },
      include: {
        currentClassroom: { select: { id: true, name: true } },
        transportAssignments: {
          where: { status: 'ACTIVE', deletedAt: null },
          include: {
            route: { select: { id: true, name: true, code: true } },
            pickupStop: { select: { id: true, name: true } },
            dropStop: { select: { id: true, name: true } },
          },
        },
      },
    })

    const studentIds = students.map((s) => s.id)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch today's manifest items for class students
    const manifestItems = await db.tripManifestItem.findMany({
      where: {
        studentId: { in: studentIds },
        trip: { tenantId: ctx.tenantId, tripDate: { gte: today, lt: tomorrow } },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        trip: { select: { id: true, tripType: true, route: { select: { name: true } } } },
        stop: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Fetch pending authorization requests for class students
    const pendingAuthorizations = await db.transportPickupAuthorization.findMany({
      where: { tenantId: ctx.tenantId, studentId: { in: studentIds }, status: 'PENDING' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        guardian: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      students: students.map((s) => ({
        studentId: s.id,
        fullName: `${s.firstName} ${s.lastName || ''}`,
        className: s.currentClassroom?.name,
        assignment: s.transportAssignments[0] || null,
      })),
      todayManifest: manifestItems,
      pendingArrivals: manifestItems.filter((m) => m.status === 'ARRIVAL_SUBMITTED'),
      pendingAuthorizations,
    }
  }

  /**
   * Generate Secure Driver Transport QR Token (Signed JWT)
   */
  static async generateDriverQRToken(ctx: ScopeContext, params: { routeId: string; vehicleId: string }) {
    const route = await db.transportRoute.findFirst({
      where: { id: params.routeId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, branchId: true },
    })

    const tokenData = await TransportSecurityService.generateTransportQrToken({
      tenantId: ctx.tenantId,
      branchId: ctx.branchId ?? route?.branchId ?? null,
      purpose: 'TRANSPORT_DRIVER',
      sub: params.routeId,
      routeId: params.routeId,
      vehicleId: params.vehicleId,
      driverId: ctx.actorId || undefined,
      expiresIn: '12h',
    })

    return {
      token: tokenData.token,
      qrPayload: tokenData.qrPayload,
      tenantId: ctx.tenantId,
      routeId: params.routeId,
      vehicleId: params.vehicleId,
      driverId: ctx.actorId,
      expiresAt: tokenData.expiresAt,
      timestamp: Date.now(),
    }
  }
}

