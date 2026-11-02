'use client'

import React, { useMemo } from 'react'
import {
  CalendarCheck,
  Clock,
  Edit3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Save,
  X,
} from 'lucide-react'
import { Avatar, StatusBadge, IconButton } from '@/components/preone/ui'
import { DataTable, Column } from '@/components/preone/DataTable'
import { GlobalDatePicker } from '@/components/ui/GlobalDatePicker'
import { AttendanceCalculator } from '@/lib/hr/attendance-calculator'
import type { AttendanceRecord, BranchOption } from './types'
import { timeOf } from './types'

interface HRAttendanceTabProps {
  attendanceRecords: AttendanceRecord[] | null
  date: string
  onDateChange: (d: string) => void
  branches: BranchOption[]
  branchFilter: string
  onBranchFilterChange: (b: string) => void
  statusFilter: string
  onStatusFilterChange: (s: string) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onOpenCorrection: (record: AttendanceRecord) => void
  canWrite?: boolean
}

export function HRAttendanceTab({
  attendanceRecords,
  date,
  onDateChange,
  branches,
  branchFilter,
  onBranchFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  onOpenCorrection,
  canWrite,
}: HRAttendanceTabProps) {
  const isToday = date === new Date().toISOString().split('T')[0]

  // Quick date navigator helpers
  const handlePrevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    onDateChange(d.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    onDateChange(d.toISOString().split('T')[0])
  }

  const handleToday = () => {
    onDateChange(new Date().toISOString().split('T')[0])
  }

  // Summary counts for the selected date calculated via Canonical Attendance Engine
  const summary = useMemo(() => {
    if (!attendanceRecords) {
      return { total: 0, present: 0, late: 0, halfDay: 0, fullDay: 0, onLeave: 0, absent: 0, missingCheckout: 0 }
    }
    return AttendanceCalculator.aggregateRecords(attendanceRecords)
  }, [attendanceRecords])

  // Columns definition
  const columns = useMemo<Column<AttendanceRecord>[]>(
    () => [
      {
        key: 'name',
        header: 'Employee',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2.5 py-1">
            <Avatar name={row.name} size="md" />
            <div>
              <div className="font-semibold text-foreground leading-tight text-sm">{row.name}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="font-mono">{row.employeeCode}</span>
                <span>• {row.designation || 'Staff'}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branchName',
        header: 'Campus',
        sortable: true,
        render: (row) => (
          <span className="text-xs text-foreground font-medium px-2 py-0.5 rounded bg-muted/40">
            {row.branchName || 'Main Campus'}
          </span>
        ),
      },
      {
        key: 'checkIn',
        header: 'Check-In',
        sortable: true,
        render: (row) => (
          <div className="text-xs">
            <span className="font-mono text-foreground font-semibold">
              {timeOf(row.checkIn)}
            </span>
            {row.lateMinutes > 0 && (
              <span className="ml-1.5 badge b-warning text-[10px] px-1 py-0">
                +{row.lateMinutes}m
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'checkOut',
        header: 'Check-Out',
        sortable: true,
        render: (row) => (
          <span className="text-xs font-mono text-foreground font-semibold">
            {timeOf(row.checkOut)}
          </span>
        ),
      },
      {
        key: 'workedHours',
        header: 'Worked Hours',
        sortable: true,
        align: 'center',
        render: (row) => (
          <div className="text-xs">
            <span className="font-medium text-foreground">
              {row.workedHours > 0 ? `${row.workedHours} hrs` : '—'}
            </span>
            <div className="text-[10px] text-muted-foreground">Standard 8h shift</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) =>
          canWrite ? (
            <IconButton
              icon={<Edit3 size={14} />}
              label="Attendance Correction"
              title="Audit-backed Correction"
              size="sm"
              onClick={() => onOpenCorrection(row)}
            />
          ) : null,
      },
    ],
    [canWrite, onOpenCorrection]
  )

  const recordsToDisplay = useMemo(() => {
    if (!attendanceRecords) return null
    if (statusFilter === 'ALL') return attendanceRecords
    if (statusFilter === 'MISSING_CHECKOUT') {
      return attendanceRecords.filter((r) => r.isMissingCheckout || (r.checkIn && !r.checkOut))
    }
    if (statusFilter === 'FULL_DAY') {
      return attendanceRecords.filter((r) => (r.status === 'PRESENT' || r.status === 'LATE') && (r.workedHours ?? 0) >= 7.0)
    }
    return attendanceRecords.filter((r) => r.status === statusFilter)
  }, [attendanceRecords, statusFilter])

  return (
    <div className="space-y-4">
      {/* ── 1. Daily Roll Call Context & Navigation Bar ── */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="btn btn-ghost btn-sm p-1.5 h-9 w-9 rounded-xl border border-border/70 hover:bg-muted/50"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="w-[160px]">
            <GlobalDatePicker
              value={date}
              onChange={onDateChange}
              size="sm"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="btn btn-ghost btn-sm p-1.5 h-9 w-9 rounded-xl border border-border/70 hover:bg-muted/50"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={handleToday}
            className={`btn btn-sm text-xs font-semibold px-3 h-9 rounded-xl ${
              isToday ? 'btn-primary' : 'btn-ghost border border-border/70'
            }`}
          >
            Today
          </button>
        </div>

        {/* Live Status Counter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="badge b-success text-xs font-semibold px-2.5 py-1">
            Present: {summary.present}
          </span>
          <span className="badge b-warning text-xs font-semibold px-2.5 py-1">
            Late: {summary.late}
          </span>
          <span className="badge b-info text-xs font-semibold px-2.5 py-1">
            Half Day: {summary.halfDay}
          </span>
          <span className="badge b-primary text-xs font-semibold px-2.5 py-1">
            On Leave: {summary.onLeave}
          </span>
          <span className="badge b-danger text-xs font-semibold px-2.5 py-1">
            Absent: {summary.absent}
          </span>
          {summary.missingCheckout > 0 && (
            <span className="badge b-danger text-xs font-semibold px-2.5 py-1 border border-danger/40">
              Missing Punch: {summary.missingCheckout}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Filters & Attendance Table ── */}
      <DataTable
        columns={columns}
        data={recordsToDisplay}
        loading={attendanceRecords === null}
        searchPlaceholder="Search staff by name or code..."
        searchValue={searchQuery}
        onSearch={onSearchQueryChange}
        filters={
          <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto scrollbar-none py-0.5 max-w-full">
            {/* Campus Filter */}
            <div className="relative shrink-0">
              <select
                className={`select !h-9 text-xs py-1 pl-3 pr-8 font-medium rounded-xl border cursor-pointer shadow-2xs transition-colors focus:ring-1 focus:ring-primary/30 ${
                  branchFilter !== 'ALL'
                    ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
                    : 'bg-background/80 border-border/80 text-foreground hover:border-border'
                }`}
                style={{ width: 'auto', minWidth: 140, height: 36 }}
                value={branchFilter}
                onChange={(e) => onBranchFilterChange(e.target.value)}
                aria-label="Filter by campus"
              >
                <option value="ALL">All Campuses</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative shrink-0">
              <select
                className={`select !h-9 text-xs py-1 pl-3 pr-8 font-medium rounded-xl border cursor-pointer shadow-2xs transition-colors focus:ring-1 focus:ring-primary/30 ${
                  statusFilter !== 'ALL'
                    ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
                    : 'bg-background/80 border-border/80 text-foreground hover:border-border'
                }`}
                style={{ width: 'auto', minWidth: 140, height: 36 }}
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="FULL_DAY">Full-Day Staff</option>
                <option value="LATE">Late Arrivals</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="MISSING_CHECKOUT">Missing Check-outs</option>
                <option value="ABSENT">Absent / Unmarked</option>
              </select>
            </div>

            {/* Reset Button */}
            {(branchFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  onBranchFilterChange('ALL')
                  onStatusFilterChange('ALL')
                }}
                className="btn btn-ghost btn-sm text-xs h-9 px-2.5 text-muted-foreground hover:text-foreground shrink-0 rounded-xl flex items-center gap-1 border border-border/60"
                title="Reset filters"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        }
        emptyTitle="No Attendance Records"
        emptyMessage={`No staff attendance entries found for ${new Date(date).toLocaleDateString('en-IN')}.`}
        emptyIcon={<CalendarCheck size={36} className="text-muted-foreground opacity-50" />}
        paginate
        defaultPageSize={20}
        showExport
        exportFileName={`preone-staff-attendance-${date}`}
      />
    </div>
  )
}
