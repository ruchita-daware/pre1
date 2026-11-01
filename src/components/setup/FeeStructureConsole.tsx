'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  RotateCw,
  Copy,
  Edit3,
  Trash2,
  Eye,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Clock,
  Download,
  Check,
  X,
  Sliders,
  AlertTriangle,
} from 'lucide-react'
import { StatusBadge, KpiTile, EmptyState } from '@/components/preone/ui'
import { Modal } from '@/components/preone/Modal'
import { useToast } from '@/components/preone/Toast'
import { inr, fmtDate } from '@/lib/format'

interface FeeHeadOption {
  id: string
  name: string
  code: string
  category: string
  description?: string | null
}

interface FeeItemRow {
  feeHeadId?: string | null
  name: string
  feeType: 'REGULAR' | 'REFUNDABLE_DEPOSIT'
  amountRupees: number | string
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUALLY'
  isMandatory: boolean
  dueRule: string
  dueDate?: string | null
  lateFeeApplicable: boolean
  lateFeeRupees: number | string
  isRefundable: boolean
  description?: string
}

interface FeeStructureRecord {
  id: string
  name: string
  description?: string | null
  status: 'ACTIVE' | 'DRAFT' | 'INACTIVE' | 'ARCHIVED'
  effectiveFrom?: string | null
  effectiveTo?: string | null
  branchId?: string | null
  programId?: string | null
  academicSessionId?: string | null
  academicSession?: { id: string; name: string } | null
  program?: { id: string; name: string; code?: string; programType?: string } | null
  classroom?: { id: string; name: string } | null
  items: Array<{
    id: string
    name: string
    feeHeadId?: string | null
    feeType: string
    amountCents: number
    frequency: string
    dueRule?: string | null
    lateFeeApplicable: boolean
    lateFeeAmountCents: number
    isRefundable: boolean
  }>
  _count?: { schedules: number }
  createdAt: string
  updatedAt: string
}

