'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, ArrowRight, CheckCircle2, AlertTriangle, RotateCw, Save,
  Users, Building2, Calendar, ShieldCheck, ChevronRight, HelpCircle,
  Filter, Search, UserCheck, ArrowUpRight, Check, X, RefreshCw, Award, Info,
  Sliders, School, Sparkles, CheckSquare, Layers
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

  // Primary View Mode: 'classes' (Visual Cards) | 'students' (Customizer Table) | 'policies' (Settings)
  const [viewMode, setViewMode] = useState<'classes' | 'students' | 'policies'>('classes')

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

  // Target class overrides at the classroom level: sourceClassroomId -> targetClassroomId
  const [classTargetOverrides, setClassTargetOverrides] = useState<Record<string, string>>({})

  // Filtering on Student Roster tab
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('ALL')
  const [filterClassroom, setFilterClassroom] = useState('ALL')
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  // Execution Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [executingBatch, setExecutingBatch] = useState(false)
  const [batchScope, setBatchScope] = useState<'ALL' | 'CLASS' | 'SELECTED'>('ALL')
  const [targetClassroomForBatch, setTargetClassroomForBatch] = useState<string | null>(null)
  const [batchResult, setBatchResult] = useState<any | null>(null)
  const [resultModalOpen, setResultModalOpen] = useState(false)

  // 1. Initial Load: Academic Sessions & Config
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [sessionsRes, configRes, statusRes, classRes] = await Promise.all([
        fetch('/api/v1/academic-years').then((r) => r.json()),
        fetch('/api/v1/setup/config/PROMOTION').then((r) => r.json()),
        fetch('/api/v1/setup/status').then((r) => r.json()),
        fetch('/api/v1/classrooms?pageSize=100').then((r) => r.json()),
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
        const defaultClassTargets: Record<string, string> = {}

        for (const c of json.data.candidates as CandidateEvaluation[]) {
          initialOverrides[c.studentId] = {
            outcome: c.suggestedOutcome,
            targetClassroomId: c.proposedClassroomId || undefined,
            notes: c.notes || '',
          }
          if (c.currentClassroomId && c.proposedClassroomId && !defaultClassTargets[c.currentClassroomId]) {
            defaultClassTargets[c.currentClassroomId] = c.proposedClassroomId
          }
        }
        setDecisionOverrides(initialOverrides)
        setClassTargetOverrides((prev) => ({ ...defaultClassTargets, ...prev }))
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

  // Target classrooms for current target session
  const targetSessionClassrooms = useMemo(() => {
    return classrooms.filter((c) => c.academicSessionId === targetSessionId && (c as any).isActive !== false)
  }, [classrooms, targetSessionId])

  // Classrooms in the source session grouped from candidate data
  const classProgressionCards = useMemo(() => {
    const classMap: Record<string, {
      classroomId: string
      classroomName: string
      programType: string
      candidates: CandidateEvaluation[]
      readyCount: number
      continueCount: number
      reviewCount: number
      graduateCount: number
      defaultTargetClassId?: string
    }> = {}

    for (const c of candidates) {
      if (!classMap[c.currentClassroomId]) {
        classMap[c.currentClassroomId] = {
          classroomId: c.currentClassroomId,
          classroomName: c.currentClassroomName,
          programType: c.currentProgramType,
          candidates: [],
          readyCount: 0,
          continueCount: 0,
          reviewCount: 0,
          graduateCount: 0,
          defaultTargetClassId: classTargetOverrides[c.currentClassroomId] || c.proposedClassroomId || undefined,
        }
      }

      const item = classMap[c.currentClassroomId]
      item.candidates.push(c)

      const outcome = decisionOverrides[c.studentId]?.outcome || c.suggestedOutcome
      if (outcome === 'PROMOTED') item.readyCount++
      else if (outcome === 'CONTINUE_CURRENT_LEVEL') item.continueCount++
      else if (outcome === 'GRADUATED') item.graduateCount++
      else item.reviewCount++
    }

    return Object.values(classMap)
  }, [candidates, decisionOverrides, classTargetOverrides])

  // Filtered Candidates for the Detailed Roster View
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

  // 5. Execute Promotion (Single Class, Selected, or All)
  const handleExecutePromotion = async () => {
    if (!sourceSessionId || !targetSessionId) return
    setExecutingBatch(true)

    try {
      let targetCandidates: CandidateEvaluation[] = []

      if (batchScope === 'CLASS' && targetClassroomForBatch) {
        targetCandidates = candidates.filter((c) => c.currentClassroomId === targetClassroomForBatch)
      } else if (batchScope === 'SELECTED') {
        targetCandidates = candidates.filter((c) => selectedStudentIds.has(c.studentId))
      } else {
        targetCandidates = candidates
      }

      if (targetCandidates.length === 0) {
        toast.warning('No students selected', 'Please select at least one student candidate.')
        return
      }

      const decisions = targetCandidates.map((c) => {
        const d = decisionOverrides[c.studentId] || { outcome: c.suggestedOutcome }
        const classTarget = classTargetOverrides[c.currentClassroomId]
        return {
          studentId: c.studentId,
          outcome: d.outcome as any,
          targetClassroomId: d.targetClassroomId || classTarget || c.proposedClassroomId || undefined,
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
        setResultModalOpen(true)
        toast.success(
          'Promotion Executed Successfully',
          `Processed ${json.data.processedCount} students: ${json.data.promotedCount} promoted, ${json.data.continuedCount} continued.`
        )
        loadPreview()
        setSelectedStudentIds(new Set())
      } else {
        toast.error('Execution Failed', json.error?.message)
      }
    } catch (err: any) {
      toast.error('Execution Error', err.message)
    } finally {
      setExecutingBatch(false)
      setConfirmModalOpen(false)
    }
  }

  // Quick Promote Single Class Helper
  const triggerClassPromotion = (classroomId: string) => {
    setBatchScope('CLASS')
    setTargetClassroomForBatch(classroomId)
    setConfirmModalOpen(true)
  }

  // Bulk Apply Decision to Selected Students
  const applyBulkDecision = (outcome: string, targetClassId?: string) => {
    if (selectedStudentIds.size === 0) {
      toast.warning('No selection', 'Check students in the table first.')
      return
    }
    setDecisionOverrides((prev) => {
      const next = { ...prev }
      selectedStudentIds.forEach((id) => {
        next[id] = {
          ...next[id],
          outcome,
          ...(targetClassId ? { targetClassroomId: targetClassId } : {}),
        }
      })
      return next
    })
    toast.success('Updated Decisions', `Applied to ${selectedStudentIds.size} selected students.`)
  }

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
        sub="One-click class progression, individualized student overrides, and seamless academic year transitions."
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
            {candidates.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setBatchScope('ALL')
                  setTargetClassroomForBatch(null)
                  setConfirmModalOpen(true)
                }}
                disabled={executingBatch}
              >
                <Sparkles size={15} />
                <span>Promote All Ready Classes ({candidates.length})</span>
              </button>
            )}
            {stepStatus !== 'COMPLETE' && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCompleteSetupStep}
                disabled={completingStep || savingConfig}
              >
                <CheckCircle2 size={15} />
                <span>{completingStep ? 'Saving…' : 'Mark Step Complete'}</span>
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

      {/* ── REASSURANCE BANNER (Fearless Promotion) ── */}
      <div
        style={{
          padding: '12px 16px',
          marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ShieldCheck size={20} style={{ color: '#059669', shrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--text-main)', flex: 1 }}>
          <strong>Historical Record Safety Guarantee:</strong> Promoting students advances their enrollment for the new academic session. All past attendance, daily diaries, milestone observations, and fee invoices from the source session remain <strong>fully preserved and archived</strong>.
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
          <span style={{ fontSize: 13, fontWeight: 700 }}>Academic Transition:</span>
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

      {/* ── KPI METRICS CARDS ── */}
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
            Advancing to next grade level
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
            Graduation / ECE Alumni
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: '#9333ea' }}>
            {previewSummary?.graduating ?? '—'}
          </div>
          <div className="helper" style={{ fontSize: 11.5, marginTop: 2 }}>
            Sr. KG completion (preschool alumni)
          </div>
        </div>
      </div>

      {/* ── VIEW MODE TOGGLE STRIP ── */}
      <div className="roles-tab-strip" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`roles-tab-item ${viewMode === 'classes' ? 'active' : ''}`}
          onClick={() => setViewMode('classes')}
        >
          <School size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Class-to-Class Quick Promote ({classProgressionCards.length} Classes)
        </button>
        <button
          type="button"
          className={`roles-tab-item ${viewMode === 'students' ? 'active' : ''}`}
          onClick={() => setViewMode('students')}
        >
          <Users size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Student Roster & Exceptions ({candidates.length} Students)
        </button>
        <button
          type="button"
          className={`roles-tab-item ${viewMode === 'policies' ? 'active' : ''}`}
          onClick={() => setViewMode('policies')}
        >
          <Sliders size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Progression Policies & Rules
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 1: CLASS-TO-CLASS PROGRESSION CARDS (THE 80% FAST PATH)
         ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'classes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {classProgressionCards.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <EmptyState
                icon={<School size={36} style={{ color: 'var(--foreground-muted)' }} />}
                title="No classrooms or candidates found"
                description="Make sure the source session contains active enrolled students and target classrooms exist."
              />
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 16,
              }}
            >
              {classProgressionCards.map((card) => {
                const currentSelectedTarget = classTargetOverrides[card.classroomId] || card.defaultTargetClassId || ''
                const targetClassObj = targetSessionClassrooms.find((c) => c.id === currentSelectedTarget)

                return (
                  <div
                    key={card.classroomId}
                    className="card"
                    style={{
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                            {card.classroomName}
                          </div>
                          <div className="helper" style={{ fontSize: 12 }}>
                            {card.programType} • {card.candidates.length} enrolled students
                          </div>
                        </div>
                        <span className="badge b-purple" style={{ fontSize: 11, fontWeight: 700 }}>
                          {card.candidates.length} Students
                        </span>
                      </div>

                      {/* Progression Arrow & Target Section Dropdown */}
                      <div
                        style={{
                          background: 'var(--surface-muted)',
                          padding: '10px 12px',
                          borderRadius: 8,
                          marginBottom: 12,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-muted)', marginBottom: 6 }}>
                          Target Section for Next Academic Year:
                        </div>
                        <select
                          className="select"
                          style={{ width: '100%', height: 34, fontSize: 13 }}
                          value={currentSelectedTarget}
                          onChange={(e) => {
                            const val = e.target.value
                            setClassTargetOverrides((prev) => ({ ...prev, [card.classroomId]: val }))
                          }}
                        >
                          <option value="">Select target section…</option>
                          {targetSessionClassrooms.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              {tc.name} ({tc.programType}) — Cap: {tc.capacity}
                            </option>
                          ))}
                        </select>
                        {targetClassObj && (
                          <div className="helper" style={{ fontSize: 11, marginTop: 4 }}>
                            Assigned to: {targetClassObj.name} ({targetClassObj.programType})
                          </div>
                        )}
                      </div>

                      {/* Micro KPI Badge Row */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <span className="badge b-success" style={{ fontSize: 11 }}>
                          🟢 {card.readyCount} Ready to Promote
                        </span>
                        {card.continueCount > 0 && (
                          <span className="badge b-info" style={{ fontSize: 11 }}>
                            🔵 {card.continueCount} Continue Grade
                          </span>
                        )}
                        {card.reviewCount > 0 && (
                          <span className="badge b-warning" style={{ fontSize: 11 }}>
                            🟡 {card.reviewCount} Need Review
                          </span>
                        )}
                        {card.graduateCount > 0 && (
                          <span className="badge b-purple" style={{ fontSize: 11 }}>
                            🎓 {card.graduateCount} Graduating
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => triggerClassPromotion(card.classroomId)}
                        disabled={executingBatch}
                        title={`Promote all ${card.candidates.length} students from ${card.classroomName}`}
                      >
                        <Sparkles size={13} />
                        <span>Quick Promote ({card.candidates.length})</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setFilterClassroom(card.classroomId)
                          setViewMode('students')
                        }}
                        title="Review and tweak individual students in this class"
                      >
                        <span>Customize ({card.candidates.length})</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 2: DETAILED STUDENT ROSTER & CUSTOMIZER (BULK + EXCEPTIONS)
         ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'students' && (
        <div className="card" style={{ padding: 18 }}>
          {/* Filter Bar */}
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
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>Classroom:</span>
              <select
                className="select"
                style={{ height: 32, fontSize: 12.5 }}
                value={filterClassroom}
                onChange={(e) => setFilterClassroom(e.target.value)}
              >
                <option value="ALL">All Classrooms ({candidates.length})</option>
                {classProgressionCards.map((c) => (
                  <option key={c.classroomId} value={c.classroomId}>
                    {c.classroomName} ({c.candidates.length})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

          {/* Bulk Action Toolbar for Checked Students */}
          {selectedStudentIds.size > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                background: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: 8,
                marginBottom: 12,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                {selectedStudentIds.size} student{selectedStudentIds.size === 1 ? '' : 's'} selected
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="helper" style={{ fontSize: 12 }}>Set Decision:</span>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => applyBulkDecision('PROMOTED')}
                >
                  Promote
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => applyBulkDecision('CONTINUE_CURRENT_LEVEL')}
                >
                  Continue Level
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => applyBulkDecision('GRADUATED')}
                >
                  Graduate
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => applyBulkDecision('SPECIAL_REVIEW')}
                >
                  Special Review
                </button>

                <div style={{ height: 16, width: 1, background: 'var(--border-subtle)', margin: '0 4px' }} />

                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={() => {
                    setBatchScope('SELECTED')
                    setTargetClassroomForBatch(null)
                    setConfirmModalOpen(true)
                  }}
                >
                  <Sparkles size={12} />
                  <span>Promote Selected ({selectedStudentIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {/* Student Candidates Table */}
          <div className="dtable-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredCandidates.length > 0 &&
                        filteredCandidates.every((c) => selectedStudentIds.has(c.studentId))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(new Set(filteredCandidates.map((c) => c.studentId)))
                        } else {
                          setSelectedStudentIds(new Set())
                        }
                      }}
                    />
                  </th>
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
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--foreground-muted)' }}>
                      No matching student candidates.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => {
                    const currentDecision = decisionOverrides[c.studentId]?.outcome || c.suggestedOutcome
                    const currentTargetClass =
                      decisionOverrides[c.studentId]?.targetClassroomId ||
                      classTargetOverrides[c.currentClassroomId] ||
                      c.proposedClassroomId ||
                      ''
                    const isSelected = selectedStudentIds.has(c.studentId)

                    return (
                      <tr key={c.studentId} style={{ background: isSelected ? 'rgba(124, 58, 237, 0.03)' : undefined }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedStudentIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(c.studentId)
                                else next.delete(c.studentId)
                                return next
                              })
                            }}
                          />
                        </td>
                        <td>
                          <a
                            href={`/app/students/${c.studentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cell-strong"
                            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                          >
                            {c.name}
                          </a>
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

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 3: PROGRESSION POLICIES & SETTINGS
         ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Progression Policies & Cut-offs</h3>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                <Save size={14} /> {savingConfig ? 'Saving…' : 'Save Policies'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12 }}>
                  Age Eligibility Cut-off Date
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="select"
                    style={{ flex: 1, height: 34 }}
                    value={config.cutOffMonth}
                    onChange={(e) => setConfig({ ...config, cutOffMonth: parseInt(e.target.value) })}
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December',
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 80, height: 34 }}
                    min={1}
                    max={31}
                    value={config.cutOffDay}
                    onChange={(e) => setConfig({ ...config, cutOffDay: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="helper" style={{ fontSize: 11, marginTop: 4 }}>
                  Age calculated as of this calendar date for the target academic year.
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: 12 }}>
                  Teacher Sign-Off Requirement
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={config.requireTeacherSignOff}
                    onChange={(e) => setConfig({ ...config, requireTeacherSignOff: e.target.checked })}
                  />
                  <span>Mandatory teacher recommendation before promoting</span>
                </label>
              </div>

              <div>
                <label className="label" style={{ fontSize: 12 }}>
                  Capacity Guard Strategy
                </label>
                <select
                  className="select"
                  style={{ width: '100%', height: 34 }}
                  value={config.capacityGuardStrategy}
                  onChange={(e) => setConfig({ ...config, capacityGuardStrategy: e.target.value as any })}
                >
                  <option value="STRICT_REJECT">Strict Reject (Prevent over-capacity)</option>
                  <option value="WAITLIST_OVERFLOW">Waitlist Overflow</option>
                  <option value="ALLOW_WITH_AUDIT">Allow with Audit Log</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>ECE Progression Principles</h3>
            <ul style={{ paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, margin: 0 }}>
              <li>
                <strong>No Failure Stigma:</strong> Children needing more time continue at the same developmental stage (<code>CONTINUE_CURRENT_LEVEL</code>) without academic penalty.
              </li>
              <li>
                <strong>Developmental Milestones:</strong> Evaluates speech, fine/gross motor skills, social adaptability, and independence.
              </li>
              <li>
                <strong>Family Continuity:</strong> Parent logins, portal history, and guardian pickup PINs remain continuous across sessions.
              </li>
              <li>
                <strong>Historical Data Preservation:</strong> Past session attendance and daily diaries remain intact.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── EXECUTION CONFIRMATION MODAL ── */}
      {confirmModalOpen && (
        <Modal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Academic Transition Execution"
          subtitle="Atomic progression of student allocations into the target academic year"
          icon={<ShieldCheck size={20} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 14, background: 'var(--surface-muted)', borderRadius: 8, fontSize: 13 }}>
              <div><strong>Source Session:</strong> {sessions.find((s) => s.id === sourceSessionId)?.name}</div>
              <div style={{ marginTop: 4 }}><strong>Target Session:</strong> {sessions.find((s) => s.id === targetSessionId)?.name}</div>
              <div style={{ marginTop: 4 }}>
                <strong>Execution Scope:</strong>{' '}
                {batchScope === 'ALL'
                  ? `All Ready Classes (${candidates.length} Students)`
                  : batchScope === 'CLASS'
                  ? `Single Classroom: ${classProgressionCards.find((c) => c.classroomId === targetClassroomForBatch)?.classroomName}`
                  : `${selectedStudentIds.size} Selected Students`}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground-muted)' }}>
              This will update active student allocations into their target classrooms for the new academic session. All past attendance and historical data will be safely archived and preserved.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmModalOpen(false)}
                disabled={executingBatch}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecutePromotion}
                disabled={executingBatch}
              >
                {executingBatch ? 'Processing Transition…' : 'Confirm & Execute Now'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── EXECUTION RESULT MODAL ── */}
      {resultModalOpen && batchResult && (
        <Modal
          open={resultModalOpen}
          onClose={() => setResultModalOpen(false)}
          title="Promotion Transition Completed"
          subtitle="Cohort execution results"
          icon={<CheckCircle2 size={20} style={{ color: '#16a34a' }} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
              <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{batchResult.promotedCount}</div>
                <div style={{ fontSize: 11, color: '#15803d' }}>Promoted</div>
              </div>
              <div style={{ padding: 10, background: '#eff6ff', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7' }}>{batchResult.continuedCount}</div>
                <div style={{ fontSize: 11, color: '#0369a1' }}>Continued</div>
              </div>
              <div style={{ padding: 10, background: '#faf5ff', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#9333ea' }}>{batchResult.graduatedCount}</div>
                <div style={{ fontSize: 11, color: '#7e22ce' }}>Graduated</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>
              Total {batchResult.processedCount} students were processed. Their student profiles, parent portals, and classroom rosters are now updated.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setResultModalOpen(false)}
              >
                Close & Review Roster
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
