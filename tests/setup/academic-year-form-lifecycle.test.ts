import { describe, it, expect, beforeAll } from 'bun:test'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { signSession } from '@/lib/auth'
import { POST as academicYearsPost, GET as academicYearsGet } from '@/app/api/v1/academic-years/route'

describe('PRE1-SETUP-ACADEMIC-YEAR-FORM-LIFECYCLE-001: Academic Year Creation Form Lifecycle & Duplicate Guard', () => {
  let tenant: any
  let ownerUser: any
  let cookie: string
  const ts = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  beforeAll(async () => {
    // 1. Setup isolated test tenant
    tenant = await db.tenant.create({
      data: {
        name: `AY Lifecycle Test Academy ${ts}`,
        code: `AYL-${ts.slice(-4)}`,
        status: 'ACTIVE',
      },
    })

    // 2. Setup owner user
    ownerUser = await db.user.create({
      data: {
        fullName: `Owner AY ${ts}`,
        email: `owner.ay.${ts}@test.preone.local`,
        passwordHash: 'dummy_hash_for_test',
        status: 'ACTIVE',
      },
    })

    await db.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: ownerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })

    // 3. Create signed auth token cookie
    cookie = await signSession({
      uid: ownerUser.id,
      role: 'OWNER',
      tenantId: tenant.id,
      name: ownerUser.name,
      email: ownerUser.email,
    })
  })

  // ── Helper to execute POST request with tenant context ──
  async function createYear(body: Record<string, unknown>) {
    const req = new NextRequest('http://localhost:3000/api/v1/academic-years', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `preone_session=${cookie}`,
      },
      body: JSON.stringify(body),
    })
    return academicYearsPost(req)
  }

  // ── Helper to execute GET request with tenant context ──
  async function getYears() {
    const req = new NextRequest('http://localhost:3000/api/v1/academic-years', {
      method: 'GET',
      headers: {
        cookie: `preone_session=${cookie}`,
      },
    })
    return academicYearsGet(req)
  }

  describe('1. Backend Validation & Creation Contract', () => {
    it('successfully creates an academic year and returns 201 with created record', async () => {
      const yearName = `2027-2028-${ts}`
      const res = await createYear({
        name: yearName,
        startDate: '2027-04-01',
        endDate: '2028-03-31',
        status: 'ACTIVE',
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(yearName)
      expect(data.data.status).toBe('ACTIVE')
      expect(data.data.isCurrent).toBe(true) // First year is current
    })

    it('rejects missing or empty required fields with 400 validation error', async () => {
      const res = await createYear({
        name: '',
        startDate: '2028-04-01',
        endDate: '2029-03-31',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error?.message).toContain('required')
    })

    it('rejects invalid or inverted date range (endDate <= startDate) with 422 error', async () => {
      const res = await createYear({
        name: `Inverted Year ${ts}`,
        startDate: '2029-04-01',
        endDate: '2029-03-31',
      })

      expect(res.status).toBe(422)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error?.message).toContain('end date must be after start date')
    })

    it('rejects duplicate academic year name (case-insensitive) with 409 conflict', async () => {
      const yearName = `2030-2031-${ts}`
      const firstRes = await createYear({
        name: yearName,
        startDate: '2030-04-01',
        endDate: '2031-03-31',
      })
      expect(firstRes.status).toBe(201)

      // Try duplicate with lower/upper casing and trailing space
      const dupRes = await createYear({
        name: `  ${yearName.toLowerCase()}  `,
        startDate: '2031-04-01',
        endDate: '2032-03-31',
      })

      expect(dupRes.status).toBe(409)
      const data = await dupRes.json()
      expect(data.success).toBe(false)
      expect(data.error?.message).toContain('already exists')
    })

    it('rejects duplicate date range with 409 conflict even if name is different', async () => {
      const year1 = `Range Year 1 ${ts}`
      const year2 = `Range Year 2 ${ts}`
      const startDate = '2035-06-01'
      const endDate = '2036-05-31'

      const res1 = await createYear({
        name: year1,
        startDate,
        endDate,
      })
      expect(res1.status).toBe(201)

      const res2 = await createYear({
        name: year2,
        startDate,
        endDate,
      })
      expect(res2.status).toBe(409)
      const data = await res2.json()
      expect(data.success).toBe(false)
      expect(data.error?.message).toContain('identical dates')
    })

    it('refreshes academic year listing and includes newly created year', async () => {
      const newYearName = `Listing-Test-${ts}`
      const postRes = await createYear({
        name: newYearName,
        startDate: '2040-01-01',
        endDate: '2040-12-31',
      })
      expect(postRes.status).toBe(201)

      const getRes = await getYears()
      expect(getRes.status).toBe(200)
      const json = await getRes.json()
      expect(json.success).toBe(true)

      const names = json.data.map((y: any) => y.name)
      expect(names).toContain(newYearName)
    })
  })

  describe('2. Frontend Modal Lifecycle & Behavior Contract Verification', () => {
    it('verifies YearModal calls both onClose() and onDone() upon successful creation', async () => {
      const pageFile = await Bun.file('src/app/app/setup/[step]/page.tsx').text()

      // 1. YearModal must exist
      expect(pageFile).toContain('function YearModal(')

      // 2. YearModal must invoke onClose() and onDone() on j.success
      expect(pageFile).toMatch(/if\s*\(j\.success\)\s*\{[^}]*onClose\(\)[^}]*onDone\(\)/)

      // 3. Must display exact success toast
      expect(pageFile).toContain("toast.success('Academic Year created successfully.'")
    })

    it('verifies YearModal guards against duplicate in-flight submissions and double-clicks', async () => {
      const pageFile = await Bun.file('src/app/app/setup/[step]/page.tsx').text()

      // Must guard with busy check before proceeding
      expect(pageFile).toContain('if (busy) return')

      // Must disable submit button when busy
      expect(pageFile).toMatch(/disabled=\{busy\}[^>]*>\s*\{busy \? 'Creating\.\.\.' : 'Create Year'\}/)
    })

    it('verifies YearModal preserves form values and keeps modal open on failure', async () => {
      const pageFile = await Bun.file('src/app/app/setup/[step]/page.tsx').text()
      const yearModalCode = pageFile.slice(
        pageFile.indexOf('function YearModal('),
        pageFile.indexOf('function EventModal(')
      )

      // Controlled state values
      expect(yearModalCode).toContain('const [name, setName] = useState(')
      expect(yearModalCode).toContain('const [startDate, setStartDate] = useState(')
      expect(yearModalCode).toContain('const [endDate, setEndDate] = useState(')

      // Error message banner
      expect(yearModalCode).toContain('{errorMsg && (')
      expect(yearModalCode).toContain('setErrorMsg(msg)')

      // onClose must NOT be called in failure path
      const failBlockMatch = yearModalCode.match(/else\s*\{[\s\S]*?setErrorMsg\(msg\)[\s\S]*?\}/)
      expect(failBlockMatch).not.toBeNull()
      expect(failBlockMatch![0]).not.toContain('onClose()')
    })

    it('verifies YearModal integrates GlobalDatePicker for date inputs', async () => {
      const pageFile = await Bun.file('src/app/app/setup/[step]/page.tsx').text()

      // Must import GlobalDatePicker
      expect(pageFile).toContain("import { GlobalDatePicker } from '@/components/ui/GlobalDatePicker'")

      // Must use GlobalDatePicker for startDate and endDate in YearModal
      expect(pageFile).toMatch(/<GlobalDatePicker\s+name="startDate"/)
      expect(pageFile).toMatch(/<GlobalDatePicker\s+name="endDate"/)
    })
  })
})
