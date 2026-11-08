'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bus,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  UserCheck,
  Users,
  Home,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Shield,
  Search,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
  Sparkles,
  AlertCircle,
  X,
  Play,
  RotateCcw,
  KeyRound,
} from 'lucide-react'
import { useToast } from '@/components/preone/Toast'

interface DriverDashboardProps {
  session: any
  driverUser: any
  staffProfile: any
  branch: any
  routes: any[]
  initialTrips: any[]
  initialTab?: string
  initialRouteId?: string
}

export function DriverDashboardClient({
  session,
  driverUser,
  staffProfile,
  branch,
  routes,
  initialTrips,
  initialTab = 'overview',
  initialRouteId,
}: DriverDashboardProps) {
  const router = useRouter()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    initialRouteId || routes[0]?.id || ''
  )
  const [trips, setTrips] = useState<any[]>(initialTrips)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Modals
  const [absentModalStudent, setAbsentModalStudent] = useState<{ student: any; tripId: string } | null>(null)
  const [absentReason, setAbsentReason] = useState('Parent informed: Child sick')
  const [customAbsentReason, setCustomAbsentReason] = useState('')

  const [handoverModalStudent, setHandoverModalStudent] = useState<{ student: any; tripId: string } | null>(null)
  const [handoverRecipient, setHandoverRecipient] = useState('Parent (Mother/Father)')
  const [customHandoverRecipient, setCustomHandoverRecipient] = useState('')
  const [handoverPin, setHandoverPin] = useState('')

  const [exceptionModalStudent, setExceptionModalStudent] = useState<{ student: any; tripId: string; type: 'pickup' | 'drop' } | null>(null)
  const [exceptionReason, setExceptionReason] = useState('')

  const [delayModalTrip, setDelayModalTrip] = useState<any | null>(null)
  const [delayMinutes, setDelayMinutes] = useState('10')
  const [delayReason, setDelayReason] = useState('Traffic Congestion')

  const [studentSearch, setStudentSearch] = useState('')

  // Active route
  const currentRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || routes[0] || null
  }, [routes, selectedRouteId])

  // Vehicle
  const assignedVehicle = useMemo(() => {
    if (currentRoute?.vehicle) return currentRoute.vehicle
    return null
  }, [currentRoute])

  const vehicleDisplayName = useMemo(() => {
    if (!assignedVehicle) return 'No Vehicle Assigned'
    if (assignedVehicle.notes) {
      try {
        const parsed = JSON.parse(assignedVehicle.notes)
        if (parsed.displayName) return `${assignedVehicle.registrationNumber} (${parsed.displayName})`
      } catch {
        // Not JSON
      }
    }
    return assignedVehicle.registrationNumber
  }, [assignedVehicle])

  // Today's trips for active route
  const morningTrip = useMemo(() => {
    return trips.find((t) => t.routeId === currentRoute?.id && t.tripType === 'MORNING') || null
  }, [trips, currentRoute])

  const eveningTrip = useMemo(() => {
    return trips.find((t) => t.routeId === currentRoute?.id && t.tripType === 'EVENING') || null
  }, [trips, currentRoute])

  // All active student assignments for current route
  const assignments = useMemo(() => {
    return currentRoute?.assignments || []
  }, [currentRoute])

  // Pickup students (TWO_WAY or MORNING_ONLY)
  const pickupAssignments = useMemo(() => {
    return assignments.filter((a: any) => ['TWO_WAY', 'MORNING_ONLY'].includes(a.tripType))
  }, [assignments])

  // Drop students (TWO_WAY or EVENING_ONLY)
  const dropAssignments = useMemo(() => {
    return assignments.filter((a: any) => ['TWO_WAY', 'EVENING_ONLY'].includes(a.tripType))
  }, [assignments])

  // Ordered Pickup Stops (by sequence)
  const pickupStops = useMemo(() => {
    if (!currentRoute?.stops) return []
    return [...currentRoute.stops].sort((a: any, b: any) => a.sequence - b.sequence)
  }, [currentRoute])

  // Ordered Drop Stops (by eveningDropTime, or sequence)
  const dropStops = useMemo(() => {
    if (!currentRoute?.stops) return []
    return [...currentRoute.stops].sort((a: any, b: any) => {
      if (a.eveningDropTime && b.eveningDropTime) {
        return a.eveningDropTime.localeCompare(b.eveningDropTime)
      }
      return a.sequence - b.sequence
    })
  }, [currentRoute])

  // Helper: Get student manifest status for a trip
  const getManifestItem = useCallback((trip: any, studentId: string) => {
    if (!trip?.manifest) return null
    return trip.manifest.find((m: any) => m.studentId === studentId) || null
  }, [])

  // KPI Calculations
  const stats = useMemo(() => {
    const totalPickupStudents = pickupAssignments.length
    const totalDropStudents = dropAssignments.length

    let pickedUpCount = 0
    let pendingPickups = totalPickupStudents
    if (morningTrip?.manifest) {
      pickedUpCount = morningTrip.manifest.filter((m: any) => m.status === 'BOARDED' || m.status === 'ARRIVAL_SUBMITTED' || m.status === 'ARRIVAL_VERIFIED').length
      pendingPickups = morningTrip.manifest.filter((m: any) => m.status === 'EXPECTED').length
    }

    let droppedCount = 0
    let pendingDrops = totalDropStudents
    if (eveningTrip?.manifest) {
      droppedCount = eveningTrip.manifest.filter((m: any) => m.status === 'DROPPED').length
      pendingDrops = eveningTrip.manifest.filter((m: any) => m.status === 'EXPECTED' || m.status === 'BOARDED').length
    }

    const completedTripsCount = trips.filter((t) => t.status === 'COMPLETED').length

    return {
      assignedRoutesCount: routes.length,
      totalPickupStudents,
      totalDropStudents,
      pickedUpCount,
      pendingPickups,
      droppedCount,
      pendingDrops,
      completedTripsCount,
    }
  }, [pickupAssignments, dropAssignments, morningTrip, eveningTrip, trips, routes])

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------

  // Start or resume a trip
  const handleStartTrip = async (tripType: 'MORNING' | 'EVENING') => {
    if (!currentRoute) return
    setLoadingAction(`start_${tripType}`)
    try {
      const res = await fetch('/api/v1/transport/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: currentRoute.id,
          tripType,
          vehicleId: currentRoute.vehicleId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.trip) {
        toast.success(
          `${tripType === 'MORNING' ? 'Morning Pickup' : 'Afternoon Drop'} Trip Started`,
          `Trip is now active with ${data.data.trip.manifest?.length || 0} manifest passenger(s)`
        )
        // Refresh trips in local state
        setTrips((prev) => {
          const filtered = prev.filter((t) => t.id !== data.data.trip.id)
          return [data.data.trip, ...filtered]
        })
        setActiveTab(tripType === 'MORNING' ? 'pickup' : 'drop')
      } else {
        toast.error('Could not start trip', data.error?.message || 'Failed to start trip')
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setLoadingAction(null)
    }
  }

  // Update manifest status (BOARDED, DROPPED, ABSENT, MISSED)
  const handleUpdatePassengerStatus = async (
    tripId: string,
    studentId: string,
    status: 'BOARDED' | 'DROPPED' | 'ABSENT' | 'MISSED' | 'EXPECTED',
    notes?: string,
    verifiedRecipient?: string
  ) => {
    setLoadingAction(`${tripId}_${studentId}_${status}`)
    try {
      const res = await fetch(`/api/v1/transport/trips/${tripId}/manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          status,
          notes,
          verifiedRecipient,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        toast.success(
          `Passenger Status Updated: ${status}`,
          notes || verifiedRecipient || 'Saved successfully'
        )
        // Update local trip manifest
        setTrips((prev) =>
          prev.map((t) => {
            if (t.id === tripId) {
              const updatedManifest = t.manifest.map((m: any) =>
                m.studentId === studentId ? { ...m, ...data.data } : m
              )
              return { ...t, manifest: updatedManifest }
            }
            return t
          })
        )
      } else {
        toast.error('Update Failed', data.error?.message || 'Unable to update status')
      }
    } catch (err: any) {
      toast.error('Error', err.message)
    } finally {
      setLoadingAction(null)
    }
  }

  // Submit Bus Arrival
  const handleSubmitArrival = async (tripId: string) => {
    setLoadingAction(`submit_arrival_${tripId}`)
    try {
      const res = await fetch(`/api/v1/transport/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUBMIT_ARRIVAL' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Bus Arrival Submitted', 'School gate staff notified to verify child arrival.')
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, status: 'IN_PROGRESS' } : t))
        )
      } else {
        toast.error('Arrival submission failed', data.error?.message)
      }
    } catch (err: any) {
      toast.error('Error', err.message)
    } finally {
      setLoadingAction(null)
    }
  }

  // Complete Trip
  const handleCompleteTrip = async (tripId: string) => {
    setLoadingAction(`complete_trip_${tripId}`)
    try {
      const res = await fetch(`/api/v1/transport/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COMPLETE_TRIP' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Trip Completed', 'All student records synchronized with school transport console.')
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, status: 'COMPLETED' } : t))
        )
      } else {
        toast.error('Trip completion failed', data.error?.message)
      }
    } catch (err: any) {
      toast.error('Error', err.message)
    } finally {
      setLoadingAction(null)
    }
  }

  // Record Delay
  const handleRecordDelay = async () => {
    if (!delayModalTrip) return
    const mins = parseInt(delayMinutes, 10)
    if (isNaN(mins) || mins <= 0) {
      toast.error('Invalid Minutes', 'Please provide a valid delay number')
      return
    }
    setLoadingAction('record_delay')
    try {
      const res = await fetch(`/api/v1/transport/trips/${delayModalTrip.id}/delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delayMinutes: mins,
          reason: delayReason.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Delay Broadcasted', `Parents notified: ${mins} min delay (${delayReason})`)
        setDelayModalTrip(null)
      } else {
        toast.error('Delay record failed', data.error?.message)
      }
    } catch (err: any) {
      toast.error('Error', err.message)
    } finally {
      setLoadingAction(null)
    }
  }

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
      router.replace('/')
    } catch {
      router.replace('/')
    }
  }

  // Filtered students for "My Students" tab
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return assignments
    return assignments.filter((a: any) => {
      const s = a.student
      const name = `${s?.firstName || ''} ${s?.lastName || ''}`.toLowerCase()
      const adm = (s?.admissionNo || '').toLowerCase()
      const cls = (s?.currentClassroom?.name || '').toLowerCase()
      const gName = (s?.guardians?.[0]?.guardian?.fullName || '').toLowerCase()
      return name.includes(q) || adm.includes(q) || cls.includes(q) || gName.includes(q)
    })
  }, [assignments, studentSearch])

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: '16px 12px 100px 12px',
        color: '#FFFFFF',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP DRIVER IDENTITY HEADER */}
      {/* ========================================================================= */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                fontWeight: 800,
                fontSize: 22,
                color: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {driverUser?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driverUser.avatarUrl}
                  alt={driverUser.fullName || 'Driver'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (driverUser?.fullName || 'Alex')[0]?.toUpperCase()
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {driverUser?.fullName || 'Alex Driver'}
                </h1>
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ADE80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    textTransform: 'uppercase',
                  }}
                >
                  Active Driver
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
                Transit Captain • {branch?.name || 'Main Campus'} {staffProfile?.employeeCode ? `• ${staffProfile.employeeCode}` : ''}
              </div>
            </div>
          </div>

          {/* Assigned vehicle pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 12,
              padding: '8px 14px',
            }}
          >
            <Bus size={20} color="#FBBF24" />
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#FBBF24', letterSpacing: '0.05em' }}>
                Assigned Vehicle
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>
                {vehicleDisplayName}
              </div>
            </div>
          </div>
        </div>

        {/* Route selector dropdown if multiple routes assigned */}
        {routes.length > 1 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>Switch Route:</span>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="select"
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED MOBILE DRIVER NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.75)',
          padding: 6,
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 18,
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'overview', label: 'Home', icon: Home },
          { key: 'routes', label: 'My Routes', icon: MapPin },
          { key: 'pickup', label: 'Pickup', icon: ArrowUpCircle, badge: stats.pendingPickups > 0 ? stats.pendingPickups : undefined },
          { key: 'drop', label: 'Drop', icon: ArrowDownCircle, badge: stats.pendingDrops > 0 ? stats.pendingDrops : undefined },
          { key: 'students', label: 'My Students', icon: Users, badge: assignments.length },
          { key: 'profile', label: 'Profile', icon: UserCheck },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 4px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                fontWeight: isActive ? 800 : 600,
                fontSize: 11,
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 6,
                    background: isActive ? '#FFFFFF' : '#EF4444',
                    color: isActive ? '#D97706' : '#FFFFFF',
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '1px 5px',
                    lineHeight: '11px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB CONTENT: OVERVIEW (HOME) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Dashboard Summary KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Assigned Routes', val: stats.assignedRoutesCount, color: '#38BDF8', icon: MapPin },
              { label: 'Today Pickup Students', val: stats.totalPickupStudents, color: '#FBBF24', icon: Users },
              { label: 'Today Drop Students', val: stats.totalDropStudents, color: '#A78BFA', icon: Users },
              { label: 'Pending Pickups', val: stats.pendingPickups, color: '#FB923C', icon: ArrowUpCircle },
              { label: 'Pending Drops', val: stats.pendingDrops, color: '#F472B6', icon: ArrowDownCircle },
              { label: 'Completed Trips', val: stats.completedTripsCount, color: '#4ADE80', icon: CheckCircle2 },
            ].map((kpi, idx) => {
              const Icon = kpi.icon
              return (
                <div
                  key={idx}
                  className="card"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>
                      {kpi.label}
                    </span>
                    <Icon size={16} color={kpi.color} />
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>
                    {kpi.val}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Today's Schedule Cards */}
          <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.7)' }}>
            Today&apos;s Operational Schedule
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            {/* Morning Pickup Schedule Card */}
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowUpCircle size={18} color="#FBBF24" />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Morning Pickup Run</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 2 }}>
                    Scheduled: 08:00 AM • Route: {currentRoute?.name || 'Assigned Route'}
                  </div>
                </div>
                <span
                  style={{
                    background: morningTrip?.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.2)' : morningTrip ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                    color: morningTrip?.status === 'COMPLETED' ? '#4ADE80' : morningTrip ? '#FBBF24' : '#94A3B8',
                    border: '1px solid currentColor',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    textTransform: 'uppercase',
                  }}
                >
                  {morningTrip?.status || 'SCHEDULED'}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', margin: '10px 0' }}>
                Vehicle: <strong>{vehicleDisplayName}</strong> • Stops: <strong>{pickupStops.length}</strong> • Assigned Students: <strong>{stats.totalPickupStudents}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => {
                    if (!morningTrip) {
                      handleStartTrip('MORNING')
                    } else {
                      setActiveTab('pickup')
                    }
                  }}
                  disabled={loadingAction === 'start_MORNING'}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 13,
                    padding: '10px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  {loadingAction === 'start_MORNING'
                    ? 'Starting...'
                    : morningTrip
                    ? 'Open Pickup Route'
                    : 'Start Morning Pickup'}
                </button>
              </div>
            </div>

            {/* Afternoon Drop Schedule Card */}
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowDownCircle size={18} color="#C084FC" />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Afternoon / Evening Drop</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 2 }}>
                    Scheduled: 03:00 PM • Route: {currentRoute?.name || 'Assigned Route'}
                  </div>
                </div>
                <span
                  style={{
                    background: eveningTrip?.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.2)' : eveningTrip ? 'rgba(168, 85, 247, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                    color: eveningTrip?.status === 'COMPLETED' ? '#4ADE80' : eveningTrip ? '#C084FC' : '#94A3B8',
                    border: '1px solid currentColor',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    textTransform: 'uppercase',
                  }}
                >
                  {eveningTrip?.status || 'SCHEDULED'}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', margin: '10px 0' }}>
                Vehicle: <strong>{vehicleDisplayName}</strong> • Stops: <strong>{dropStops.length}</strong> • Assigned Students: <strong>{stats.totalDropStudents}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => {
                    if (!eveningTrip) {
                      handleStartTrip('EVENING')
                    } else {
                      setActiveTab('drop')
                    }
                  }}
                  disabled={loadingAction === 'start_EVENING'}
                  className="btn"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 13,
                    padding: '10px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  {loadingAction === 'start_EVENING'
                    ? 'Starting...'
                    : eveningTrip
                    ? 'Open Drop Route'
                    : 'Start Afternoon Drop'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 6 }}>
            <button
              onClick={() => setActiveTab('pickup')}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: 12,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>View Pickup Route Sequence</span>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setActiveTab('drop')}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: 12,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>View Drop Route Sequence</span>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setActiveTab('students')}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: 12,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>View Assigned Students Roster</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT: MY ROUTES */}
      {/* ========================================================================= */}
      {activeTab === 'routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {routes.map((route) => (
            <div
              key={route.id}
              className="card"
              style={{
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={20} color="#FBBF24" />
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{route.name}</h2>
                    <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      {route.code}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4 }}>
                    Assigned Campus: {route.branch?.name || 'Main Campus'} • Vehicle: {vehicleDisplayName}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedRouteId(route.id)
                      setActiveTab('pickup')
                    }}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '8px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Start Pickup
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRouteId(route.id)
                      setActiveTab('drop')
                    }}
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '8px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Start Drop
                  </button>
                </div>
              </div>

              {/* Stop Sequence Overview */}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 10 }}>
                  Configured Route Stops ({route.stops?.length || 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(route.stops || []).map((stop: any, sIdx: number) => {
                    const stopAssignments = (route.assignments || []).filter(
                      (a: any) => a.pickupStopId === stop.id || a.dropStopId === stop.id
                    )
                    return (
                      <div
                        key={stop.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 10,
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: '#3B82F6',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {sIdx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{stop.name}</div>
                            {stop.landmark && (
                              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>{stop.landmark}</div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#FBBF24', fontWeight: 700 }}>Pick: {stop.morningPickupTime}</div>
                            <div style={{ fontSize: 11, color: '#C084FC', fontWeight: 700 }}>Drop: {stop.eveningDropTime}</div>
                          </div>
                          <span
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {stopAssignments.length} student{stopAssignments.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT: PICKUP MANAGEMENT (ROUTE-WISE PICKUP SEQUENCE) */}
      {/* ========================================================================= */}
      {activeTab === 'pickup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pickup Progress & Controls Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowUpCircle size={22} color="#FBBF24" />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                    Morning Pickup Run — {currentRoute?.name}
                  </h2>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginTop: 4 }}>
                  Vehicle: {vehicleDisplayName} • Trip Status: <strong>{morningTrip?.status || 'SCHEDULED'}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!morningTrip ? (
                  <button
                    onClick={() => handleStartTrip('MORNING')}
                    disabled={loadingAction === 'start_MORNING'}
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '10px 18px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Play size={16} />
                    <span>Start Pickup Trip</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setDelayModalTrip(morningTrip)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#F87171',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span>Report Delay</span>
                    </button>
                    {morningTrip.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleSubmitArrival(morningTrip.id)}
                        disabled={loadingAction === `submit_arrival_${morningTrip.id}`}
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          color: '#60A5FA',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Submit Bus Arrival
                      </button>
                    )}
                    {morningTrip.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCompleteTrip(morningTrip.id)}
                        disabled={loadingAction === `complete_trip_${morningTrip.id}`}
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#4ADE80',
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '8px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Complete Pickup Trip
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Visual Route Progress Indicator */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                  Pickup Progress: {stats.pickedUpCount} / {stats.totalPickupStudents} Students Picked Up
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#FBBF24' }}>
                  {stats.totalPickupStudents > 0
                    ? Math.round((stats.pickedUpCount / stats.totalPickupStudents) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${stats.totalPickupStudents > 0 ? (stats.pickedUpCount / stats.totalPickupStudents) * 100 : 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #F59E0B 0%, #10B981 100%)',
                    borderRadius: 999,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
                <span>Picked Up: <strong style={{ color: '#4ADE80' }}>{stats.pickedUpCount}</strong></span>
                <span>Pending: <strong style={{ color: '#FBBF24' }}>{stats.pendingPickups}</strong></span>
                <span>Stops: <strong>{pickupStops.length}</strong></span>
              </div>
            </div>
          </div>

          {/* EXACT PICKUP STOP SEQUENCE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pickupStops.map((stop: any, sIdx: number) => {
              const stopStudents = pickupAssignments.filter((a: any) => a.pickupStopId === stop.id)
              const isSchool = sIdx === pickupStops.length - 1

              return (
                <div
                  key={stop.id}
                  className="card"
                  style={{
                    background: 'rgba(30, 41, 59, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  {/* Stop Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isSchool ? '#10B981' : '#F59E0B',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 900,
                        }}
                      >
                        {sIdx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>
                          {stop.name} {isSchool ? '(Final Destination)' : ''}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>
                          {stop.landmark || 'Stop Location'} • Scheduled Pickup: <strong>{stop.morningPickupTime}</strong>
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {stopStudents.length} student{stopStudents.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Student list at this stop */}
                  {stopStudents.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', padding: '6px 0' }}>
                      No morning pickup passengers assigned at this stop.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stopStudents.map((assignment: any) => {
                        const student = assignment.student
                        const primaryGuardian = student.guardians?.[0]?.guardian
                        const manifestItem = morningTrip ? getManifestItem(morningTrip, student.id) : null
                        const status = manifestItem?.status || 'EXPECTED'

                        return (
                          <div
                            key={student.id}
                            style={{
                              background: 'rgba(15, 23, 42, 0.7)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 12,
                              padding: '12px 14px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                              {/* Left: Student Identity */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    background: '#3B82F6',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 16,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {student.photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={student.photoUrl}
                                      alt={student.firstName}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    student.firstName?.[0]?.toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                                    {student.firstName} {student.lastName || ''}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
                                    {student.admissionNo} • Class: {student.currentClassroom?.name || 'Unassigned'}
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {status === 'BOARDED' ? (
                                  <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ADE80', border: '1px solid #22C55E', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    ✓ Picked Up
                                  </span>
                                ) : status === 'ABSENT' ? (
                                  <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid #F59E0B', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    Absent ({manifestItem?.notes || 'No show'})
                                  </span>
                                ) : status === 'MISSED' ? (
                                  <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid #EF4444', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    Exception ({manifestItem?.notes || 'Issue'})
                                  </span>
                                ) : (
                                  <span style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#94A3B8', border: '1px solid #64748B', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    Pending Pickup
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Parent Contact Information */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: 8,
                                padding: '8px 12px',
                                marginTop: 10,
                                flexWrap: 'wrap',
                                gap: 8,
                              }}
                            >
                              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
                                👤 Guardian: <strong>{primaryGuardian?.fullName || 'Guardian Not Listed'}</strong>
                                {primaryGuardian?.phone && ` (${primaryGuardian.phone})`}
                              </div>
                              {primaryGuardian?.phone && (
                                <a
                                  href={`tel:${primaryGuardian.phone}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ADE80',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Phone size={13} />
                                  <span>Call Parent</span>
                                </a>
                              )}
                            </div>

                            {/* Stationary Driver Action Buttons */}
                            {morningTrip && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                                <button
                                  onClick={() => handleUpdatePassengerStatus(morningTrip.id, student.id, 'BOARDED')}
                                  disabled={loadingAction === `${morningTrip.id}_${student.id}_BOARDED` || status === 'BOARDED'}
                                  style={{
                                    background: status === 'BOARDED' ? '#15803D' : '#16A34A',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '8px 6px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {status === 'BOARDED' ? '✓ Picked Up' : 'Mark Picked Up'}
                                </button>
                                <button
                                  onClick={() => setAbsentModalStudent({ student, tripId: morningTrip.id })}
                                  disabled={loadingAction?.includes(student.id)}
                                  style={{
                                    background: status === 'ABSENT' ? '#B45309' : '#D97706',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '8px 6px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => setExceptionModalStudent({ student, tripId: morningTrip.id, type: 'pickup' })}
                                  disabled={loadingAction?.includes(student.id)}
                                  style={{
                                    background: status === 'MISSED' ? '#B91C1C' : '#DC2626',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '8px 6px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Exception
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB CONTENT: DROP MANAGEMENT (ROUTE-WISE DROP SEQUENCE) */}
      {/* ========================================================================= */}
      {activeTab === 'drop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Drop Progress & Controls Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowDownCircle size={22} color="#C084FC" />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                    Afternoon Drop Run — {currentRoute?.name}
                  </h2>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginTop: 4 }}>
                  Vehicle: {vehicleDisplayName} • Trip Status: <strong>{eveningTrip?.status || 'SCHEDULED'}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!eveningTrip ? (
                  <button
                    onClick={() => handleStartTrip('EVENING')}
                    disabled={loadingAction === 'start_EVENING'}
                    style={{
                      background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '10px 18px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Play size={16} />
                    <span>Start Drop Trip</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setDelayModalTrip(eveningTrip)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#F87171',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span>Report Delay</span>
                    </button>
                    {eveningTrip.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCompleteTrip(eveningTrip.id)}
                        disabled={loadingAction === `complete_trip_${eveningTrip.id}`}
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#4ADE80',
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '8px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Complete Drop Trip
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Visual Route Progress Indicator */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                  Drop Progress: {stats.droppedCount} / {stats.totalDropStudents} Students Dropped
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#C084FC' }}>
                  {stats.totalDropStudents > 0
                    ? Math.round((stats.droppedCount / stats.totalDropStudents) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${stats.totalDropStudents > 0 ? (stats.droppedCount / stats.totalDropStudents) * 100 : 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #A855F7 0%, #10B981 100%)',
                    borderRadius: 999,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
                <span>Dropped: <strong style={{ color: '#4ADE80' }}>{stats.droppedCount}</strong></span>
                <span>Pending Drop: <strong style={{ color: '#C084FC' }}>{stats.pendingDrops}</strong></span>
                <span>Stops: <strong>{dropStops.length}</strong></span>
              </div>
            </div>
          </div>

          {/* EXACT DROP STOP SEQUENCE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dropStops.map((stop: any, sIdx: number) => {
              const stopStudents = dropAssignments.filter((a: any) => a.dropStopId === stop.id)

              return (
                <div
                  key={stop.id}
                  className="card"
                  style={{
                    background: 'rgba(30, 41, 59, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  {/* Stop Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#8B5CF6',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 900,
                        }}
                      >
                        {sIdx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>{stop.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>
                          {stop.landmark || 'Drop Location'} • Scheduled Drop Time: <strong>{stop.eveningDropTime}</strong>
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {stopStudents.length} student{stopStudents.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Student list at this drop stop */}
                  {stopStudents.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', padding: '6px 0' }}>
                      No afternoon drop passengers assigned at this stop.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stopStudents.map((assignment: any) => {
                        const student = assignment.student
                        const primaryGuardian = student.guardians?.[0]?.guardian
                        const manifestItem = eveningTrip ? getManifestItem(eveningTrip, student.id) : null
                        const status = manifestItem?.status || 'EXPECTED'

                        return (
                          <div
                            key={student.id}
                            style={{
                              background: 'rgba(15, 23, 42, 0.7)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 12,
                              padding: '12px 14px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                              {/* Left: Student Identity */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    background: '#8B5CF6',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 16,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {student.photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={student.photoUrl}
                                      alt={student.firstName}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    student.firstName?.[0]?.toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                                    {student.firstName} {student.lastName || ''}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
                                    {student.admissionNo} • Class: {student.currentClassroom?.name || 'Unassigned'}
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {status === 'DROPPED' ? (
                                  <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ADE80', border: '1px solid #22C55E', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    ✓ Dropped {manifestItem?.notes ? `(${manifestItem.notes})` : ''}
                                  </span>
                                ) : status === 'MISSED' ? (
                                  <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid #EF4444', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    Drop Exception ({manifestItem?.notes || 'Issue'})
                                  </span>
                                ) : (
                                  <span style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#94A3B8', border: '1px solid #64748B', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '3px 10px' }}>
                                    Pending Drop
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Parent Contact Information */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: 8,
                                padding: '8px 12px',
                                marginTop: 10,
                                flexWrap: 'wrap',
                                gap: 8,
                              }}
                            >
                              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.75)' }}>
                                👤 Guardian: <strong>{primaryGuardian?.fullName || 'Guardian Not Listed'}</strong>
                                {primaryGuardian?.phone && ` (${primaryGuardian.phone})`}
                              </div>
                              {primaryGuardian?.phone && (
                                <a
                                  href={`tel:${primaryGuardian.phone}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ADE80',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Phone size={13} />
                                  <span>Call Parent</span>
                                </a>
                              )}
                            </div>

                            {/* Stationary Driver Action Buttons */}
                            {eveningTrip && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                                <button
                                  onClick={() => handleUpdatePassengerStatus(eveningTrip.id, student.id, 'DROPPED', 'Dropped at Stop')}
                                  disabled={loadingAction === `${eveningTrip.id}_${student.id}_DROPPED` || status === 'DROPPED'}
                                  style={{
                                    background: status === 'DROPPED' ? '#15803D' : '#16A34A',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '8px 6px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {status === 'DROPPED' ? '✓ Dropped' : 'Mark Dropped'}
                                </button>
                                <button
                                  onClick={() => setHandoverModalStudent({ student, tripId: eveningTrip.id })}
                                  disabled={loadingAction?.includes(student.id)}
                                  style={{
                                    background: '#2563EB',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '8px 6px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Guardian Handover
                                </button>
                                <button
                                  onClick={() => setExceptionModalStudent({ student, tripId: eveningTrip.id, type: 'drop' })}
                                  disabled={loadingAction?.includes(student.id)}
                                  style={{
                                    background: status === 'MISSED' ? '#B91C1C' : '#DC2626',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    padding: '8px 6px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Drop Exception
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB CONTENT: MY STUDENTS (ASSIGNED PASSENGERS ROSTER) */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <Search size={18} color="rgba(255, 255, 255, 0.5)" />
            <input
              type="text"
              placeholder="Search assigned passengers by student name or admission no..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: 13,
                width: '100%',
              }}
            />
            {studentSearch && (
              <button
                onClick={() => setStudentSearch('')}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>
            Showing {filteredStudents.length} of {assignments.length} assigned passenger(s)
          </div>

          {filteredStudents.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: 14,
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              No matching passengers found on your assigned route.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {filteredStudents.map((assignment: any) => {
                const s = assignment.student
                const primaryG = s.guardians?.[0]?.guardian
                const secondaryG = s.guardians?.[1]?.guardian

                return (
                  <div
                    key={s.id}
                    className="card"
                    style={{
                      background: 'rgba(30, 41, 59, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 16,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: '50%',
                          background: '#3B82F6',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 18,
                          overflow: 'hidden',
                        }}
                      >
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.photoUrl}
                            alt={s.firstName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          s.firstName?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>
                          {s.firstName} {s.lastName || ''}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.65)' }}>
                          {s.admissionNo} • Class: {s.currentClassroom?.name || 'Unassigned'}
                        </div>
                      </div>
                    </div>

                    {/* Route Transit Details */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Morning Pickup:</span>
                        <strong style={{ color: '#FBBF24' }}>
                          {assignment.pickupStop?.name || 'Assigned Stop'} ({assignment.pickupStop?.morningPickupTime || '08:00 AM'})
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Evening Drop:</span>
                        <strong style={{ color: '#C084FC' }}>
                          {assignment.dropStop?.name || 'Assigned Stop'} ({assignment.dropStop?.eveningDropTime || '03:00 PM'})
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Transit Schedule:</span>
                        <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{assignment.tripType}</span>
                      </div>
                    </div>

                    {/* Emergency Contacts Section */}
                    <div
                      style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.05em' }}>
                        Emergency Contact Access
                      </div>

                      {/* Primary Guardian */}
                      {primaryG ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                              {primaryG.fullName} ({primaryG.relationship || 'Guardian'})
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.55)' }}>{primaryG.phone || 'No phone'}</div>
                          </div>
                          {primaryG.phone && (
                            <a
                              href={`tel:${primaryG.phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#16A34A',
                                color: '#FFFFFF',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              <Phone size={12} />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                          Contact information unavailable
                        </div>
                      )}

                      {/* Secondary Guardian */}
                      {secondaryG ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                              {secondaryG.fullName} ({secondaryG.relationship || 'Guardian'})
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.55)' }}>{secondaryG.phone || 'No phone'}</div>
                          </div>
                          {secondaryG.phone && (
                            <a
                              href={`tel:${secondaryG.phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              <Phone size={12} />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                          Secondary contact unavailable
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB CONTENT: PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="card"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 900,
                margin: '0 auto 14px auto',
                boxShadow: '0 0 24px rgba(245, 158, 11, 0.4)',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden',
              }}
            >
              {driverUser?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driverUser.avatarUrl}
                  alt={driverUser.fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (driverUser?.fullName || 'Alex')[0]?.toUpperCase()
              )}
            </div>

            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{driverUser?.fullName || 'Alex'}</h2>
            <div style={{ fontSize: 13, color: '#FBBF24', fontWeight: 700, marginTop: 4 }}>
              Authorized School Bus Captain
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 2 }}>
              {branch?.name || 'Main Campus'} • Employee ID: {staffProfile?.employeeCode || 'EMP-2026-003'}
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Email Address:</span>
                <strong>{driverUser?.email || 'alex@gmail.com'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Registered Mobile:</span>
                <strong>{driverUser?.phone || '7809452176'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Assigned Vehicle:</span>
                <strong style={{ color: '#FBBF24' }}>{vehicleDisplayName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Assigned Route:</span>
                <strong>{currentRoute?.name || 'Kothrude'} ({currentRoute?.code || 'ROUTE_001'})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Account Status:</span>
                <span style={{ color: '#4ADE80', fontWeight: 800 }}>ACTIVE</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                marginTop: 24,
                width: '100%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <LogOut size={16} />
              <span>Sign Out from Driver Console</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODALS */}
      {/* ========================================================================= */}

      {/* Modal: Record Absent */}
      {absentModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FBBF24' }}>
                Mark Child Absent
              </h3>
              <button
                onClick={() => setAbsentModalStudent(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 14 }}>
              Mark <strong>{absentModalStudent.student.firstName}</strong> as absent for this trip. The student remains visible in your route list.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[
                'Parent informed: Child sick',
                'Parent informed: Traveling / Out of town',
                'Parent dropping child directly at school',
                'No show at stop (Bus waited 3 mins)',
                'Other reason',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setAbsentReason(reason)}
                  style={{
                    background: absentReason === reason ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: absentReason === reason ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: absentReason === reason ? '#FBBF24' : '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: 8,
                    textAlign: 'left',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>

            {absentReason === 'Other reason' && (
              <input
                type="text"
                placeholder="Enter custom absent note..."
                value={customAbsentReason}
                onChange={(e) => setCustomAbsentReason(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setAbsentModalStudent(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reason = absentReason === 'Other reason' ? (customAbsentReason || 'Other') : absentReason
                  handleUpdatePassengerStatus(absentModalStudent.tripId, absentModalStudent.student.id, 'ABSENT', reason)
                  setAbsentModalStudent(null)
                }}
                style={{
                  flex: 1,
                  background: '#D97706',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Confirm Absent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Guardian Handover */}
      {handoverModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#60A5FA' }}>
                Guardian Handover Confirmation
              </h3>
              <button
                onClick={() => { setHandoverModalStudent(null); setHandoverPin(''); }}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 14 }}>
              Confirm authorized recipient for <strong>{handoverModalStudent.student.firstName}</strong> at stop.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[
                'Parent (Mother/Father)',
                'Registered Guardian',
                'Grandparent',
                'Other authorized relative',
              ].map((recipient) => (
                <button
                  key={recipient}
                  onClick={() => setHandoverRecipient(recipient)}
                  style={{
                    background: handoverRecipient === recipient ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: handoverRecipient === recipient ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: handoverRecipient === recipient ? '#60A5FA' : '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: 8,
                    textAlign: 'left',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {recipient}
                </button>
              ))}
            </div>

            {handoverRecipient === 'Other authorized relative' && (
              <input
                type="text"
                placeholder="Enter recipient full name..."
                value={customHandoverRecipient}
                onChange={(e) => setCustomHandoverRecipient(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setHandoverModalStudent(null); setHandoverPin(''); }}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const recipient = handoverRecipient === 'Other authorized relative' ? (customHandoverRecipient || 'Authorized Relative') : handoverRecipient
                  handleUpdatePassengerStatus(handoverModalStudent.tripId, handoverModalStudent.student.id, 'DROPPED', undefined, recipient)
                  setHandoverModalStudent(null)
                }}
                style={{
                  flex: 1,
                  background: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Confirm Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exception */}
      {exceptionModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F87171' }}>
                Record Transit Exception
              </h3>
              <button
                onClick={() => setExceptionModalStudent(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 14 }}>
              Record exception for <strong>{exceptionModalStudent.student.firstName}</strong> during {exceptionModalStudent.type}.
            </div>

            <textarea
              placeholder="Describe exception (e.g., Guardian delayed at stop, student rerouted, etc.)..."
              rows={3}
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#FFFFFF',
                fontSize: 13,
                marginBottom: 14,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setExceptionModalStudent(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdatePassengerStatus(exceptionModalStudent.tripId, exceptionModalStudent.student.id, 'MISSED', exceptionReason.trim() || 'Transit exception')
                  setExceptionModalStudent(null)
                }}
                style={{
                  flex: 1,
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Save Exception
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Report Delay */}
      {delayModalTrip && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F87171' }}>
                Broadcast Trip Delay
              </h3>
              <button
                onClick={() => setDelayModalTrip(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 14 }}>
              Broadcast delay to all affected parents on <strong>{currentRoute?.name}</strong>.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: 4 }}>
                Delay (Minutes):
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: 4 }}>
                Delay Reason:
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <option value="Traffic Congestion">Heavy Traffic Congestion</option>
                <option value="Vehicle Mechanical Check">Vehicle Mechanical Check</option>
                <option value="Weather / Road Diversion">Weather / Road Diversion</option>
                <option value="Road Construction / Roadblock">Road Construction / Roadblock</option>
                <option value="Other Operational Delay">Other Operational Delay</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDelayModalTrip(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordDelay}
                disabled={loadingAction === 'record_delay'}
                style={{
                  flex: 1,
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {loadingAction === 'record_delay' ? 'Sending...' : 'Broadcast Delay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

