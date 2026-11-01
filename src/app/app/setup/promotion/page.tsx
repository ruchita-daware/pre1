'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, ArrowRight, CheckCircle2, AlertTriangle, RotateCw, Save,
  Users, Building2, Calendar, ShieldCheck, ChevronRight, HelpCircle,
  Filter, Search, UserCheck, ArrowUpRight, Check, X, RefreshCw, Award, Info
} from 'lucide-react'
import { PageHead, Skeleton, EmptyState, StatusBadge, SetupScopeBadge } from '@/components/preone'
import { Modal } from '@/components/preone/Modal'
import { useToast } from '@/components/preone/Toast'
import { SmartDependencyResolver } from '@/components/setup/SmartDependencyResolver'
import {
  DEFAULT_PROMOTION_CONFIG,
  type PromotionConfig,
  type CandidateEvaluation,
  type ProgressionStep,
} from '@/lib/promotion/types'

interface AcademicSessionRow {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'PLANNED' | 'ACTIVE' | 'CLOSING' | 'CLOSED' | 'ARCHIVED'
  isCurrent: boolean
}

interface ClassroomRow {
  id: string
  name: string
  code: string
  programType: string
  capacity: number
  branchId: string
  academicSessionId: string
  primaryTeacher?: { fullName: string } | null
}

