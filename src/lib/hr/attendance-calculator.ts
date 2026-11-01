/**
 * Single Canonical Attendance Calculation Engine
 * Used consistently across Attendance Ledger, Staff Profile, Leave, and Payroll.
 */

export interface PunchTimes {
  checkIn?: Date | string | null
  checkOut?: Date | string | null
  shiftStart?: string // e.g., '08:30'
  shiftEnd?: string   // e.g., '16:30'
  shiftHours?: number // default 8.0
}

export interface AttendanceCalculationResult {
  workedHours: number
  lateMinutes: number
  isLate: boolean
  isHalfDay: boolean
  isFullDay: boolean
  isMissingCheckout: boolean
  computedStatus: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'UNMARKED'
}

export class AttendanceCalculator {
  static DEFAULT_SHIFT_START = '08:30'
  static DEFAULT_SHIFT_END = '16:30'
  static DEFAULT_SHIFT_HOURS = 8.0
  static LATE_GRACE_MINUTES = 15
  static FULL_DAY_MIN_HOURS = 7.0
  static HALF_DAY_MIN_HOURS = 4.0

  /**
   * Calculate worked hours, lateness, and day completion status from punch times.
   */
  static calculatePunch(params: PunchTimes, referenceDate = new Date()): AttendanceCalculationResult {
    const shiftStart = params.shiftStart || this.DEFAULT_SHIFT_START
    const shiftEnd = params.shiftEnd || this.DEFAULT_SHIFT_END
    const shiftHours = params.shiftHours ?? this.DEFAULT_SHIFT_HOURS

    if (!params.checkIn) {
      return {
        workedHours: 0,
        lateMinutes: 0,
        isLate: false,
        isHalfDay: false,
        isFullDay: false,
        isMissingCheckout: false,
        computedStatus: 'UNMARKED',
      }
    }

    const inTime = new Date(params.checkIn)
    const outTime = params.checkOut ? new Date(params.checkOut) : null

    // 1. Calculate Late Minutes
    const [startH, startM] = shiftStart.split(':').map(Number)
    const expectedStart = new Date(inTime)
    expectedStart.setHours(startH, startM, 0, 0)

    let lateMinutes = 0
    if (inTime.getTime() > expectedStart.getTime() + this.LATE_GRACE_MINUTES * 60 * 1000) {
      lateMinutes = Math.max(0, Math.floor((inTime.getTime() - expectedStart.getTime()) / (1000 * 60)))
    }
    const isLate = lateMinutes > 0

    // 2. Calculate Worked Hours
    let workedHours = 0
    if (outTime && outTime.getTime() > inTime.getTime()) {
      workedHours = parseFloat(((outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)).toFixed(2))
    }

    // 3. Detect Missing Check-out
    let isMissingCheckout = false
    if (!outTime) {
      const [endH, endM] = shiftEnd.split(':').map(Number)
      const expectedEnd = new Date(inTime)
      expectedEnd.setHours(endH, endM, 0, 0)
      // Check if reference date is past shift end + 60 minutes
      if (referenceDate.getTime() > expectedEnd.getTime() + 60 * 60 * 1000) {
        isMissingCheckout = true
      }
    }

    // 4. Derive Status
    const isFullDay = workedHours >= this.FULL_DAY_MIN_HOURS
    const isHalfDay = workedHours >= this.HALF_DAY_MIN_HOURS && workedHours < this.FULL_DAY_MIN_HOURS

    let computedStatus: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'UNMARKED' = 'UNMARKED'
    if (isFullDay) {
      computedStatus = isLate ? 'LATE' : 'PRESENT'
    } else if (isHalfDay) {
      computedStatus = 'HALF_DAY'
    } else if (outTime && workedHours < this.HALF_DAY_MIN_HOURS) {
      computedStatus = 'ABSENT'
    } else if (params.checkIn) {
      computedStatus = isLate ? 'LATE' : 'PRESENT'
    }

    return {
      workedHours,
      lateMinutes,
      isLate,
      isHalfDay,
      isFullDay,
      isMissingCheckout,
      computedStatus,
    }
  }

  /**
   * Aggregate attendance ledger records into institutional / branch KPIs.
   */
  static aggregateRecords(records: Array<{
    status: string
    checkIn?: Date | string | null
    checkOut?: Date | string | null
    workedHours?: number
  }>) {
    let present = 0
    let late = 0
    let halfDay = 0
    let fullDay = 0
    let absent = 0
    let onLeave = 0
    let missingCheckout = 0

    const now = new Date()

    for (const r of records) {
      if (r.status === 'ON_LEAVE') {
        onLeave++
        continue
      }
      if (r.status === 'ABSENT' || r.status === 'UNMARKED') {
        absent++
        continue
      }

      if (r.status === 'HALF_DAY') {
        halfDay++
      } else if (r.status === 'LATE') {
        late++
        if ((r.workedHours ?? 0) >= this.FULL_DAY_MIN_HOURS) {
          fullDay++
        }
      } else if (r.status === 'PRESENT') {
        present++
        if ((r.workedHours ?? 0) >= this.FULL_DAY_MIN_HOURS || (!r.checkOut && r.checkIn)) {
          fullDay++
        }
      }

      // Missing check-out check
      if (r.checkIn && !r.checkOut) {
        const check = this.calculatePunch({ checkIn: r.checkIn, checkOut: null }, now)
        if (check.isMissingCheckout) {
          missingCheckout++
        }
      }
    }

    return {
      total: records.length,
      present,
      late,
      halfDay,
      fullDay,
      absent,
      onLeave,
      missingCheckout,
    }
  }

  /**
   * Calculate total payable days for monthly payroll calculation.
   */
  static calculatePayableDays(params: {
    totalDaysInMonth: number
    presentDays: number
    lateDays: number
    halfDays: number
    paidLeaveDays: number
    weeklyOffDays: number
    holidayDays: number
    unpaidLeaveDays?: number
  }): number {
    const {
      presentDays,
      lateDays,
      halfDays,
      paidLeaveDays,
      weeklyOffDays,
      holidayDays,
      totalDaysInMonth,
    } = params

    // Full presence = present + late + paid leave + weekly off + holiday
    // Half day counts as 0.5 payable day
    const payable = presentDays + lateDays + (halfDays * 0.5) + paidLeaveDays + weeklyOffDays + holidayDays
    return Math.min(totalDaysInMonth, Math.max(0, parseFloat(payable.toFixed(2))))
  }
}
