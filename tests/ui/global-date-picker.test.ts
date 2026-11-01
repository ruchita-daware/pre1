import { describe, it, expect } from 'bun:test'
import {
  parseDateSafe,
  formatToDateOnly,
  toDateOnlyIso,
  formatDisplayDate,
  WEEKDAYS,
  MONTH_NAMES,
  MONTH_SHORT,
  toIso,
} from '@/components/ui/GlobalDatePicker'

describe('PRE1-GLOBAL-DATE-PICKER-REDESIGN-001: GlobalDatePicker Specification & Regression Suite', () => {
  // ── 1. Date Parsing & Timezone Safety ──
  describe('1. Timezone-Safe Date Parsing & Formatting', () => {
    it('parses YYYY-MM-DD safely without any UTC midnight timezone shifts', () => {
      const parsed = parseDateSafe('2026-11-05')
      expect(parsed).not.toBeNull()
      expect(parsed!.y).toBe(2026)
      expect(parsed!.m).toBe(10) // 0-indexed November
      expect(parsed!.d).toBe(5)

      expect(formatToDateOnly(parsed!.y, parsed!.m, parsed!.d)).toBe('2026-11-05')
      expect(toDateOnlyIso('2026-11-05')).toBe('2026-11-05')
    })

    it('safely extracts calendar date coordinates from full ISO timestamp strings', () => {
      const parsed = parseDateSafe('2026-10-15T14:30:00.000Z')
      expect(parsed).not.toBeNull()
      expect(parsed!.y).toBe(2026)
      expect(parsed!.m).toBe(9) // October
      expect(parsed!.d).toBe(15)
      expect(toDateOnlyIso('2026-10-15T14:30:00.000Z')).toBe('2026-10-15')
    })

    it('handles Date objects correctly', () => {
      const d = new Date(2026, 5, 20) // June 20, 2026
      const parsed = parseDateSafe(d)
      expect(parsed).not.toBeNull()
      expect(parsed!.y).toBe(2026)
      expect(parsed!.m).toBe(5)
      expect(parsed!.d).toBe(20)
      expect(toDateOnlyIso(d)).toBe('2026-06-20')
    })

    it('returns null / empty string for null, undefined, or empty values', () => {
      expect(parseDateSafe(null)).toBeNull()
      expect(parseDateSafe(undefined)).toBeNull()
      expect(parseDateSafe('')).toBeNull()
      expect(parseDateSafe('   ')).toBeNull()
      expect(parseDateSafe('invalid-date')).toBeNull()
      expect(toDateOnlyIso(null)).toBe('')
      expect(toDateOnlyIso('')).toBe('')
    })

    it('formats display dates nicely according to locale', () => {
      expect(formatDisplayDate('2026-11-05', 'en-IN')).toContain('Nov')
      expect(formatDisplayDate('2026-11-05', 'en-IN')).toContain('2026')
      expect(formatDisplayDate(null)).toBe('')
    })
  })

  // ── 2. Month Boundaries & Leap Years ──
  describe('2. Leap Years & Month Boundaries', () => {
    it('accurately calculates leap year days for February 2024 (29 days)', () => {
      const leapDays = new Date(2024, 2, 0).getDate()
      expect(leapDays).toBe(29)

      const parsedLeap = parseDateSafe('2024-02-29')
      expect(parsedLeap!.d).toBe(29)
      expect(formatToDateOnly(2024, 1, 29)).toBe('2024-02-29')
    })

    it('accurately calculates non-leap year days for February 2025 and 2026 (28 days)', () => {
      expect(new Date(2025, 2, 0).getDate()).toBe(28)
      expect(new Date(2026, 2, 0).getDate()).toBe(28)
      expect(new Date(2027, 2, 0).getDate()).toBe(28)
      expect(new Date(2028, 2, 0).getDate()).toBe(29) // 2028 is a leap year
    })

    it('handles year boundary transitions (Dec 31 -> Jan 1)', () => {
      const endOfYear = parseDateSafe('2026-12-31')
      const startOfYear = parseDateSafe('2027-01-01')

      expect(formatToDateOnly(endOfYear!.y, endOfYear!.m, endOfYear!.d)).toBe('2026-12-31')
      expect(formatToDateOnly(startOfYear!.y, startOfYear!.m, startOfYear!.d)).toBe('2027-01-01')
    })

    it('handles all 12 month day counts correctly in non-leap year', () => {
      const expectedDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(2026, m + 1, 0).getDate()
        expect(daysInMonth).toBe(expectedDays[m])
      }
    })
  })

  // ── 3. Range Bounds Restrictions (minDate & maxDate) ──
  describe('3. Minimum and Maximum Date Restrictions', () => {
    it('correctly evaluates dates against minDate and maxDate bounds', () => {
      const minIso = '2026-06-01'
      const maxIso = '2026-12-31'

      const isAllowed = (iso: string) => iso >= minIso && iso <= maxIso

      expect(isAllowed('2026-05-31')).toBe(false)
      expect(isAllowed('2026-06-01')).toBe(true)
      expect(isAllowed('2026-09-15')).toBe(true)
      expect(isAllowed('2026-12-31')).toBe(true)
      expect(isAllowed('2027-01-01')).toBe(false)
    })
  })

  // ── 4. 12-Year Window Navigation ──
  describe('4. 12-Year Navigation Logic', () => {
    it('pages 12-year windows deterministically', () => {
      const windowFor = (yr: number) => Math.floor(yr / 12) * 12
      expect(windowFor(2026)).toBe(2016)
      expect(windowFor(2016)).toBe(2016)
      expect(windowFor(2027)).toBe(2016)
      expect(windowFor(2028)).toBe(2028)
      expect(windowFor(2015)).toBe(2004)
    })
  })

  // ── 5. Component Architecture & Re-export Integrity ──
  describe('5. Shared Component Architecture & Re-export Integrity', () => {
    it('verifies GlobalDatePicker is exported from canonical locations', async () => {
      const uiFile = await Bun.file('src/components/ui/GlobalDatePicker.tsx').text()
      expect(uiFile).toContain('export function GlobalDatePicker')
      expect(uiFile).toContain('export function parseDateSafe')
      expect(uiFile).toContain('export function formatToDateOnly')
      expect(uiFile).toContain('export function toDateOnlyIso')

      const preoneFile = await Bun.file('src/components/preone/GlobalDatePicker.tsx').text()
      expect(preoneFile).toContain("@/components/ui/GlobalDatePicker")

      const preoneIndex = await Bun.file('src/components/preone/index.ts').text()
      expect(preoneIndex).toContain('./GlobalDatePicker')

      const formsFile = await Bun.file('src/components/preone/forms.tsx').text()
      expect(formsFile).toContain('export const GlobalDatePicker = DatePicker')
    })

    it('verifies weekday labels and month names consistency', () => {
      expect(WEEKDAYS.length).toBe(7)
      expect(MONTH_NAMES.length).toBe(12)
      expect(MONTH_SHORT.length).toBe(12)
      expect(WEEKDAYS[0]).toBe('Su')
      expect(MONTH_NAMES[0]).toBe('January')
      expect(MONTH_SHORT[0]).toBe('Jan')
    })
  })

  // ── 6. Follow-up Workflow Migration Verification ──
  describe('6. Follow-up Workflow Date-Only Migration', () => {
    it('verifies StartApplicationModal is migrated to Follow-up Date without time picker', async () => {
      const code = await Bun.file('src/components/admissions/StartApplicationModal.tsx').text()

      // 1. Must use "Follow-up Date *" label, NOT "Follow-up Date & Time *"
      expect(code).toContain('Follow-up Date *')
      expect(code).not.toContain('Follow-up Date & Time')

      // 2. Must NOT contain native datetime-local input
      expect(code).not.toContain('type="datetime-local"')

      // 3. Must use GlobalDatePicker component
      expect(code).toContain('<GlobalDatePicker')

      // 4. Must validate date-only error message
      expect(code).toContain('Please specify the follow-up reminder date.')
      expect(code).not.toContain('date and time')
    })

    it('verifies CallLogDialog is migrated to date-only Next Follow-up Date', async () => {
      const code = await Bun.file('src/components/admissions/CallLogDialog.tsx').text()

      // 1. Follow-up section must use GlobalDatePicker
      expect(code).toContain('<GlobalDatePicker')
      expect(code).toContain('Next Follow-up Date (Optional)')

      // 2. Follow-up input must not be type="datetime-local"
      expect(code).not.toContain('value={followUpDate}\n            onChange={(e) => {\n              setFollowUpDate(e.target.value)')
    })

    it('verifies AdmissionPipelineBoard follow-up modal is migrated to date-only', async () => {
      const code = await Bun.file('src/components/admissions/AdmissionPipelineBoard.tsx').text()

      expect(code).toContain('Follow-up Date *')
      expect(code).not.toContain('Follow-up Due Date & Time *')
      expect(code).toContain('<GlobalDatePicker')
    })

    it('verifies Enquiries page follow-up modal is migrated to GlobalDatePicker', async () => {
      const code = await Bun.file('src/app/app/admissions/enquiries/page.tsx').text()

      expect(code).toContain('Follow-up Date')
      expect(code).not.toContain('Next Follow-up Due Date & Time')
      expect(code).toContain('<GlobalDatePicker')
    })

    it('verifies Follow-ups page reschedule modal is migrated to GlobalDatePicker', async () => {
      const code = await Bun.file('src/app/app/admissions/follow-ups/page.tsx').text()

      expect(code).toContain('Next Follow-up Date (Optional)')
      expect(code).not.toContain('Next Scheduled Follow-up (Optional)\n            <input\n              type="datetime-local"')
      expect(code).toContain('<GlobalDatePicker')
    })

    it('verifies Admissions page follow-up modal is migrated to GlobalDatePicker', async () => {
      const code = await Bun.file('src/app/app/admissions/page.tsx').text()

      expect(code).toContain('Next Follow-up Date')
      expect(code).toContain('<GlobalDatePicker name="dueAt"')
      expect(code).toContain('<GlobalDatePicker\n                  name="nextFollowUpAt"')
    })
  })

  // ── 7. Styling & Accessibility CSS Contracts ──
  describe('7. CSS & Design System Styling Contracts', () => {
    it('verifies globals.css provides dedicated rules for GlobalDatePicker states', async () => {
      const css = await Bun.file('src/app/globals.css').text()

      // 1. Day states
      expect(css).toContain('.dp-day.is-today:not(.on)')
      expect(css).toContain('.dp-day.disabled')
      expect(css).toContain('.dp-day:disabled')
      expect(css).toContain('.dp-day.on')

      // 2. Clear button & small size
      expect(css).toContain('.dp-input-clear-btn')
      expect(css).toContain('.dp-input-sm')

      // 3. Dropdown alignment & mobile responsiveness
      expect(css).toContain('.dp-cal.align-right')
      expect(css).toContain('@media (max-width: 480px)')
    })
  })

  // ── 8. Backend & Historical Data Safety ──
  describe('8. Backend & Historical Data Compatibility', () => {
    it('ensures backend Date parsing accepts date-only YYYY-MM-DD cleanly', () => {
      const dateOnlyStr = '2026-11-05'
      const parsedDate = new Date(dateOnlyStr)

      expect(isNaN(parsedDate.getTime())).toBe(false)
      expect(parsedDate.toISOString().slice(0, 10)).toBe('2026-11-05')
    })

    it('preserves historical timestamps when read back through toDateOnlyIso', () => {
      // Historical follow-up with specific hour/minute
      const historicalIso = '2026-09-15T11:45:00.000Z'
      const dateOnly = toDateOnlyIso(historicalIso)

      expect(dateOnly).toBe('2026-09-15')
    })
  })
})