export default function PromotionHubPage() {
  const router = useRouter()
  const toast = useToast()

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'mapping' | 'candidates' | 'wizard'>('overview')

  // Setup Step Status
  const [stepStatus, setStepStatus] = useState<string>('PENDING')
  const [completingStep, setCompletingStep] = useState(false)

  // Core Data
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<AcademicSessionRow[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([])
  const [config, setConfig] = useState<PromotionConfig>(DEFAULT_PROMOTION_CONFIG)
  const [savingConfig, setSavingConfig] = useState(false)

  // Transition Scope
  const [sourceSessionId, setSourceSessionId] = useState<string>('')
  const [targetSessionId, setTargetSessionId] = useState<string>('')

  // Preview Data
  const [previewLoading, setPreviewLoading] = useState(false)
  const [candidates, setCandidates] = useState<CandidateEvaluation[]>([])
  const [previewSummary, setPreviewSummary] = useState<{
    totalEligible: number
    readyToPromote: number
    continueCurrentLevel: number
    graduating: number
    specialReview: number
  } | null>(null)

  // Candidate Decisions Override Map: studentId -> { outcome, targetClassroomId, notes }
  const [decisionOverrides, setDecisionOverrides] = useState<
    Record<string, { outcome: string; targetClassroomId?: string; notes?: string }>
  >({})

  // Filtering on Candidates tab
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('ALL')
  const [filterClassroom, setFilterClassroom] = useState('ALL')

  // Batch Execution Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [executingBatch, setExecutingBatch] = useState(false)
  const [batchResult, setBatchResult] = useState<any | null>(null)

  // 1. Initial Load: Academic Sessions & Config
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [sessionsRes, configRes, statusRes, classRes] = await Promise.all([
        fetch('/api/v1/academic-years').then((r) => r.json()),
        fetch('/api/v1/setup/config/PROMOTION').then((r) => r.json()),
        fetch('/api/v1/setup/status').then((r) => r.json()),
        fetch('/api/v1/classrooms').then((r) => r.json()),
      ])

      if (sessionsRes.success && Array.isArray(sessionsRes.data)) {
        const sortedSessions = sessionsRes.data.sort(
          (a: AcademicSessionRow, b: AcademicSessionRow) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )
        setSessions(sortedSessions)

        // Select default current or active session
        const current = sortedSessions.find((s: AcademicSessionRow) => s.isCurrent || s.status === 'ACTIVE')
        if (current) {
          setSourceSessionId(current.id)
          // Find next planned or upcoming session
          const upcoming = sortedSessions.find(
            (s: AcademicSessionRow) => s.id !== current.id && new Date(s.startDate) >= new Date(current.startDate)
          )
          if (upcoming) setTargetSessionId(upcoming.id)
        } else if (sortedSessions.length > 0) {
          setSourceSessionId(sortedSessions[0].id)
          if (sortedSessions[1]) setTargetSessionId(sortedSessions[1].id)
        }
      }

      if (configRes.success && configRes.data) {
        setConfig((prev) => ({ ...prev, ...(configRes.data as PromotionConfig) }))
      }

      if (statusRes.success && Array.isArray(statusRes.data?.steps)) {
        const promoStep = statusRes.data.steps.find((s: any) => s.key === 'promotion')
        if (promoStep) setStepStatus(promoStep.status)
      }

      if (classRes.success && Array.isArray(classRes.data)) {
        setClassrooms(classRes.data)
      }
    } catch (err: any) {
      toast.error('Failed to load promotion data', err.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // 2. Fetch Live Preview when Sessions Change
  const loadPreview = useCallback(async () => {
    if (!sourceSessionId || !targetSessionId || sourceSessionId === targetSessionId) return
    setPreviewLoading(true)
    try {
      const res = await fetch(
        `/api/v1/promotions/preview?sourceSessionId=${sourceSessionId}&targetSessionId=${targetSessionId}`
      )
      const json = await res.json()
      if (json.success && json.data) {
        setCandidates(json.data.candidates || [])
        setPreviewSummary(json.data.summary || null)

        // Initialize default decisions
        const initialOverrides: Record<string, { outcome: string; targetClassroomId?: string; notes?: string }> = {}
        for (const c of json.data.candidates as CandidateEvaluation[]) {
          initialOverrides[c.studentId] = {
            outcome: c.suggestedOutcome,
            targetClassroomId: c.proposedClassroomId || undefined,
            notes: c.notes || '',
          }
        }
        setDecisionOverrides(initialOverrides)
      } else {
        toast.warning('Preview Notice', json.error?.message || 'No candidates found for selected sessions.')
        setCandidates([])
        setPreviewSummary(null)
      }
    } catch (err: any) {
      toast.error('Failed to load candidate preview', err.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [sourceSessionId, targetSessionId, toast])

  useEffect(() => {
    if (sourceSessionId && targetSessionId && sourceSessionId !== targetSessionId) {
      loadPreview()
    }
  }, [sourceSessionId, targetSessionId, loadPreview])

  // 3. Save Policy Configuration
  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const res = await fetch('/api/v1/setup/config/PROMOTION', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Promotion policies saved', 'New progression and cut-off rules are now active.')
        // Reload preview with new rules
        loadPreview()
      } else {
        toast.error('Failed to save policies', json.error?.message)
      }
    } catch (err: any) {
      toast.error('Save failed', err.message)
    } finally {
      setSavingConfig(false)
    }
  }

  // 4. Mark Setup Step Complete
  const handleCompleteSetupStep = async () => {
    setCompletingStep(true)
    try {
      await handleSaveConfig()
      const res = await fetch('/api/v1/setup/steps/promotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      const json = await res.json()
      if (json.success) {
        setStepStatus('COMPLETE')
        toast.success('Step Complete', 'Promotion business rules verified and recorded.')
      } else {
        toast.error('Cannot complete yet', json.error?.message)
      }
    } catch (err: any) {
      toast.error('Failed to complete step', err.message)
    } finally {
      setCompletingStep(false)
    }
  }

  // 5. Execute Batch Promotion
  const handleExecuteBatch = async () => {
    if (!sourceSessionId || !targetSessionId) return
    setExecutingBatch(true)
    try {
      const decisions = candidates.map((c) => {
        const d = decisionOverrides[c.studentId] || { outcome: c.suggestedOutcome }
        return {
          studentId: c.studentId,
          outcome: d.outcome as any,
          targetClassroomId: d.targetClassroomId || c.proposedClassroomId || undefined,
          notes: d.notes || c.notes,
        }
      })

      const res = await fetch('/api/v1/promotions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId,
          targetSessionId,
          decisions,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setBatchResult(json.data)
        toast.success('Batch Promotion Executed', `Processed ${json.data.processedCount} students successfully.`)
        loadPreview()
      } else {
        toast.error('Batch Execution Failed', json.error?.message)
      }
    } catch (err: any) {
      toast.error('Execution Error', err.message)
    } finally {
      setExecutingBatch(false)
      setConfirmModalOpen(false)
    }
  }

  // Target classrooms for current target session
  const targetSessionClassrooms = useMemo(() => {
    return classrooms.filter((c) => c.academicSessionId === targetSessionId && c.isActive)
  }, [classrooms, targetSessionId])

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const decision = decisionOverrides[c.studentId]?.outcome || c.suggestedOutcome
      if (filterOutcome !== 'ALL' && decision !== filterOutcome) return false
      if (filterClassroom !== 'ALL' && c.currentClassroomId !== filterClassroom) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = c.name.toLowerCase().includes(q)
        const matchAdm = c.admissionNo.toLowerCase().includes(q)
        if (!matchName && !matchAdm) return false
      }
      return true
    })
  }, [candidates, decisionOverrides, filterOutcome, filterClassroom, searchQuery])

  if (loading) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <PageHead title="Promotion & Academic Transition" sub="Loading promotion engine..." />
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <Skeleton h={300} />
        </div>
      </div>
    )
  }

  return (
    <div className="roles-page-container">
      {/* ── HEADER ── */}
      <PageHead
        breadcrumbs={[
          { label: 'Home', href: '/app' },
          { label: 'Setup', href: '/app/setup' },
          { label: 'Promotion' },
        ]}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>Promotion & Academic Transition</span>
            <SetupScopeBadge scope="BRANCH" size="md" />
            <span className={`badge ${stepStatus === 'COMPLETE' ? 'b-success' : 'b-info'}`}>
              {stepStatus}
            </span>
          </div>
        }
        sub="Preschool developmental progression, age cut-off eligibility, classroom capacity balancing, and year-end batch transition."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a className="btn btn-ghost" href="/app/setup">
              Back to Setup
            </a>
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadPreview}
              disabled={previewLoading}
              title="Refresh candidate preview"
            >
              <RotateCw size={14} className={previewLoading ? 'animate-spin' : ''} />
              <span>{previewLoading ? 'Recalculating…' : 'Refresh'}</span>
            </button>
            {stepStatus !== 'COMPLETE' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCompleteSetupStep}
                disabled={completingStep || savingConfig}
              >
                <CheckCircle2 size={15} />
                <span>{completingStep ? 'Saving…' : 'Save & Mark Complete'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* ── SMART DEPENDENCY RESOLVER ── */}
      <SmartDependencyResolver
        stepKey="promotion"
        stepLabel="Promotion & Academic Transition"
        onUnblocked={() => {
          loadInitialData()
        }}
      />

      {/* ── KPI METRIC CARDS ── */}
      <div className="roles-summary-grid" style={{ marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="card-sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>
            Total Cohort in Scope
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: 'var(--text-main)' }}>
            {previewSummary?.totalEligible ?? '—'}
          </div>
          <div className="helper" style={{ fontSize: 11.5, marginTop: 2 }}>
            Active students in source session
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>
            Ready for Promotion
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#16a34a' }}>
            {previewSummary?.readyToPromote ?? '—'}
          </div>
          <div className="helper" style={{ fontSize: 11.5, marginTop: 2 }}>
            Progression to next developmental grade
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>
            Continue Current Level
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#0284c7' }}>
            {previewSummary?.continueCurrentLevel ?? '—'}
          </div>
          <div className="helper" style={{ fontSize: 11.5, marginTop: 2 }}>
            Consolidating milestones (non-punitive)
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-sub" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>
            Graduation / Exit
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#9333ea' }}>
            {previewSummary?.graduating ?? '—'}
          </div>
          <div className="helper" style={{ fontSize: 11.5, marginTop: 2 }}>
            Sr. KG completion (preschool alumni)
          </div>
        </div>
      </div>

      {/* ── SESSION SELECTION CONTROL BAR ── */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--surface-muted)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Transition Context:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="helper" style={{ fontSize: 12 }}>
            Source Session:
          </span>
          <select
            className="select"
            style={{ height: 32, fontSize: 12.5 }}
            value={sourceSessionId}
            onChange={(e) => setSourceSessionId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isCurrent ? '(Current Active)' : `(${s.status})`}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight size={16} style={{ color: 'var(--foreground-muted)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="helper" style={{ fontSize: 12 }}>
            Target Session:
          </span>
          <select
            className="select"
            style={{ height: 32, fontSize: 12.5 }}
            value={targetSessionId}
            onChange={(e) => setTargetSessionId(e.target.value)}
          >
            {sessions
              .filter((s) => s.id !== sourceSessionId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
          </select>
        </div>

        {sourceSessionId === targetSessionId && (
          <span className="badge b-danger" style={{ fontSize: 11.5 }}>
            Source and Target session must be different
          </span>
        )}
      </div>

      {/* ── TAB STRIP ── */}
      <div className="roles-tab-strip" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`roles-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Diagnostics
        </button>
        <button
          type="button"
          className={`roles-tab-item ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Progression Rules & Policies
        </button>
        <button
          type="button"
          className={`roles-tab-item ${activeTab === 'mapping' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapping')}
        >
          Section Mapping Matrix
        </button>
        <button
          type="button"
          className={`roles-tab-item ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          Candidate Review ({candidates.length})
        </button>
        <button
          type="button"
          className={`roles-tab-item ${activeTab === 'wizard' ? 'active' : ''}`}
          onClick={() => setActiveTab('wizard')}
        >
          Transition Wizard & Batch Run
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW & DIAGNOSTICS ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>ECE Promotion Principles</h3>
            <p className="card-sub" style={{ fontSize: 13, marginBottom: 14 }}>
              PreOne implements Early Childhood Education developmental progression rather than numerical pass/fail examinations:
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, margin: 0 }}>
              <li>
                <strong>No Failure Stigma:</strong> Children needing more time continue at the same developmental stage (<code>CONTINUE_CURRENT_LEVEL</code>) without academic penalty.
              </li>
              <li>
                <strong>Developmental Milestones:</strong> Evaluates speech, fine/gross motor skills, social adaptability, and independence.
              </li>
              <li>
                <strong>Age Cut-off Reference:</strong> Calculates exact age as of configured cut-off date (e.g. July 31).
              </li>
              <li>
                <strong>Family Continuity:</strong> Parent logins, portal history, and guardian pickup PINs remain continuous across sessions.
              </li>
            </ul>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Operational Readiness</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Teacher Sign-Off Requirement:</span>
                <span className={`badge ${config.requireTeacherSignOff ? 'b-primary' : 'b-neutral'}`}>
                  {config.requireTeacherSignOff ? 'Mandatory' : 'Optional'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Age Cut-off Reference Date:</span>
                <span className="badge b-info">
                  Month {config.cutOffMonth}, Day {config.cutOffDay}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Capacity Guard Strategy:</span>
                <span className="badge b-neutral">{config.capacityGuardStrategy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Unpaid Fee Policy:</span>
                <span className="badge b-neutral">{config.financialPolicy}</span>
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('rules')}>
                Configure Business Policies →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PROGRESSION RULES & POLICIES ── */}
      {activeTab === 'rules' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Preschool Progression & Policy Configuration</h3>
              <p className="card-sub" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Customize the progression ladder, cut-off dates, teacher sign-off mandates, and capacity enforcement.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
              <Save size={14} /> {savingConfig ? 'Saving…' : 'Save Policies'}
            </button>
          </div>

          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Progression Ladder Note</label>
              <input
                className="input"
                value={config.progressionMappingNote || ''}
                onChange={(e) => setConfig({ ...config, progressionMappingNote: e.target.value })}
                placeholder="e.g. Playgroup → Nursery → LKG → UKG → Graduated"
              />
              <div className="helper">Visual summary of early childhood education progression path.</div>
            </div>

            <div className="field">
              <label>Age Cut-off Month</label>
              <select
                className="select"
                value={config.cutOffMonth}
                onChange={(e) => setConfig({ ...config, cutOffMonth: Number(e.target.value) })}
              >
                <option value={3}>March (31)</option>
                <option value={5}>May (31)</option>
                <option value={6}>June (30)</option>
                <option value={7}>July (31) — Standard Academic</option>
                <option value={8}>August (31)</option>
                <option value={9}>September (30)</option>
                <option value={12}>December (31)</option>
              </select>
            </div>

            <div className="field">
              <label>Age Cut-off Day</label>
              <input
                type="number"
                min={1}
                max={31}
                className="input"
                value={config.cutOffDay}
                onChange={(e) => setConfig({ ...config, cutOffDay: Number(e.target.value) })}
              />
            </div>

            <div className="field">
              <label>Classroom Capacity Strategy</label>
              <select
                className="select"
                value={config.capacityGuardStrategy}
                onChange={(e) => setConfig({ ...config, capacityGuardStrategy: e.target.value as any })}
              >
                <option value="WAITLIST_IF_FULL">WAITLIST_IF_FULL (Place overflow in queue)</option>
                <option value="STRICT_REJECT">STRICT_REJECT (Reject over-capacity allocations)</option>
                <option value="AUTO_SECTION_BALANCE">AUTO_SECTION_BALANCE (Distribute across sections)</option>
              </select>
            </div>

            <div className="field">
              <label>Unpaid Balance Strategy</label>
              <select
                className="select"
                value={config.financialPolicy}
                onChange={(e) => setConfig({ ...config, financialPolicy: e.target.value as any })}
              >
                <option value="ROLLOVER_DUES">ROLLOVER_DUES (Carry forward arrears without erasing debt)</option>
                <option value="STRICT_HOLD">STRICT_HOLD (Hold enrollment until accounts clearance)</option>
                <option value="CONDITIONAL_PROMOTION">CONDITIONAL_PROMOTION (Provisional 15-day grace)</option>
              </select>
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.requireTeacherSignOff}
                  onChange={(e) => setConfig({ ...config, requireTeacherSignOff: e.target.checked })}
                />
                Require Lead Teacher Developmental Sign-Off before final promotion confirmation
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SECTION MAPPING MATRIX ── */}
      {activeTab === 'mapping' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Classroom & Section Mapping Matrix</h3>
          <p className="card-sub" style={{ margin: '0 0 16px', fontSize: 13 }}>
            Review capacity utilization of upcoming classrooms in <strong>{sessions.find((s) => s.id === targetSessionId)?.name || 'Target Session'}</strong>.
          </p>

          <div className="dtable-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Target Classroom</th>
                  <th>Program Type</th>
                  <th>Lead Teacher</th>
                  <th>Capacity</th>
                  <th>Target Enrolled</th>
                  <th>Incoming Eligible</th>
                  <th>Projected Utilization</th>
                </tr>
              </thead>
              <tbody>
                {targetSessionClassrooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--foreground-muted)' }}>
                      No classrooms found in target academic session. Configure classrooms in Setup → Classrooms.
                    </td>
                  </tr>
                ) : (
                  targetSessionClassrooms.map((c) => {
                    const incomingCount = candidates.filter(
                      (cand) => (decisionOverrides[cand.studentId]?.targetClassroomId || cand.proposedClassroomId) === c.id
                    ).length
                    const totalProjected = (c as any)._count?.students || 0 + incomingCount
                    const isOver = totalProjected > c.capacity
                    return (
                      <tr key={c.id}>
                        <td>
                          <span className="cell-strong">{c.name}</span>
                          <span className="cell-sub">{c.code}</span>
                        </td>
                        <td>
                          <span className="badge b-info">{c.programType}</span>
                        </td>
                        <td>{c.primaryTeacher?.fullName || <span className="badge b-warning">Unassigned</span>}</td>
                        <td>{c.capacity} seats</td>
                        <td>{(c as any)._count?.students || 0}</td>
                        <td>
                          <span className="cell-strong" style={{ color: 'var(--color-primary)' }}>
                            +{incomingCount}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 80,
                                height: 8,
                                background: 'var(--border-subtle)',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, (totalProjected / c.capacity) * 100)}%`,
                                  height: '100%',
                                  background: isOver ? '#ef4444' : '#16a34a',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isOver ? '#ef4444' : 'inherit' }}>
                              {totalProjected} / {c.capacity}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: CANDIDATE REVIEW ── */}
      {activeTab === 'candidates' && (
        <div className="card" style={{ padding: 18 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginBottom: 14,
              flexWrap: 'wrap',
              background: 'var(--surface-muted)',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} style={{ color: 'var(--foreground-muted)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>Outcome:</span>
              <select
                className="select"
                style={{ height: 32, fontSize: 12.5 }}
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
              >
                <option value="ALL">All Outcomes ({candidates.length})</option>
                <option value="PROMOTED">PROMOTED</option>
                <option value="CONTINUE_CURRENT_LEVEL">CONTINUE_CURRENT_LEVEL</option>
                <option value="GRADUATED">GRADUATED</option>
                <option value="SPECIAL_REVIEW">SPECIAL_REVIEW</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ color: 'var(--foreground-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ height: 32, fontSize: 12.5 }}
                placeholder="Search students by name or admission number…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="dtable-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Current Section</th>
                  <th>Age (Target Cut-Off)</th>
                  <th>Teacher Sign-Off</th>
                  <th>Financial Status</th>
                  <th>Decision Outcome</th>
                  <th>Target Section</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--foreground-muted)' }}>
                      No matching student candidates.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => {
                    const currentDecision = decisionOverrides[c.studentId]?.outcome || c.suggestedOutcome
                    const currentTargetClass =
                      decisionOverrides[c.studentId]?.targetClassroomId || c.proposedClassroomId || ''

                    return (
                      <tr key={c.studentId}>
                        <td>
                          <span className="cell-strong">{c.name}</span>
                          <span className="cell-sub">{c.admissionNo}</span>
                        </td>
                        <td>
                          <span className="cell-strong">{c.currentClassroomName}</span>
                          <span className="cell-sub">{c.currentProgramType}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.ageDisplay}</span>
                            <span
                              className={`badge ${
                                c.ageEligibility === 'AGE_ELIGIBLE'
                                  ? 'b-success'
                                  : c.ageEligibility === 'AGE_BELOW_RECOMMENDED'
                                  ? 'b-warning'
                                  : 'b-neutral'
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {c.ageEligibility.replaceAll('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              c.teacherSignOff === 'RECOMMENDED_FOR_PROMOTION'
                                ? 'b-primary'
                                : c.teacherSignOff === 'RECOMMENDED_TO_CONTINUE'
                                ? 'b-info'
                                : 'b-warning'
                            }`}
                            style={{ fontSize: 11 }}
                          >
                            {c.teacherSignOff.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {c.hasOverdueBalance ? (
                            <span className="badge b-danger" title={`Dues: ₹${(c.outstandingDuesCents / 100).toFixed(2)}`}>
                              Arrears: ₹{(c.outstandingDuesCents / 100).toFixed(0)}
                            </span>
                          ) : (
                            <span className="badge b-success">Clear</span>
                          )}
                        </td>
                        <td>
                          <select
                            className="select"
                            style={{ height: 30, fontSize: 12, minWidth: 160 }}
                            value={currentDecision}
                            onChange={(e) => {
                              const val = e.target.value
                              setDecisionOverrides((prev) => ({
                                ...prev,
                                [c.studentId]: {
                                  ...prev[c.studentId],
                                  outcome: val,
                                },
                              }))
                            }}
                          >
                            <option value="PROMOTED">Promote to Next Grade</option>
                            <option value="CONTINUE_CURRENT_LEVEL">Continue Current Grade</option>
                            <option value="SPECIAL_REVIEW">Special Review (Hold)</option>
                            <option value="GRADUATED">Graduate (Exit ECE)</option>
                          </select>
                        </td>
                        <td>
                          {currentDecision === 'GRADUATED' ? (
                            <span className="badge b-purple">Alumni Exit</span>
                          ) : currentDecision === 'SPECIAL_REVIEW' ? (
                            <span className="badge b-warning">Pending Review</span>
                          ) : (
                            <select
                              className="select"
                              style={{ height: 30, fontSize: 12, minWidth: 160 }}
                              value={currentTargetClass}
                              onChange={(e) => {
                                const targetVal = e.target.value
                                setDecisionOverrides((prev) => ({
                                  ...prev,
                                  [c.studentId]: {
                                    ...prev[c.studentId],
                                    targetClassroomId: targetVal,
                                  },
                                }))
                              }}
                            >
                              <option value="">Select Section…</option>
                              {targetSessionClassrooms.map((tc) => (
                                <option key={tc.id} value={tc.id}>
                                  {tc.name} ({tc.programType})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: WIZARD & BATCH EXECUTION ── */}
      {activeTab === 'wizard' && (
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Year-End Batch Transition Execution</h3>
          <p className="card-sub" style={{ margin: '0 0 20px', fontSize: 13 }}>
            Atomically transitions student allocations from <strong>{sessions.find((s) => s.id === sourceSessionId)?.name}</strong> into <strong>{sessions.find((s) => s.id === targetSessionId)?.name}</strong>.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ padding: 14, background: 'var(--surface-muted)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Approved for Promotion</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#16a34a' }}>
                {Object.values(decisionOverrides).filter((d) => d.outcome === 'PROMOTED').length}
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--surface-muted)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Approved for Continuation</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#0284c7' }}>
                {Object.values(decisionOverrides).filter((d) => d.outcome === 'CONTINUE_CURRENT_LEVEL').length}
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--surface-muted)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Preschool Graduation</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#9333ea' }}>
                {Object.values(decisionOverrides).filter((d) => d.outcome === 'GRADUATED').length}
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--surface-muted)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Special Review Holds</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#eab308' }}>
                {Object.values(decisionOverrides).filter((d) => d.outcome === 'SPECIAL_REVIEW').length}
              </div>
            </div>
          </div>

          <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Atomic Execution Guarantees:</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Current session allocation is marked <code>COMPLETED</code>; historical records are never deleted.</li>
              <li>New active allocation is created in target classroom with seat reservation.</li>
              <li>Parent portal and student pointers immediately update to show the new academic year and teacher.</li>
              <li>All transitions are recorded in the institutional audit log with actor ID and timestamp.</li>
            </ul>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setConfirmModalOpen(true)}
            disabled={candidates.length === 0 || executingBatch}
          >
            <ShieldCheck size={16} /> Execute Batch Transition Now
          </button>

          {/* ── EXECUTION RESULTS REPORT ── */}
          {batchResult && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
              }}
            >
              <h4 style={{ margin: '0 0 8px', color: '#166534', fontSize: 15, fontWeight: 700 }}>
                Batch Execution Completed
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#15803d' }}>
                Successfully processed {batchResult.processedCount} students: {batchResult.promotedCount} promoted,{' '}
                {batchResult.continuedCount} continued at same grade, {batchResult.graduatedCount} graduated.
              </p>
              <div className="dtable-scroll">
                <table className="dtable" style={{ background: '#ffffff' }}>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Outcome</th>
                      <th>Status</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.results?.map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td><code>{r.studentId}</code></td>
                        <td><span className="badge b-primary">{r.outcome}</span></td>
                        <td><span className={`badge ${r.status === 'SUCCESS' ? 'b-success' : 'b-danger'}`}>{r.status}</span></td>
                        <td>{r.message || 'Transition complete'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmModalOpen && (
        <Modal
          title="Confirm Academic Year Transition"
          onClose={() => setConfirmModalOpen(false)}
          actions={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmModalOpen(false)} disabled={executingBatch}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleExecuteBatch} disabled={executingBatch}>
                {executingBatch ? 'Executing…' : 'Confirm & Transition Cohort'}
              </button>
            </div>
          }
        >
          <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0 }}>
              You are about to execute the academic transition for{' '}
              <strong>{candidates.length} students</strong> from{' '}
              <strong>{sessions.find((s) => s.id === sourceSessionId)?.name}</strong> to{' '}
              <strong>{sessions.find((s) => s.id === targetSessionId)?.name}</strong>.
            </p>
            <div style={{ padding: 12, background: 'var(--surface-muted)', borderRadius: 6 }}>
              <div>• Promoted: {Object.values(decisionOverrides).filter((d) => d.outcome === 'PROMOTED').length}</div>
              <div>• Continue Grade: {Object.values(decisionOverrides).filter((d) => d.outcome === 'CONTINUE_CURRENT_LEVEL').length}</div>
              <div>• Graduating: {Object.values(decisionOverrides).filter((d) => d.outcome === 'GRADUATED').length}</div>
              <div>• Special Review: {Object.values(decisionOverrides).filter((d) => d.outcome === 'SPECIAL_REVIEW').length}</div>
            </div>
            <p style={{ margin: 0, color: 'var(--foreground-muted)' }}>
              This operation is atomic and idempotent. Existing historical allocations will be marked completed and new session allocations created.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
