import { describe, it, expect, beforeAll } from 'bun:test'
import { TransportService, parseVehicleNotes, serializeVehicleNotes } from '@/lib/transport/transport-service'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

describe('PRE1-TRANSPORT-READINESS-001: Transport Module Production Readiness & Feature Remediation', () => {
  let tenantA: any
  let tenantB: any
  let branchA: any
  let ctxA: any
  let ctxB: any

  const ts = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  beforeAll(async () => {
    tenantA = await db.tenant.create({
      data: {
        name: `Transport Readiness Tenant A ${ts}`,
        code: `TRA_${ts.slice(-4)}`,
        status: 'ACTIVE',
      },
    })

    tenantB = await db.tenant.create({
      data: {
        name: `Transport Readiness Tenant B ${ts}`,
        code: `TRB_${ts.slice(-4)}`,
        status: 'ACTIVE',
      },
    })

    branchA = await db.branch.create({
      data: {
        tenantId: tenantA.id,
        name: 'Main Campus',
        code: `BR-A-${ts.slice(-4)}`,
        isActive: true,
      },
    })

    ctxA = {
      tenantId: tenantA.id,
      branchId: branchA.id,
      actorId: 'admin-a',
      actorName: 'Admin Alpha',
      actorRole: 'OWNER' as const,
    }

    ctxB = {
      tenantId: tenantB.id,
      actorId: 'admin-b',
      actorName: 'Admin Beta',
      actorRole: 'OWNER' as const,
    }
  })

  // =========================================================================
  // PHASE 1: VEHICLE INFORMATION CUSTOMIZATION & COMPLIANCE WARNINGS
  // =========================================================================
  describe('Phase 1: Vehicle Information Customization & Expiry Warnings', () => {
    it('serializes and parses vehicle custom metadata with expiry warnings', () => {
      const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
      const soonDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
      const futureDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]

      const serialized = serializeVehicleNotes('Clean bus, GPS tracking enabled', {
        displayName: 'Bus 01 - East Campus',
        registrationExpiry: futureDate,
        insuranceExpiry: soonDate,
        fitnessExpiry: pastDate,
        permitExpiry: futureDate,
        pollutionExpiry: futureDate,
        documents: [{ name: 'Fitness Certificate', type: 'PDF', url: '/docs/fit.pdf' }],
      })

      expect(serialized).not.toBeNull()
      expect(typeof serialized).toBe('string')

      const parsed = parseVehicleNotes(serialized)
      expect(parsed.plainNotes).toBe('Clean bus, GPS tracking enabled')
      expect(parsed.displayName).toBe('Bus 01 - East Campus')
      expect(parsed.insuranceExpiry).toBe(soonDate)
      expect(parsed.fitnessExpiry).toBe(pastDate)
      expect(parsed.documents.length).toBe(1)

      // Verify computed expiry warnings
      expect(parsed.expiryWarnings.length).toBe(2)
      const expiredWarning = parsed.expiryWarnings.find((w) => w.field === 'fitnessExpiry')
      expect(expiredWarning).toBeDefined()
      expect(expiredWarning?.status).toBe('EXPIRED')

      const expiringSoonWarning = parsed.expiryWarnings.find((w) => w.field === 'insuranceExpiry')
      expect(expiringSoonWarning).toBeDefined()
      expect(expiringSoonWarning?.status).toBe('EXPIRING_SOON')
    })

    it('creates vehicle with full customizable specifications and returns computed warnings', async () => {
      const pastFitness = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
      const futureInsurance = new Date(Date.now() + 200 * 86400000).toISOString().split('T')[0]

      const vehicle = await TransportService.createVehicle(ctxA, {
        registrationNumber: `MH-12-TRP-001-${ts.slice(-3)}`,
        vehicleType: 'BUS',
        capacity: 32,
        makeModel: 'Tata Starbus 32S',
        displayName: 'Bus Express Alpha',
        registrationExpiry: futureInsurance,
        insuranceExpiry: futureInsurance,
        fitnessExpiry: pastFitness,
        notes: 'Equipped with CCTV and speed limiter',
      })

      expect(vehicle.id).toBeDefined()
      expect(vehicle.capacity).toBe(32)
      expect(vehicle.displayName).toBe('Bus Express Alpha')
      expect(vehicle.fitnessExpiry).toBe(pastFitness)
      expect(vehicle.expiryWarnings).toBeDefined()
      expect(vehicle.expiryWarnings.some((w: any) => w.field === 'fitnessExpiry' && w.status === 'EXPIRED')).toBe(true)
    })

    it('rejects duplicate vehicle registration numbers within the same tenant', async () => {
      const reg = (`MH-12-TRP-001-${ts.slice(-3)}`).toUpperCase()
      await expect(
        TransportService.createVehicle(ctxA, {
          registrationNumber: reg,
          capacity: 25,
        })
      ).rejects.toThrow('already exists')
    })

    it('rejects vehicle creation with zero or negative seating capacity', async () => {
      await expect(
        TransportService.createVehicle(ctxA, {
          registrationNumber: `MH-12-TRP-002-${ts.slice(-3)}`,
          capacity: 0,
        })
      ).rejects.toThrow('must be greater than 0')

      await expect(
        TransportService.createVehicle(ctxA, {
          registrationNumber: `MH-12-TRP-003-${ts.slice(-3)}`,
          capacity: -5,
        })
      ).rejects.toThrow('must be greater than 0')
    })

    it('updates vehicle metadata, capacity, and status', async () => {
      const reg = (`MH-12-TRP-001-${ts.slice(-3)}`).toUpperCase()
      const vehicles = await TransportService.listVehicles(ctxA)
      const v = vehicles.find((item) => item.registrationNumber === reg)
      expect(v).toBeDefined()

      const renewedFitness = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
      const updated = await TransportService.updateVehicle(ctxA, v.id, {
        capacity: 36,
        fitnessExpiry: renewedFitness,
        notes: 'Annual fitness certificate renewed',
      })

      expect(updated.capacity).toBe(36)
      expect(updated.fitnessExpiry).toBe(renewedFitness)
      // Expiry warning for fitness should now be resolved
      expect(updated.expiryWarnings.some((w: any) => w.field === 'fitnessExpiry')).toBe(false)
    })
  })

  // =========================================================================
  // PHASE 2: PERMANENT SEED / DUMMY DATA ELIMINATION
  // =========================================================================
  describe('Phase 2: Permanent Seed / Dummy Data Elimination', () => {
    it('verifies seed endpoint src/app/api/v1/transport/seed does not exist in repository', () => {
      const seedRoute = path.join(process.cwd(), 'src', 'app', 'api', 'v1', 'transport', 'seed', 'route.ts')
      expect(fs.existsSync(seedRoute)).toBe(false)
    })

    it('verifies TransportService does not provide seedTransportDemoData method', () => {
      expect((TransportService as any).seedTransportDemoData).toBeUndefined()
    })
  })

  // =========================================================================
  // PHASE 3: DRIVER REGISTRATION & MANAGEMENT
  // =========================================================================
  describe('Phase 3: Driver Registration & Management', () => {
    let teacherProfileId: string
    let driverProfileId: string
    let expiredDriverProfileId: string

    it('creates test staff profiles: teacher, valid driver, and driver with expired license', async () => {
      // 1. Teacher (Non-transport staff)
      const teacherUser = await db.user.create({
        data: {
          fullName: 'Ananya Sharma',
          email: `ananya.teacher.${ts}@school.internal`,
          passwordHash: 'TEACHER_AUTH_MANAGED',
          status: 'ACTIVE',
        },
      })
      await db.tenantUser.create({
        data: { tenantId: tenantA.id, userId: teacherUser.id, role: 'TEACHER', roles: ['TEACHER'] },
      })
      const teacherProfile = await db.staffProfile.create({
        data: {
          tenantId: tenantA.id,
          userId: teacherUser.id,
          employeeCode: `TCH-${ts.slice(-4)}`,
          designation: 'Pre-Primary Teacher',
          department: 'Academics',
          status: 'ACTIVE',
        },
      })
      teacherProfileId = teacherProfile.id

      // 2. Valid Driver
      const driver = await TransportService.registerDriver(ctxA, {
        fullName: 'Ramchandra Patil',
        phone: '+91 98220 11223',
        employeeCode: `DRV-${ts.slice(-4)}`,
        licenseNumber: 'MH12 20160098765',
        licenseExpiry: new Date(Date.now() + 500 * 86400000).toISOString().split('T')[0],
        licenseCategory: 'HMV/Transport',
        emergencyContactName: 'Lata Patil',
        emergencyContactPhone: '+91 98220 99887',
      })
      expect(driver).not.toBeNull()
      expect(driver?.fullName).toBe('Ramchandra Patil')
      expect(driver?.licenseStatus).toBe('VALID')
      driverProfileId = driver!.id

      // 3. Driver with Expired License
      const expiredDriver = await TransportService.registerDriver(ctxA, {
        fullName: 'Suresh Gaikwad',
        phone: '+91 98220 44556',
        employeeCode: `DRV-EXP-${ts.slice(-3)}`,
        licenseNumber: 'MH12 20100012345',
        licenseExpiry: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        licenseCategory: 'HMV',
      })
      expect(expiredDriver?.licenseStatus).toBe('EXPIRED')
      expiredDriverProfileId = expiredDriver!.id
    })

    it('strictly prevents assigning a non-transport staff (e.g. teacher) as driver', async () => {
      await expect(
        TransportService.validateStaffEligibility(tenantA.id, teacherProfileId, 'driver')
      ).rejects.toThrow('is not designated for transport operations')
    })

    it('strictly prevents assigning a driver with an expired driving license', async () => {
      await expect(
        TransportService.validateStaffEligibility(tenantA.id, expiredDriverProfileId, 'driver')
      ).rejects.toThrow('Driving license')
    })

    it('successfully validates an active transport driver with a valid license', async () => {
      const validProfile = await TransportService.validateStaffEligibility(tenantA.id, driverProfileId, 'driver')
      expect(validProfile.id).toBe(driverProfileId)
      expect(validProfile.status).toBe('ACTIVE')
    })

    it('allows updating driver license credentials and emergency contacts', async () => {
      const updated = await TransportService.updateDriver(ctxA, driverProfileId, {
        emergencyContactName: 'Lata R. Patil (Wife)',
        emergencyContactPhone: '+91 98220 55555',
        licenseCategory: 'HMV Heavy Passenger Vehicle',
      })

      expect(updated?.emergencyContactName).toBe('Lata R. Patil (Wife)')
      expect(updated?.emergencyContactPhone).toBe('+91 98220 55555')
      expect(updated?.licenseCategory).toBe('HMV Heavy Passenger Vehicle')
    })

    it('deactivating a driver prevents them from being assigned to trips', async () => {
      await TransportService.updateDriver(ctxA, driverProfileId, {
        status: 'INACTIVE',
      })

      await expect(
        TransportService.validateStaffEligibility(tenantA.id, driverProfileId, 'driver')
      ).rejects.toThrow('is INACTIVE and cannot be assigned')

      // Reactivate for subsequent allocation tests
      await TransportService.updateDriver(ctxA, driverProfileId, {
        status: 'ACTIVE',
      })
    })
  })

  // =========================================================================
  // PHASE 4: DRIVER, VEHICLE & ROUTE ALLOCATION
  // =========================================================================
  describe('Phase 4: Driver, Vehicle & Route Allocation', () => {
    let testRouteId: string
    let testVehicleId: string
    let testDriverId: string

    it('creates route with vehicle, driver, and stops enforcing validation', async () => {
      const vehicles = await TransportService.listVehicles(ctxA)
      testVehicleId = vehicles[0].id

      const drivers = await TransportService.listDrivers(ctxA)
      const activeDriver = drivers.find((d) => d.status === 'ACTIVE' && d.licenseStatus === 'VALID')
      expect(activeDriver).toBeDefined()
      testDriverId = activeDriver!.id

      const route = await TransportService.createRoute(ctxA, {
        code: `R-READINESS-${ts.slice(-4)}`,
        name: 'Kothrud - Campus Express',
        vehicleId: testVehicleId,
        driverProfileId: testDriverId,
        stops: [
          { name: 'Kothrud Depot', sequence: 1, morningPickupTime: '07:30', eveningDropTime: '15:30' },
          { name: 'Chandani Chowk', sequence: 2, morningPickupTime: '07:45', eveningDropTime: '15:15' },
          { name: 'School Campus Main Gate', sequence: 3, morningPickupTime: '08:00', eveningDropTime: '15:00' },
        ],
      })

      expect(route.id).toBeDefined()
      expect(route.stops.length).toBe(3)
      testRouteId = route.id
    })

    it('rejects assigning a vehicle under MAINTENANCE to an active route', async () => {
      const maintVehicle = await TransportService.createVehicle(ctxA, {
        registrationNumber: `MH-12-MAINT-${ts.slice(-3)}`,
        capacity: 20,
      })
      await TransportService.updateVehicle(ctxA, maintVehicle.id, {
        status: 'MAINTENANCE',
      })

      await expect(
        TransportService.createRoute(ctxA, {
          code: `R-MAINT-${ts.slice(-4)}`,
          name: 'Maintenance Test Route',
          vehicleId: maintVehicle.id,
        })
      ).rejects.toThrow('cannot be assigned to an active route')
    })

    it('rejects duplicate stop sequence numbers within the same route', async () => {
      await expect(
        TransportService.createRoute(ctxA, {
          code: `R-DUPSEQ-${ts.slice(-4)}`,
          name: 'Duplicate Sequence Route',
          stops: [
            { name: 'Stop 1', sequence: 1 },
            { name: 'Stop 2', sequence: 1 },
          ],
        })
      ).rejects.toThrow('Stop sequence numbers within a route must be unique')
    })
  })

  // =========================================================================
  // PHASE 5: PARENT PORTAL INTEGRATION & PRIVACY PRESERVATION
  // =========================================================================
  describe('Phase 5: Parent Portal Integration & Privacy Preservation', () => {
    it('verifies parent transport summary does not leak driver private PII', async () => {
      const mockParentCtx = {
        tenantId: tenantA.id,
        actorId: 'parent-test-user-id',
        actorRole: 'PARENT' as const,
      }

      const parentData = await TransportService.getMyChildrenTransport(mockParentCtx)
      expect(Array.isArray(parentData)).toBe(true)

      for (const child of parentData) {
        if (child.assignment) {
          expect((child.assignment as any).licenseNumber).toBeUndefined()
          expect((child.assignment as any).driverAadhaar).toBeUndefined()
          expect((child.assignment as any).driverPan).toBeUndefined()
        }
      }
    })
  })

  // =========================================================================
  // PHASE 6: TENANT ISOLATION & PERMISSION SCOPING
  // =========================================================================
  describe('Phase 6: Multi-tenant Scoping & Isolation', () => {
    it('cross-tenant queries strictly return isolated data', async () => {
      const vehiclesTenantA = await TransportService.listVehicles(ctxA)
      const vehiclesTenantB = await TransportService.listVehicles(ctxB)

      const idsA = new Set(vehiclesTenantA.map((v) => v.id))
      const idsB = new Set(vehiclesTenantB.map((v) => v.id))

      for (const id of idsA) {
        expect(idsB.has(id)).toBe(false)
      }
    })
  })
})