export function FeeStructureConsole({
  branches,
  programs,
  academicYears,
  onRefreshNeeded,
}: {
  branches: any[]
  programs: any[]
  academicYears: any[]
  onRefreshNeeded?: () => void
}) {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [structures, setStructures] = useState<FeeStructureRecord[]>([])
  const [feeHeads, setFeeHeads] = useState<FeeHeadOption[]>([])

  // Filters
  const [viewMode, setViewMode] = useState<'TABLE' | 'COVERAGE'>('TABLE')
  const [searchTerm, setSearchTerm] = useState('')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [programFilter, setProgramFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [frequencyFilter, setFrequencyFilter] = useState('ALL')

  // Modals
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null)
  const [viewingStructure, setViewingStructure] = useState<FeeStructureRecord | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    action: 'ACTIVATE' | 'DEACTIVATE'
    structure: FeeStructureRecord | null
  }>({ open: false, action: 'ACTIVATE', structure: null })

  // Multi-step Wizard State (Steps 1 to 4)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [saving, setSaving] = useState(false)

  // Wizard Section A Form
  const [sectionA, setSectionA] = useState({
    name: '',
    code: '',
    branchId: '',
    programId: '',
    academicSessionId: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
  })

  // Wizard Section B Fee Items
  const [sectionBItems, setSectionBItems] = useState<FeeItemRow[]>([])

  // Wizard Section C Billing Frequency
  const [sectionCFrequency, setSectionCFrequency] = useState<'ANNUAL' | 'TERM' | 'QUARTERLY' | 'MONTHLY'>('MONTHLY')

  // Load Structures and FeeHeads
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [stRes, fhRes] = await Promise.all([
        fetch('/api/v1/fee-structures', { cache: 'no-store' }),
        fetch('/api/v1/fee-heads', { cache: 'no-store' }),
      ])
      const stData = await stRes.json()
      const fhData = await fhRes.json()

      if (stData.success) {
        setStructures(stData.data || [])
      }
      if (fhData.success) {
        setFeeHeads(fhData.data || [])
      }
    } catch (e: any) {
      toast.error('Load Error', e.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter available programs mapped to selected branch in wizard
  const availableProgramsForBranch = useMemo(() => {
    if (!sectionA.branchId || sectionA.branchId === 'ALL') return programs
    return programs.filter((p) => {
      if (!p.branchMappings || p.branchMappings.length === 0) return true
      return p.branchMappings.some((bm: any) => bm.branchId === sectionA.branchId && bm.isActive)
    })
  }, [programs, sectionA.branchId])

  // Reset or initialize Create Wizard
  const openCreateWizard = (presetBranchId?: string, presetProgramId?: string) => {
    setEditingStructureId(null)
    const defBranch = presetBranchId || branches[0]?.id || ''
    const defYear = academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || ''
    const defProg = presetProgramId || programs[0]?.id || ''

    setSectionA({
      name: '',
      code: '',
      branchId: defBranch,
      programId: defProg,
      academicSessionId: defYear,
      description: '',
      status: 'ACTIVE',
    })

    // Pre-populate standard fee items
    setSectionBItems([
      {
        feeHeadId: feeHeads.find((h) => h.code === 'ADMISSION')?.id || null,
        name: 'Admission Fee',
        feeType: 'REGULAR',
        amountRupees: 5000,
        frequency: 'ONE_TIME',
        isMandatory: true,
        dueRule: 'On Admission',
        lateFeeApplicable: false,
        lateFeeRupees: 0,
        isRefundable: false,
        description: 'One-time admission registration charge',
      },
      {
        feeHeadId: feeHeads.find((h) => h.code === 'TUITION')?.id || null,
        name: 'Tuition Fee',
        feeType: 'REGULAR',
        amountRupees: 4000,
        frequency: 'MONTHLY',
        isMandatory: true,
        dueRule: '10th of every month',
        lateFeeApplicable: true,
        lateFeeRupees: 200,
        isRefundable: false,
        description: 'Monthly preschool classroom instruction',
      },
      {
        feeHeadId: feeHeads.find((h) => h.code === 'ACTIVITY')?.id || null,
        name: 'Activity & Discovery Fee',
        feeType: 'REGULAR',
        amountRupees: 2500,
        frequency: 'ANNUALLY',
        isMandatory: true,
        dueRule: 'Term Start',
        lateFeeApplicable: false,
        lateFeeRupees: 0,
        isRefundable: false,
        description: 'Annual discovery and sensory play supplies',
      },
      {
        feeHeadId: feeHeads.find((h) => h.code === 'CAUTION_DEPOSIT')?.id || null,
        name: 'Caution / Security Deposit',
        feeType: 'REFUNDABLE_DEPOSIT',
        amountRupees: 5000,
        frequency: 'ONE_TIME',
        isMandatory: true,
        dueRule: 'On Admission',
        lateFeeApplicable: false,
        lateFeeRupees: 0,
        isRefundable: true,
        description: 'Refundable security deposit',
      },
    ])

    setSectionCFrequency('MONTHLY')
    setWizardStep(1)
    setWizardOpen(true)
  }

  // Open Edit Wizard
  const openEditWizard = (st: FeeStructureRecord) => {
    setEditingStructureId(st.id)
    setSectionA({
      name: st.name,
      code: `FS-${st.id.slice(0, 6).toUpperCase()}`,
      branchId: st.branchId || '',
      programId: st.programId || '',
      academicSessionId: st.academicSessionId || '',
      description: st.description || '',
      status: st.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
    })

    setSectionBItems(
      st.items.map((it) => ({
        feeHeadId: it.feeHeadId || null,
        name: it.name,
        feeType: it.feeType as any,
        amountRupees: (it.amountCents / 100).toFixed(0),
        frequency: it.frequency as any,
        isMandatory: true,
        dueRule: it.dueRule || '',
        dueDate: null,
        lateFeeApplicable: it.lateFeeApplicable,
        lateFeeRupees: (it.lateFeeAmountCents / 100).toFixed(0),
        isRefundable: it.isRefundable,
      }))
    )

    // Detect frequency from items
    const hasMonthly = st.items.some((i) => i.frequency === 'MONTHLY')
    const hasQuarterly = st.items.some((i) => i.frequency === 'QUARTERLY')
    const hasHalfYearly = st.items.some((i) => i.frequency === 'HALF_YEARLY')
    setSectionCFrequency(
      hasMonthly ? 'MONTHLY' : hasQuarterly ? 'QUARTERLY' : hasHalfYearly ? 'TERM' : 'ANNUAL'
    )

    setWizardStep(1)
    setWizardOpen(true)
  }

  // Auto-generate name when branch / program / year changes
  useEffect(() => {
    if (!editingStructureId && wizardOpen && sectionA.branchId && sectionA.programId && sectionA.academicSessionId) {
      const p = programs.find((x) => x.id === sectionA.programId)
      const y = academicYears.find((x) => x.id === sectionA.academicSessionId)
      const b = branches.find((x) => x.id === sectionA.branchId)
      if (p && y) {
        setSectionA((prev) => ({
          ...prev,
          name: `${p.name} Fee Structure — ${y.name || 'AY'}${b ? ` (${b.code || b.name})` : ''}`,
          code: `FS-${(p.code || p.name.slice(0, 3)).toUpperCase()}-${y.name.replace(/[^0-9]/g, '').slice(-4) || '2026'}`,
        }))
      }
    }
  }, [sectionA.branchId, sectionA.programId, sectionA.academicSessionId, programs, academicYears, branches, editingStructureId, wizardOpen])

  // Calculations for Section B
  const feeTotals = useMemo(() => {
    let annualTotal = 0
    let oneTimeTotal = 0
    let recurringTotal = 0
    let optionalTotal = 0

    for (const item of sectionBItems) {
      const amt = Number(item.amountRupees) || 0
      const mult =
        item.frequency === 'MONTHLY' ? 12 : item.frequency === 'QUARTERLY' ? 4 : item.frequency === 'HALF_YEARLY' ? 2 : 1

      const lineAnnual = amt * mult
      annualTotal += lineAnnual

      if (item.frequency === 'ONE_TIME') {
        oneTimeTotal += amt
      } else {
        recurringTotal += lineAnnual
      }

      if (!item.isMandatory) {
        optionalTotal += lineAnnual
      }
    }

    return { annualTotal, oneTimeTotal, recurringTotal, optionalTotal }
  }, [sectionBItems])

  // Section C Installment Breakdown Preview
  const installmentsPreview = useMemo(() => {
    const recurring = feeTotals.recurringTotal
    if (recurring <= 0) return []

    if (sectionCFrequency === 'ANNUAL') {
      return [
        { name: 'Full Academic Year Installment', percentage: 100, amount: recurring, dueDate: 'At Admission' },
      ]
    }
    if (sectionCFrequency === 'TERM') {
      const perTerm = Math.round(recurring / 3)
      return [
        { name: 'Term 1 Installment', percentage: 33.33, amount: perTerm, dueDate: 'Term 1 Start (June)' },
        { name: 'Term 2 Installment', percentage: 33.33, amount: perTerm, dueDate: 'Term 2 Start (October)' },
        { name: 'Term 3 Installment', percentage: 33.34, amount: recurring - perTerm * 2, dueDate: 'Term 3 Start (January)' },
      ]
    }
    if (sectionCFrequency === 'QUARTERLY') {
      const perQuarter = Math.round(recurring / 4)
      return [
        { name: 'Quarter 1 (Q1)', percentage: 25, amount: perQuarter, dueDate: '10th July' },
        { name: 'Quarter 2 (Q2)', percentage: 25, amount: perQuarter, dueDate: '10th October' },
        { name: 'Quarter 3 (Q3)', percentage: 25, amount: perQuarter, dueDate: '10th January' },
        { name: 'Quarter 4 (Q4)', percentage: 25, amount: recurring - perQuarter * 3, dueDate: '10th April' },
      ]
    }
    // Monthly
    const perMonth = Math.round(recurring / 12)
    return Array.from({ length: 12 }, (_, i) => ({
      name: `Month ${i + 1} Installment`,
      percentage: Number((100 / 12).toFixed(2)),
      amount: i === 11 ? recurring - perMonth * 11 : perMonth,
      dueDate: `10th of Month ${i + 1}`,
    }))
  }, [feeTotals.recurringTotal, sectionCFrequency])

  // Add Item in Section B
  const addFeeItem = () => {
    setSectionBItems((prev) => [
      ...prev,
      {
        feeHeadId: null,
        name: '',
        feeType: 'REGULAR',
        amountRupees: 1000,
        frequency: 'ANNUALLY',
        isMandatory: true,
        dueRule: 'Term Start',
        lateFeeApplicable: false,
        lateFeeRupees: 0,
        isRefundable: false,
      },
    ])
  }

  // Remove Item
  const removeFeeItem = (idx: number) => {
    if (sectionBItems.length <= 1) {
      toast.error('Validation', 'A fee structure must contain at least one fee head')
      return
    }
    setSectionBItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // Duplicate Fee Head validation
  const hasDuplicateFeeHeads = useMemo(() => {
    const names = sectionBItems.map((i) => i.name.trim().toLowerCase()).filter(Boolean)
    const unique = new Set(names)
    return unique.size !== names.length
  }, [sectionBItems])

  // Save / Submit Wizard
  const handleSaveWizard = async (forcedStatus?: 'ACTIVE' | 'DRAFT') => {
    const finalStatus = forcedStatus || sectionA.status

    if (!sectionA.name.trim()) {
      toast.error('Name Required', 'Please enter a name for the fee structure')
      return
    }
    if (!sectionA.programId) {
      toast.error('Program Required', 'Please select a program')
      return
    }
    if (!sectionA.academicSessionId) {
      toast.error('Academic Year Required', 'Please select an academic year')
      return
    }
    if (hasDuplicateFeeHeads) {
      toast.error('Duplicate Head', 'Please eliminate duplicate fee heads in the list')
      return
    }

    for (const item of sectionBItems) {
      if (!item.name.trim()) {
        toast.error('Validation', 'All fee heads must have a valid name')
        return
      }
      if (Number(item.amountRupees) <= 0) {
        toast.error('Validation', `Amount for "${item.name}" must be greater than zero`)
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        branchId: sectionA.branchId || null,
        programId: sectionA.programId,
        academicSessionId: sectionA.academicSessionId,
        name: sectionA.name.trim(),
        description: sectionA.description.trim() || null,
        status: finalStatus,
        items: sectionBItems.map((it, idx) => ({
          feeHeadId: it.feeHeadId || null,
          name: it.name.trim(),
          feeType: it.feeType,
          amountCents: Math.round(Number(it.amountRupees) * 100),
          frequency: it.frequency,
          dueRule: it.dueRule?.trim() || null,
          lateFeeApplicable: Boolean(it.lateFeeApplicable),
          lateFeeAmountCents: it.lateFeeApplicable ? Math.round(Number(it.lateFeeRupees) * 100) : 0,
          isRefundable: Boolean(it.isRefundable || it.feeType === 'REFUNDABLE_DEPOSIT'),
          sortOrder: idx,
        })),
      }

      let res: Response
      if (editingStructureId) {
        res = await fetch(`/api/v1/fee-structures/${editingStructureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/v1/fee-structures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          editingStructureId ? 'Fee Structure Updated' : 'Fee Structure Created',
          `"${sectionA.name}" successfully saved in ${finalStatus} status`
        )
        setWizardOpen(false)
        loadData()
        onRefreshNeeded?.()
      } else {
        toast.error('Save Failed', data.error?.message || 'Database error')
      }
    } catch (e: any) {
      toast.error('Network Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  // Duplicate Structure Action
  const handleDuplicate = async (st: FeeStructureRecord) => {
    try {
      const res = await fetch(`/api/v1/fee-structures/${st.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Structure Duplicated', `Created "${data.data?.name || 'Duplicate'}" in Draft`)
        loadData()
        onRefreshNeeded?.()
      } else {
        toast.error('Failed to duplicate', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  // Activate / Deactivate confirmation
  const handleConfirmStatusChange = async () => {
    if (!confirmModal.structure) return
    const newStatus = confirmModal.action === 'ACTIVATE' ? 'ACTIVE' : 'INACTIVE'
    try {
      const res = await fetch(`/api/v1/fee-structures/${confirmModal.structure.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          newStatus === 'ACTIVE' ? 'Structure Activated' : 'Structure Deactivated',
          `"${confirmModal.structure.name}" is now ${newStatus}`
        )
        setConfirmModal({ open: false, action: 'ACTIVATE', structure: null })
        loadData()
        onRefreshNeeded?.()
      } else {
        toast.error('Action Failed', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  // Coverage Matrix Calculation
  const coverageMatrix = useMemo(() => {
    const activeBranches = branches.filter((b) => b.isActive)
    const activeProgs = programs.filter((p) => p.isActive)
    const rows: Array<{
      branch: any
      program: any
      activeStructure: FeeStructureRecord | null
      draftStructure: FeeStructureRecord | null
      status: 'CONFIGURED' | 'DRAFT' | 'INACTIVE' | 'MISSING'
    }> = []

    for (const prog of activeProgs) {
      for (const branch of activeBranches) {
        const isMapped =
          !prog.branchMappings ||
          prog.branchMappings.length === 0 ||
          prog.branchMappings.some((bm: any) => bm.branchId === branch.id && bm.isActive)

        if (isMapped) {
          const matching = structures.filter(
            (st) =>
              (st.programId === prog.id || st.program?.programType === prog.programType) &&
              (!st.branchId || st.branchId === branch.id)
          )
          const activeSt = matching.find((s) => s.status === 'ACTIVE')
          const draftSt = matching.find((s) => s.status === 'DRAFT')
          const inactiveSt = matching.find((s) => s.status === 'INACTIVE')

          let status: 'CONFIGURED' | 'DRAFT' | 'INACTIVE' | 'MISSING' = 'MISSING'
          if (activeSt) status = 'CONFIGURED'
          else if (draftSt) status = 'DRAFT'
          else if (inactiveSt) status = 'INACTIVE'

          rows.push({
            branch,
            program: prog,
            activeStructure: activeSt || null,
            draftStructure: draftSt || null,
            status,
          })
        }
      }
    }

    if (branchFilter === 'ALL') return rows
    return rows.filter((r) => r.branch.id === branchFilter)
  }, [branches, programs, structures, branchFilter])

  // Coverage percentage
  const totalCombinations = coverageMatrix.length
  const configuredCombinations = coverageMatrix.filter((r) => r.status === 'CONFIGURED').length
  const missingCoverageCount = coverageMatrix.filter((r) => r.status === 'MISSING').length
  const coveragePercent = totalCombinations > 0 ? Math.round((configuredCombinations / totalCombinations) * 100) : 100

  // Filtered Structures Table
  const filteredStructures = useMemo(() => {
    return structures.filter((st) => {
      if (branchFilter !== 'ALL' && st.branchId && st.branchId !== branchFilter) return false
      if (programFilter !== 'ALL' && st.programId && st.programId !== programFilter) return false
      if (yearFilter !== 'ALL' && st.academicSessionId && st.academicSessionId !== yearFilter) return false
      if (statusFilter !== 'ALL' && st.status !== statusFilter) return false
      if (frequencyFilter !== 'ALL') {
        const hasFreq = st.items.some((i) => i.frequency === frequencyFilter)
        if (!hasFreq) return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = st.name.toLowerCase().includes(q)
        const matchProg = (st.program?.name || '').toLowerCase().includes(q)
        const matchItem = st.items.some((i) => i.name.toLowerCase().includes(q))
        if (!matchName && !matchProg && !matchItem) return false
      }
      return true
    })
  }, [structures, branchFilter, programFilter, yearFilter, statusFilter, frequencyFilter, searchTerm])

  const totalStructuresCount = structures.length
  const activeStructuresCount = structures.filter((s) => s.status === 'ACTIVE').length
  const draftStructuresCount = structures.filter((s) => s.status === 'DRAFT').length
  const inactiveStructuresCount = structures.filter((s) => s.status === 'INACTIVE' || s.status === 'ARCHIVED').length

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          label="Total Fee Structures"
          value={totalStructuresCount.toString()}
          meta={`${activeStructuresCount} Active • ${draftStructuresCount} Draft`}
          icon={<Layers className="size-5 text-indigo-600" />}
          iconClass="ic-purple"
        />
        <KpiTile
          label="Active Fee Plans"
          value={activeStructuresCount.toString()}
          meta="Operational on student rosters"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          iconClass="ic-emerald"
        />
        <KpiTile
          label="Campus Pricing Coverage"
          value={`${coveragePercent}%`}
          meta={`${configuredCombinations}/${totalCombinations} Program combinations`}
          icon={<ShieldCheck className="size-5 text-purple-600" />}
          iconClass={coveragePercent === 100 ? 'ic-emerald' : 'ic-blue'}
        />
        <KpiTile
          label="Missing Pricing Rules"
          value={missingCoverageCount.toString()}
          meta={missingCoverageCount === 0 ? 'All programs priced' : 'Requires fee plan setup'}
          icon={<AlertCircle className="size-5 text-amber-600" />}
          iconClass={missingCoverageCount === 0 ? 'ic-emerald' : 'ic-amber'}
        />
      </div>

      {/* Missing Configurations Alert */}
      {missingCoverageCount > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-900 dark:text-amber-200">
              <strong>{missingCoverageCount} branch & program combination(s)</strong> lack an active fee structure. Invoices cannot be issued for newly enrolled students until configured.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('COVERAGE')}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 transition-colors"
          >
            Inspect Missing Programs
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-5">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Fee Structures Table ({filteredStructures.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('COVERAGE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'COVERAGE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Coverage Matrix ({coveragePercent}%)
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => openCreateWizard()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Create Fee Structure</span>
            </button>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50/70 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="size-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search structure, fee head..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>

          {/* Program Filter */}
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Programs ({programs.length})</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Academic Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Academic Years</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(Current)' : ''}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          {/* Billing Frequency Filter */}
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Frequencies</option>
            <option value="ONE_TIME">One Time</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="HALF_YEARLY">Half Yearly</option>
            <option value="ANNUALLY">Annually</option>
          </select>

          {(searchTerm || branchFilter !== 'ALL' || programFilter !== 'ALL' || yearFilter !== 'ALL' || statusFilter !== 'ALL' || frequencyFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setBranchFilter('ALL')
                setProgramFilter('ALL')
                setYearFilter('ALL')
                setStatusFilter('ALL')
                setFrequencyFilter('ALL')
              }}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold px-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* VIEW 1: STRUCTURES TABLE */}
        {viewMode === 'TABLE' && (
          <div>
            {!filteredStructures.length ? (
              <EmptyState
                icon={<Layers className="size-8 text-indigo-500" />}
                title="No Fee Structures Found"
                message="No fee structures match the selected filter criteria. Create your first fee structure to define tuition, admission fees, and deposit rules."
                action={
                  <button
                    type="button"
                    onClick={() => openCreateWizard()}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 shadow-xs"
                  >
                    + Create Fee Structure
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto w-full min-w-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full min-w-[950px] text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="p-3.5">Structure Name</th>
                      <th className="p-3.5">Academic Year</th>
                      <th className="p-3.5">Campus Branch</th>
                      <th className="p-3.5">Program</th>
                      <th className="p-3.5">Billing Frequency</th>
                      <th className="p-3.5 text-right">Annual Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Last Updated</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredStructures.map((st) => {
                      const totalCents = st.items.reduce((s, i) => s + (i.amountCents || 0), 0)
                      const isMonthly = st.items.some((i) => i.frequency === 'MONTHLY')
                      const isQuarterly = st.items.some((i) => i.frequency === 'QUARTERLY')
                      const isAnnual = st.items.every((i) => i.frequency === 'ANNUALLY' || i.frequency === 'ONE_TIME')

                      const displayFreq = isMonthly ? 'Monthly' : isQuarterly ? 'Quarterly' : isAnnual ? 'Annual' : 'Term-wise'

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                                <IndianRupee className="size-3.5" />
                              </div>
                              <div>
                                <span className="block">{st.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {st.items.length} Fee Heads {st._count?.schedules ? `• ${st._count.schedules} Invoiced` : ''}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                            {st.academicSession?.name || 'AY 2026-27'}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400">
                            {branches.find((b) => b.id === st.branchId)?.name || 'All Campuses'}
                          </td>
                          <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {st.program?.name || 'All Programs'}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {displayFreq}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {inr(totalCents)}
                          </td>
                          <td className="p-3.5">
                            <StatusBadge status={st.status} />
                          </td>
                          <td className="p-3.5 text-slate-500 dark:text-slate-400">
                            {fmtDate(st.updatedAt)}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setViewingStructure(st)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1"
                                title="View Complete Breakdown"
                              >
                                <Eye className="size-3" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditWizard(st)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
                                title="Edit Fee Plan"
                              >
                                <Edit3 className="size-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicate(st)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                title="Duplicate Structure"
                              >
                                <Copy className="size-3.5" />
                              </button>

                              {st.status !== 'ACTIVE' ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmModal({ open: true, action: 'ACTIVATE', structure: st })}
                                  className="px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                                  title="Activate this fee structure"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmModal({ open: true, action: 'DEACTIVATE', structure: st })}
                                  className="px-2 py-1 text-xs text-amber-600 hover:text-amber-700"
                                  title="Deactivate this fee structure"
                                >
                                  Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: COVERAGE MATRIX */}
        {viewMode === 'COVERAGE' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Institutional Fee Pricing Coverage: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{coveragePercent}% Complete</strong>
              </span>
              <span className="text-slate-500">
                {configuredCombinations} active structures across {totalCombinations} campus program mappings
              </span>
            </div>

            <div className="overflow-x-auto w-full min-w-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full min-w-[850px] text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="p-3.5">Campus Branch</th>
                    <th className="p-3.5">Academic Program</th>
                    <th className="p-3.5">Active Fee Structure</th>
                    <th className="p-3.5 text-right">Annual Rate (₹)</th>
                    <th className="p-3.5">Pricing Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {coverageMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {row.branch.name}
                      </td>
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {row.program.name} ({row.program.code || row.program.programType})
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {row.activeStructure ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{row.activeStructure.name}</span>
                        ) : row.draftStructure ? (
                          <span className="text-slate-500 italic">{row.draftStructure.name} (Draft)</span>
                        ) : (
                          <span className="text-rose-500 italic">No structure mapped</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {row.activeStructure
                          ? inr(row.activeStructure.items.reduce((s, i) => s + (i.amountCents || 0), 0))
                          : '—'}
                      </td>
                      <td className="p-3.5">
                        {row.status === 'CONFIGURED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            CONFIGURED
                          </span>
                        ) : row.status === 'DRAFT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                            DRAFT PENDING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            MISSING PRICING
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {row.status === 'MISSING' ? (
                          <button
                            type="button"
                            onClick={() => openCreateWizard(row.branch.id, row.program.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                          >
                            Configure
                          </button>
                        ) : row.activeStructure ? (
                          <button
                            type="button"
                            onClick={() => setViewingStructure(row.activeStructure)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditWizard(row.draftStructure!)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            Activate Draft
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4-SECTION GUIDED CREATE & EDIT WIZARD */}
      {wizardOpen && (
        <Modal
          title={editingStructureId ? `Edit Fee Structure — ${sectionA.name}` : 'Create New Fee Structure'}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
        >
          <div className="space-y-5 p-1 max-h-[85vh] overflow-y-auto">
            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
              {[
                { step: 1, label: 'A. Basic Info' },
                { step: 2, label: 'B. Fee Heads' },
                { step: 3, label: 'C. Installments' },
                { step: 4, label: 'D. Review & Save' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setWizardStep(s.step as any)}
                  className={`py-1.5 px-2 rounded-lg font-semibold text-center transition-all ${
                    wizardStep === s.step
                      ? 'bg-indigo-600 text-white'
                      : wizardStep > s.step
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* SECTION A: BASIC INFORMATION */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Structure Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionA.name}
                    onChange={(e) => setSectionA({ ...sectionA, name: e.target.value })}
                    placeholder="e.g. Playgroup Annual Fee Structure 2026-27"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Structure Code (Unique)
                    </label>
                    <input
                      type="text"
                      value={sectionA.code}
                      onChange={(e) => setSectionA({ ...sectionA, code: e.target.value })}
                      placeholder="e.g. FS-PG-2026"
                      className="w-full font-mono text-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Academic Year *
                    </label>
                    <select
                      value={sectionA.academicSessionId}
                      onChange={(e) => setSectionA({ ...sectionA, academicSessionId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Campus Branch *
                    </label>
                    <select
                      value={sectionA.branchId}
                      onChange={(e) => setSectionA({ ...sectionA, branchId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Branches / Main Campus</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Target Program *
                    </label>
                    <select
                      value={sectionA.programId}
                      onChange={(e) => setSectionA({ ...sectionA, programId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableProgramsForBranch.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code || p.programType})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Description & Schedule Notes
                  </label>
                  <textarea
                    rows={2}
                    value={sectionA.description}
                    onChange={(e) => setSectionA({ ...sectionA, description: e.target.value })}
                    placeholder="e.g. Standard morning shift tuition and welcome kit charges."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Initial Activation State
                  </label>
                  <select
                    value={sectionA.status}
                    onChange={(e) => setSectionA({ ...sectionA, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE (Ready for immediate classroom student invoicing)</option>
                    <option value="DRAFT">DRAFT (Save for review, do not generate invoices yet)</option>
                  </select>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      if (!sectionA.name.trim() || !sectionA.programId) {
                        toast.error('Required Fields', 'Please complete Structure Name and Target Program')
                        return
                      }
                      setWizardStep(2)
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-700"
                  >
                    <span>Proceed to Fee Heads</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SECTION B: FEE HEADS MASTER MAPPING */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Configured Fee Heads</h4>
                    <p className="text-[11px] text-slate-500">Pick from existing FeeHead master or add custom items</p>
                  </div>
                  <button
                    type="button"
                    onClick={addFeeItem}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Fee Head</span>
                  </button>
                </div>

                {hasDuplicateFeeHeads && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Warning: Duplicate fee head names detected. Please ensure all line items are unique.</span>
                  </div>
                )}

                <div className="space-y-3">
                  {sectionBItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Fee Head Master
                          </label>
                          <select
                            value={item.feeHeadId || ''}
                            onChange={(e) => {
                              const selectedId = e.target.value
                              const found = feeHeads.find((h) => h.id === selectedId)
                              setSectionBItems((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                        ...it,
                                        feeHeadId: selectedId || null,
                                        name: found ? found.name : it.name,
                                        feeType: found?.category === 'OTHER' && found?.name.toLowerCase().includes('deposit') ? 'REFUNDABLE_DEPOSIT' : it.feeType,
                                        isRefundable: found?.name.toLowerCase().includes('deposit') || it.isRefundable,
                                      }
                                    : it
                                )
                              )
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            <option value="">-- Choose Master Fee Head --</option>
                            {feeHeads.map((h) => (
                              <option key={h.id} value={h.id}>{h.name} [{h.category}]</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Custom Line Item Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => {
                              const val = e.target.value
                              setSectionBItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, name: val } : it))
                              )
                            }}
                            placeholder="e.g. Tuition Fee"
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Amount (₹) *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.amountRupees}
                            onChange={(e) => {
                              const val = e.target.value
                              setSectionBItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, amountRupees: val } : it))
                              )
                            }}
                            className="w-full font-mono font-bold px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Type</label>
                          <select
                            value={item.feeType}
                            onChange={(e) => {
                              const ft = e.target.value as any
                              setSectionBItems((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, feeType: ft, isRefundable: ft === 'REFUNDABLE_DEPOSIT' } : it
                                )
                              )
                            }}
                            className="w-full px-2 py-1 text-xs border rounded-lg bg-white dark:bg-slate-900"
                          >
                            <option value="REGULAR">Regular Fee</option>
                            <option value="REFUNDABLE_DEPOSIT">Refundable Deposit</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Frequency</label>
                          <select
                            value={item.frequency}
                            onChange={(e) => {
                              const fr = e.target.value as any
                              setSectionBItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, frequency: fr } : it))
                              )
                            }}
                            className="w-full px-2 py-1 text-xs border rounded-lg bg-white dark:bg-slate-900"
                          >
                            <option value="ONE_TIME">One Time</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="HALF_YEARLY">Half Yearly</option>
                            <option value="ANNUALLY">Annually</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Due Rule</label>
                          <input
                            type="text"
                            value={item.dueRule}
                            onChange={(e) => {
                              const val = e.target.value
                              setSectionBItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, dueRule: val } : it))
                              )
                            }}
                            placeholder="e.g. 10th of month"
                            className="w-full px-2 py-1 text-xs border rounded-lg bg-white dark:bg-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={item.lateFeeApplicable}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSectionBItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, lateFeeApplicable: checked } : it))
                                )
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span>Late Penalty</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => removeFeeItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove head"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto Calculated Summary Strip */}
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Annual Fee</span>
                    <strong className="text-base font-mono font-bold text-slate-900 dark:text-white">
                      ₹{feeTotals.annualTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">One-time Fees</span>
                    <strong className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{feeTotals.oneTimeTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Recurring Fees</span>
                    <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{feeTotals.recurringTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Optional Fees</span>
                    <strong className="text-sm font-mono text-slate-600 dark:text-slate-300">
                      ₹{feeTotals.optionalTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    ← Back to Basic Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    disabled={hasDuplicateFeeHeads}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <span>Configure Billing Frequency</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SECTION C: BILLING FREQUENCY & INSTALLMENTS */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Select Standard Billing Frequency for Invoicing
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ANNUAL', label: 'Annual (Single)', sub: '1 installment for entire year' },
                      { id: 'TERM', label: 'Term-wise (3 Terms)', sub: '3 equal terms per session' },
                      { id: 'QUARTERLY', label: 'Quarterly (4 Quarters)', sub: '4 quarters across AY' },
                      { id: 'MONTHLY', label: 'Monthly (12 Months)', sub: 'Billed every 10th of month' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSectionCFrequency(f.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          sectionCFrequency === f.id
                            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-bold text-xs">{f.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{f.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Installments Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Generated Installments Schedule Breakdown ({installmentsPreview.length} Installments)
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="p-2.5">Installment Name</th>
                          <th className="p-2.5">Allocation (%)</th>
                          <th className="p-2.5">Due Date Policy</th>
                          <th className="p-2.5 text-right">Calculated Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {installmentsPreview.map((inst, i) => (
                          <tr key={i}>
                            <td className="p-2.5 font-medium">{inst.name}</td>
                            <td className="p-2.5 font-mono">{inst.percentage}%</td>
                            <td className="p-2.5 text-slate-500">{inst.dueDate}</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              ₹{inst.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right">Sum of Installments:</td>
                          <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{installmentsPreview.reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 border rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    ← Back to Fee Heads
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-700"
                  >
                    <span>Proceed to Review</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SECTION D: REVIEW AND SAVE */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sectionA.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">Code: {sectionA.code || 'Auto-generated'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      sectionA.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {sectionA.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>Branch: <strong>{branches.find((b) => b.id === sectionA.branchId)?.name || 'All Branches'}</strong></div>
                    <div>Program: <strong>{programs.find((p) => p.id === sectionA.programId)?.name || 'Selected Program'}</strong></div>
                    <div>Academic Year: <strong>{academicYears.find((y) => y.id === sectionA.academicSessionId)?.name || 'AY'}</strong></div>
                    <div>Frequency: <strong>{sectionCFrequency}</strong></div>
                    <div>Fee Heads: <strong>{sectionBItems.length} heads configured</strong></div>
                    <div>Total Annual Rate: <strong className="text-emerald-600">₹{feeTotals.annualTotal.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-2.5">Fee Head</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {sectionBItems.map((item, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold">{item.name}</td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              item.feeType === 'REFUNDABLE_DEPOSIT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.feeType === 'REFUNDABLE_DEPOSIT' ? 'Deposit' : 'Regular'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500">{item.frequency}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            ₹{Number(item.amountRupees).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    disabled={saving}
                    className="px-4 py-2 border rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    ← Back to Installments
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveWizard('DRAFT')}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveWizard('ACTIVE')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>{saving ? 'Saving...' : 'Save & Activate'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingStructure && (
        <Modal
          title={`Structure Details — ${viewingStructure.name}`}
          open={Boolean(viewingStructure)}
          onClose={() => setViewingStructure(null)}
        >
          <div className="space-y-4 p-1 max-h-[85vh] overflow-y-auto text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{viewingStructure.name}</span>
                <StatusBadge status={viewingStructure.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>Program: <strong>{viewingStructure.program?.name || 'All Programs'}</strong></div>
                <div>Campus: <strong>{branches.find((b) => b.id === viewingStructure.branchId)?.name || 'All Campuses'}</strong></div>
                <div>Academic Session: <strong>{viewingStructure.academicSession?.name || 'Current AY'}</strong></div>
                <div>Created: <strong>{fmtDate(viewingStructure.createdAt)}</strong></div>
              </div>
              {viewingStructure.description && (
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  {viewingStructure.description}
                </p>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                  <tr>
                    <th className="p-2.5">Fee Item</th>
                    <th className="p-2.5">Frequency</th>
                    <th className="p-2.5">Due Rule</th>
                    <th className="p-2.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {viewingStructure.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-bold">
                        {it.name}
                        {it.isRefundable && (
                          <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800">
                            Refundable
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-500 font-mono text-[11px]">{it.frequency}</td>
                      <td className="p-2.5 text-slate-500">{it.dueRule || 'Standard'}</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {inr(it.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right">Total Annual Fee:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {inr(viewingStructure.items.reduce((s, i) => s + (i.amountCents || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewingStructure(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = viewingStructure
                  setViewingStructure(null)
                  openEditWizard(s)
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-1.5"
              >
                <Edit3 className="size-3.5" />
                <span>Edit Structure</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL FOR ACTIVATE / DEACTIVATE */}
      {confirmModal.open && confirmModal.structure && (
        <Modal
          title={confirmModal.action === 'ACTIVATE' ? 'Activate Fee Structure?' : 'Deactivate Fee Structure?'}
          open={confirmModal.open}
          onClose={() => setConfirmModal({ open: false, action: 'ACTIVATE', structure: null })}
        >
          <div className="space-y-4 p-1 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              {confirmModal.action === 'ACTIVATE' ? (
                <>
                  Are you sure you want to activate <strong>"{confirmModal.structure.name}"</strong>? Activating will make this structure authoritative for future student enrollments in this program. Existing historical invoices will not be altered.
                </>
              ) : (
                <>
                  Are you sure you want to deactivate <strong>"{confirmModal.structure.name}"</strong>? Future student invoicing for this program will be paused until an active structure is selected.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, action: 'ACTIVATE', structure: null })}
                className="px-4 py-2 rounded-lg border text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className={`px-4 py-2 text-white font-semibold rounded-lg shadow-sm ${
                  confirmModal.action === 'ACTIVATE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmModal.action === 'ACTIVATE' ? 'Confirm Activation' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
