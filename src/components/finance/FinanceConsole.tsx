'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Layers,
  Calendar,
  CreditCard,
  Building2,
  Users,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  FileSpreadsheet,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
  Send,
  Eye,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  DollarSign,
  AlertTriangle,
  Receipt,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { inr, fmtDate, enumLabel } from '@/lib/format'
import { SpreadsheetImportWorkspace } from '@/components/importers/SpreadsheetImportWorkspace'

// Types
interface KPIState {
  activeStructuresCount: number
  totalScheduledDuesRupees: number
  totalCollectedRupees: number
  totalOutstandingRupees: number
  totalOverdueRupees: number
  depositsHeldRupees: number
  paymentCount: number
  collectionRate: number
}

interface FeeStructureItem {
  id: string
  name: string
  feeType: string
  amountCents: number
  frequency: string
  dueDate?: string | null
  dueRule?: string | null
}

interface FeeStructure {
  id: string
  name: string
  code?: string
  description?: string | null
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  academicSession?: { id: string; name: string } | null
  branch?: { id: string; name: string } | null
  program?: { id: string; name: string } | null
  classroom?: { id: string; name: string } | null
  items: FeeStructureItem[]
  _count?: { schedules: number }
  createdAt: string
}

interface FeeSchedule {
  id: string
  studentId: string
  studentName: string
  admissionNo: string
  branchName: string
  classroomName: string
  programName: string
  itemName: string
  feeType: string
  period: string
  dueDate: string
  amountDueRupees: string
  amountPaidRupees: string
  remainingRupees: string
  status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE'
  isRefundable: boolean
}

interface StudentDeposit {
  id: string
  studentId: string
  studentName: string
  admissionNo: string
  name: string
  totalRupees: string
  refundedRupees: string
  adjustedRupees: string
  remainingRupees: string
  status: 'HELD' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'ADJUSTED'
  notes?: string | null
  createdAt: string
}

interface PaymentRecord {
  id: string
  paymentNumber: string
  amountRupees: string
  method: string
  status: string
  transactionRef?: string | null
  notes?: string | null
  paymentDate: string
  studentName: string
  admissionNo: string
  receiptId?: string | null
  receiptNumber?: string | null
  invoiceNumber?: string | null
}

interface FollowUpRecord {
  studentId: string
  studentName: string
  admissionNo: string
  branchName: string
  classroomName: string
  parentName: string
  parentPhone?: string | null
  parentEmail?: string | null
  totalOutstandingRupees: string
  totalOverdueRupees: string
  daysOverdue: number
  followUpStatus: string
  lastContactDate?: string | null
  followUpNotes?: string | null
  pendingItems: any[]
}

interface AuditRecord {
  id: string
  action: string
  entity: string
  entityId: string
  actorName: string
  actorRole: string
  summary: string
  timestamp: string
}

export function FinanceConsole() {
  const [activeTab, setActiveTab] = useState<
    'STRUCTURES' | 'SCHEDULES' | 'DEPOSITS' | 'PAYMENTS' | 'FOLLOW_UP' | 'REPORTS' | 'AUDIT' | 'IMPORT'
  >('SCHEDULES')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Master Data
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; branchId?: string }[]>([])
  const [academicSessions, setAcademicSessions] = useState<{ id: string; name: string }[]>([])

  // Global Filters
  const [selectedBranch, setSelectedBranch] = useState('ALL')
  const [selectedSession, setSelectedSession] = useState('ALL')
  const [selectedClassroom, setSelectedClassroom] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // KPI States
  const [kpi, setKpi] = useState<KPIState>({
    activeStructuresCount: 0,
    totalScheduledDuesRupees: 0,
    totalCollectedRupees: 0,
    totalOutstandingRupees: 0,
    totalOverdueRupees: 0,
    depositsHeldRupees: 0,
    paymentCount: 0,
    collectionRate: 0,
  })

  // Tab Data States
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [schedules, setSchedules] = useState<FeeSchedule[]>([])
  const [deposits, setDeposits] = useState<StudentDeposit[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([])

  // Reports State
  const [selectedReportType, setSelectedReportType] = useState('DAILY_COLLECTION')
  const [reportRows, setReportRows] = useState<any[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  // Modals
  const [showApplyModal, setShowApplyModal] = useState<FeeStructure | null>(null)
  const [applyClassroomId, setApplyClassroomId] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<any | null>(null)

  const [viewStructureModal, setViewStructureModal] = useState<FeeStructure | null>(null)

  const [collectPaymentModal, setCollectPaymentModal] = useState<FeeSchedule | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amountRupees: '',
    method: 'UPI',
    transactionRef: '',
    notes: '',
  })
  const [recordingPayment, setRecordingPayment] = useState(false)

  const [receiptModal, setReceiptModal] = useState<any | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  const [refundModal, setRefundModal] = useState<StudentDeposit | null>(null)
  const [refundForm, setRefundForm] = useState({
    amountRupees: '',
    refundMode: 'BANK_TRANSFER',
    reference: '',
    reason: '',
  })
  const [processingRefund, setProcessingRefund] = useState(false)

  const [adjustModal, setAdjustModal] = useState<StudentDeposit | null>(null)
  const [adjustForm, setAdjustForm] = useState({
    amountRupees: '',
    reasonType: 'DAMAGED_PROPERTY',
    notes: '',
  })
  const [processingAdjust, setProcessingAdjust] = useState(false)

  const [ledgerStudentId, setLedgerStudentId] = useState<string | null>(null)
  const [studentLedger, setStudentLedger] = useState<any | null>(null)
  const [loadingLedger, setLoadingLedger] = useState(false)

  const [followUpModal, setFollowUpModal] = useState<FollowUpRecord | null>(null)
  const [followUpForm, setFollowUpForm] = useState({
    status: 'CONTACTED',
    notes: '',
    nextFollowUpDate: '',
  })
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  const [reminderModal, setReminderModal] = useState<FollowUpRecord | null>(null)
  const [sendingReminder, setSendingReminder] = useState(false)

  // Payment Timeline & Gateway Reconciliation
  const [timelinePayment, setTimelinePayment] = useState<PaymentRecord | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null)
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null)

  // Dedicated Payment Monitoring & Health KPIs
  const [monitoringKPIs, setMonitoringKPIs] = useState<any>(null)
  const [supportIssuesModal, setSupportIssuesModal] = useState(false)
  const [supportIssues, setSupportIssues] = useState<any[]>([])
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [webhooksModal, setWebhooksModal] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState<any[]>([])
  const [loadingWebhooks, setLoadingWebhooks] = useState(false)

  const loadMonitoringData = async () => {
    try {
      const res = await fetch('/api/v1/finance/monitoring/health')
      if (res.ok) {
        const d = await res.json()
        setMonitoringKPIs(d.data?.kpis || null)
      }
    } catch {
      // Ignore
    }
  }

  const loadSupportIssues = async () => {
    try {
      setLoadingIssues(true)
      const res = await fetch('/api/v1/finance/support-issues')
      if (res.ok) {
        const d = await res.json()
        setSupportIssues(d.data?.issues || [])
      }
    } finally {
      setLoadingIssues(false)
    }
  }

  const loadWebhookEvents = async () => {
    try {
      setLoadingWebhooks(true)
      const res = await fetch('/api/v1/finance/webhooks/events')
      if (res.ok) {
        const d = await res.json()
        setWebhookEvents(d.data?.events || [])
      }
    } finally {
      setLoadingWebhooks(false)
    }
  }

  const handleCheckProviderStatus = async (paymentId: string) => {
    try {
      setCheckingPaymentId(paymentId)
      setReconcileFeedback(null)
      const res = await fetch('/api/v1/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, thresholdMinutes: 0 }),
      })
      const d = await res.json()
      if (res.ok) {
        const item = d.data?.results?.[0]
        setReconcileFeedback(
          item ? `Checked provider: ${item.outcome} (${item.detailedStatus || item.newStatus}). ${item.message || ''}` : 'Status check complete.'
        )
        loadTabData()
        loadMonitoringData()
      } else {
        setReconcileFeedback(d.error?.message || 'Status check failed')
      }
    } catch (e: any) {
      setReconcileFeedback(e.message || 'Error checking status')
    } finally {
      setCheckingPaymentId(null)
    }
  }

  const handleReconcilePayments = async () => {
    try {
      setReconciling(true)
      setReconcileFeedback(null)
      const res = await fetch('/api/v1/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholdMinutes: 15 }),
      })
      const d = await res.json()
      if (res.ok) {
        const count = d.data?.processedCount ?? 0
        setReconcileFeedback(`Gateway reconciliation finished: ${count} pending payment(s) reviewed.`)
        // Refresh active tab
        loadTabData()
        loadMonitoringData()
      } else {
        setReconcileFeedback(d.error?.message || 'Reconciliation failed')
      }
    } catch (e: any) {
      setReconcileFeedback(e.message || 'Error executing gateway reconciliation')
    } finally {
      setReconciling(false)
    }
  }

  // 1. Load Master Options & KPIs
  const loadInitialData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [optRes, dashRes] = await Promise.all([
        fetch('/api/v1/academic-years'),
        fetch(`/api/v1/fees/dashboard${selectedBranch !== 'ALL' ? `?branchId=${selectedBranch}` : ''}`),
      ])

      if (optRes.ok) {
        const d = await optRes.json()
        const ay = d.academicYears || d.data || []
        setAcademicSessions(ay.map((y: any) => ({ id: y.id, name: y.name })))
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json()
        const k = dashData.data?.kpis || dashData.kpis || {}
        setKpi({
          activeStructuresCount: k.activeStructuresCount || 0,
          totalScheduledDuesRupees: k.totalBilledRupees || 0,
          totalCollectedRupees: k.totalCollectedRupees || 0,
          totalOutstandingRupees: k.totalOutstandingRupees || 0,
          totalOverdueRupees: k.totalOverdueRupees || 0,
          depositsHeldRupees: k.depositsHeldRupees || 0,
          paymentCount: k.paymentCount || 0,
          collectionRate: k.collectionRate || 0,
        })
      }

      // Load branches and classrooms
      const [brRes, crRes] = await Promise.all([
        fetch('/api/v1/fee-structures/coverage'),
        fetch('/api/v1/classrooms'),
      ])

      if (brRes.ok) {
        const brData = await brRes.json()
        const bList = brData.data?.branches || []
        setBranches(bList.map((b: any) => ({ id: b.id, name: b.name })))
      }
      if (crRes.ok) {
        const crData = await crRes.json()
        const cList = crData.data || crData.classrooms || []
        setClassrooms(cList.map((c: any) => ({ id: c.id, name: c.name, branchId: c.branchId })))
      }
    } catch (e) {
      console.error('Failed to load initial finance data', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // 2. Load Active Tab Data
  const loadTabData = useCallback(async () => {
    setLoading(true)
    try {
      const branchParam = selectedBranch !== 'ALL' ? `branchId=${selectedBranch}` : ''
      const searchParam = searchQuery ? `search=${encodeURIComponent(searchQuery)}` : ''

      if (activeTab === 'STRUCTURES') {
        const res = await fetch(`/api/v1/fee-structures?status=ACTIVE&${branchParam}`)
        if (res.ok) {
          const d = await res.json()
          setStructures(d.data?.structures || d.structures || [])
        }
      } else if (activeTab === 'SCHEDULES') {
        const res = await fetch(`/api/v1/fee-schedules?${branchParam}&${searchParam}`)
        if (res.ok) {
          const d = await res.json()
          setSchedules(d.data || d.schedules || [])
        }
      } else if (activeTab === 'DEPOSITS') {
        const res = await fetch(`/api/v1/deposits?${branchParam}`)
        if (res.ok) {
          const d = await res.json()
          setDeposits(d.data || d.deposits || [])
        }
      } else if (activeTab === 'PAYMENTS') {
        const res = await fetch(`/api/v1/payments?${branchParam}`)
        if (res.ok) {
          const d = await res.json()
          setPayments(d.data || d.payments || [])
        }
      } else if (activeTab === 'FOLLOW_UP') {
        const res = await fetch(`/api/v1/finance/follow-ups?${branchParam}`)
        if (res.ok) {
          const d = await res.json()
          setFollowUps(d.data?.records || [])
        }
      } else if (activeTab === 'AUDIT') {
        const res = await fetch('/api/v1/finance/audit?limit=50')
        if (res.ok) {
          const d = await res.json()
          setAuditLogs(d.data?.records || [])
        }
      }
    } catch (e) {
      console.error('Failed to load tab data', e)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedBranch, searchQuery])

  useEffect(() => {
    loadTabData()
  }, [loadTabData])

  // Load Report Data
  const loadReportData = async (type: string) => {
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/v1/finance/reports?type=${type}${selectedBranch !== 'ALL' ? `&branchId=${selectedBranch}` : ''}`)
      if (res.ok) {
        const d = await res.json()
        setReportRows(d.data?.rows || [])
      }
    } catch (e) {
      console.error('Failed to load report', e)
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'REPORTS') {
      loadReportData(selectedReportType)
    }
  }, [activeTab, selectedReportType, selectedBranch])

  // Apply Structure Workflow
  const handleApplyStructure = async () => {
    if (!showApplyModal) return
    setApplying(true)
    setApplyResult(null)
    try {
      const res = await fetch(`/api/v1/fee-structures/${showApplyModal.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: applyClassroomId || undefined }),
      })
      const d = await res.json()
      if (res.ok) {
        setApplyResult(d.data)
        loadInitialData()
      } else {
        alert(d.error?.message || 'Failed to apply fee structure')
      }
    } catch (e: any) {
      alert(e.message || 'System error applying fee structure')
    } finally {
      setApplying(false)
    }
  }

  // Record Payment Workflow
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectPaymentModal) return
    setRecordingPayment(true)
    try {
      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeScheduleId: collectPaymentModal.id,
          studentId: collectPaymentModal.studentId,
          amountRupees: parseFloat(paymentForm.amountRupees),
          method: paymentForm.method,
          transactionRef: paymentForm.transactionRef || undefined,
          notes: paymentForm.notes || undefined,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setCollectPaymentModal(null)
        loadTabData()
        loadInitialData()
        if (d.data?.receipt?.id) {
          openReceiptModal(d.data.receipt.id)
        } else {
          alert('Payment recorded successfully!')
        }
      } else {
        alert(d.error?.message || 'Failed to record payment')
      }
    } catch (e: any) {
      alert(e.message || 'System error recording payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  // Receipt Modal
  const openReceiptModal = async (receiptId: string) => {
    setLoadingReceipt(true)
    try {
      const res = await fetch(`/api/v1/receipts/${receiptId}`)
      if (res.ok) {
        const d = await res.json()
        setReceiptModal(d.data)
      } else {
        alert('Unable to load official receipt details')
      }
    } catch {
      alert('Network error loading receipt')
    } finally {
      setLoadingReceipt(false)
    }
  }

  // Refund Workflow
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundModal) return
    setProcessingRefund(true)
    try {
      const res = await fetch(`/api/v1/deposits/${refundModal.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: refundModal.studentId,
          amountRupees: parseFloat(refundForm.amountRupees),
          refundMode: refundForm.refundMode,
          reference: refundForm.reference,
          reason: refundForm.reason,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setRefundModal(null)
        loadTabData()
        loadInitialData()
        alert('Deposit refund processed successfully!')
      } else {
        alert(d.error?.message || 'Failed to process refund')
      }
    } catch (e: any) {
      alert(e.message || 'System error processing refund')
    } finally {
      setProcessingRefund(false)
    }
  }

  // Adjust Deposit Workflow
  const handleAdjustDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustModal) return
    setProcessingAdjust(true)
    try {
      const res = await fetch(`/api/v1/deposits/${adjustModal.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: adjustModal.studentId,
          adjustmentAmountRupees: parseFloat(adjustForm.amountRupees),
          reason: `${adjustForm.reasonType}: ${adjustForm.notes}`,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setAdjustModal(null)
        loadTabData()
        loadInitialData()
        alert('Deposit balance adjusted successfully!')
      } else {
        alert(d.error?.message || 'Failed to adjust deposit')
      }
    } catch (e: any) {
      alert(e.message || 'System error adjusting deposit')
    } finally {
      setProcessingAdjust(false)
    }
  }

  // Student Ledger 360
  const openStudentLedger = async (studentId: string) => {
    setLedgerStudentId(studentId)
    setLoadingLedger(true)
    try {
      const res = await fetch(`/api/v1/students/${studentId}/finance`)
      if (res.ok) {
        const d = await res.json()
        setStudentLedger(d.data)
      } else {
        alert('Unable to retrieve student financial ledger')
      }
    } catch {
      alert('Error fetching student ledger')
    } finally {
      setLoadingLedger(false)
    }
  }

  // Record Follow-Up
  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!followUpModal) return
    setSavingFollowUp(true)
    try {
      const res = await fetch('/api/v1/finance/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: followUpModal.studentId,
          status: followUpForm.status,
          notes: followUpForm.notes,
          nextFollowUpDate: followUpForm.nextFollowUpDate || undefined,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setFollowUpModal(null)
        loadTabData()
        alert('Follow-up record logged successfully!')
      } else {
        alert(d.error?.message || 'Failed to save follow-up')
      }
    } catch (e: any) {
      alert(e.message || 'Error saving follow-up')
    } finally {
      setSavingFollowUp(false)
    }
  }

  // Dispatch Email Reminder
  const handleSendReminder = async () => {
    if (!reminderModal) return
    setSendingReminder(true)
    try {
      const res = await fetch('/api/v1/finance/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: reminderModal.studentId,
          status: 'REMINDER_SENT',
          notes: 'Dispatched automated fee payment reminder email to parent with installment breakdown.',
          sendEmailReminder: true,
        }),
      })
      if (res.ok) {
        setReminderModal(null)
        loadTabData()
        alert('Official fee reminder email dispatched and logged to student timeline!')
      } else {
        alert('Failed to send reminder email')
      }
    } catch {
      alert('System error sending reminder email')
    } finally {
      setSendingReminder(false)
    }
  }

  // Export CSV
  const handleExportCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      )
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── TOP HEADER & BURSAR CONSOLE ACTIONS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              }}
            >
              <CreditCard size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
                Finance & Operational Bursar Console
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground-muted)' }}>
                Daily fee execution, collection, receipt issuance, parent follow-ups, and deposit management.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => {
              loadInitialData()
              loadTabData()
            }}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: 13,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            href="/app/setup/fees_setup"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
            }}
          >
            <Layers size={15} />
            Fees Setup & Master Governance
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 6px',
                borderRadius: 10,
                fontSize: 11,
              }}
            >
              {kpi.activeStructuresCount} Plans
            </span>
          </Link>
        </div>
      </div>

      {/* ── KPI METRICS STRIP (8 LIVE CARDS) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Active Structures</span>
            <Layers size={14} color="#059669" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>{kpi.activeStructuresCount}</div>
          <div style={{ fontSize: 11, color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={11} /> Governed in Setup
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Scheduled Dues</span>
            <Calendar size={14} color="#2563eb" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>₹{kpi.totalScheduledDuesRupees.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 4 }}>Total billed commitments</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Realized Collections</span>
            <TrendingUp size={14} color="#16a34a" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>₹{kpi.totalCollectedRupees.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>{kpi.collectionRate}% collected</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Outstanding Balance</span>
            <Clock size={14} color="#d97706" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>₹{kpi.totalOutstandingRupees.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 4 }}>Pending collection</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Overdue Dues</span>
            <AlertTriangle size={14} color="#dc2626" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>₹{kpi.totalOverdueRupees.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Past grace period</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Caution Deposits Held</span>
            <ShieldCheck size={14} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>₹{kpi.depositsHeldRupees.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 4 }}>Refundable balances</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--foreground-muted)', fontSize: 12, marginBottom: 6 }}>
            <span>Receipts Issued</span>
            <Receipt size={14} color="#0891b2" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>{kpi.paymentCount}</div>
          <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 4 }}>Verified transactions</div>
        </div>
      </div>

      {/* ── GLOBAL FILTER & SEARCH BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--surface)',
          borderRadius: 10,
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} color="var(--foreground-muted)" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--surface)',
                fontSize: 13,
                color: 'var(--foreground)',
              }}
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="var(--foreground-muted)" />
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--surface)',
                fontSize: 13,
                color: 'var(--foreground)',
              }}
            >
              <option value="ALL">All Academic Years</option>
              {academicSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or admission no..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--surface)',
              fontSize: 13,
              color: 'var(--foreground)',
            }}
          />
        </div>
      </div>

      {/* ── MAIN TABS NAVIGATION ── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {[
          { key: 'SCHEDULES', label: 'Student Dues & Schedules', icon: Users, badge: schedules.length },
          { key: 'STRUCTURES', label: 'Operational Fee Plans', icon: Layers, badge: structures.length },
          { key: 'DEPOSITS', label: 'Caution Deposits Ledger', icon: ShieldCheck, badge: deposits.length },
          { key: 'PAYMENTS', label: 'Payment Receipts', icon: Receipt, badge: payments.length },
          { key: 'FOLLOW_UP', label: 'Overdue Follow-ups & Reminders', icon: Phone, badge: followUps.length, badgeColor: '#dc2626' },
          { key: 'REPORTS', label: 'Financial Reports', icon: FileSpreadsheet },
          { key: 'AUDIT', label: 'Financial Audit Trail', icon: FileText, badge: auditLogs.length },
          { key: 'IMPORT', label: 'Bulk Migration / Import', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? '#059669' : 'var(--foreground-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    background: tab.badgeColor ? `${tab.badgeColor}15` : 'rgba(5, 150, 105, 0.1)',
                    color: tab.badgeColor || '#059669',
                    fontWeight: 600,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: OPERATIONAL FEE STRUCTURES ── */}
      {activeTab === 'STRUCTURES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: 'rgba(5, 150, 105, 0.05)',
              border: '1px solid rgba(5, 150, 105, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={18} color="#059669" />
              <div>
                <strong style={{ fontSize: 13, color: '#047857' }}>Configuration vs. Operations Separation:</strong>
                <span style={{ fontSize: 13, color: 'var(--foreground)', marginLeft: 6 }}>
                  Fee structures, fee heads, frequencies, and gateway credentials are configured in Setup. Apply active structures here to generate student fee schedules.
                </span>
              </div>
            </div>
            <Link
              href="/app/setup/fees_setup"
              style={{
                fontSize: 12,
                color: '#059669',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              Manage Structures in Setup <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Structure Name & Code</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Academic Year</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Branch & Program</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fee Heads</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Annual Commitment</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Assigned Students</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Operational Actions</th>
                </tr>
              </thead>
              <tbody>
                {structures.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                      No active fee structures found for current filter.
                    </td>
                  </tr>
                ) : (
                  structures.map((st) => {
                    const totalAnnual = st.items.reduce((s, i) => s + i.amountCents, 0) / 100
                    return (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{st.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{st.code || st.id.slice(0, 8)}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--foreground-muted)' }}>
                          {st.academicSession?.name || '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 500 }}>{st.branch?.name || 'All Branches'}</div>
                          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{st.program?.name || 'Universal'}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: 'var(--surface-subtle)',
                              fontSize: 11,
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {st.items.length} Fee Heads
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#059669' }}>
                          ₹{totalAnnual.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 600 }}>{st._count?.schedules || 0}</span> students
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                              onClick={() => setViewStructureModal(st)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid var(--border-color)',
                                background: 'var(--surface)',
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => {
                                setShowApplyModal(st)
                                setApplyClassroomId('')
                                setApplyResult(null)
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: '#059669',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Users size={12} /> Apply to Class
                            </button>
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

      {/* ── TAB 2: STUDENT FEE SCHEDULES & LIVE DUES ── */}
      {activeTab === 'SCHEDULES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student & Admission</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Branch & Classroom</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fee Head & Installment</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Due Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Scheduled</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Paid</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Outstanding</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                      No student fee schedules found. Apply a fee structure from the Structures tab to generate schedules.
                    </td>
                  </tr>
                ) : (
                  schedules.map((sc) => {
                    const isOverdue = sc.status === 'OVERDUE'
                    const isPaid = sc.status === 'PAID'
                    return (
                      <tr key={sc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => openStudentLedger(sc.studentId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: 'var(--foreground)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {sc.studentName} <ExternalLink size={11} color="var(--foreground-muted)" />
                          </button>
                          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{sc.admissionNo}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>{sc.classroomName}</div>
                          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{sc.branchName}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 500 }}>{sc.itemName}</div>
                          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{sc.period}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: isOverdue ? '#dc2626' : 'var(--foreground-muted)' }}>
                          {new Date(sc.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>₹{parseFloat(sc.amountDueRupees).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 500 }}>₹{parseFloat(sc.amountPaidRupees).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: isOverdue ? '#dc2626' : '#d97706' }}>
                          ₹{parseFloat(sc.remainingRupees).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: isPaid ? '#dcfce7' : isOverdue ? '#fee2e2' : '#fef3c7',
                              color: isPaid ? '#15803d' : isOverdue ? '#b91c1c' : '#b45309',
                            }}
                          >
                            {sc.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  setCollectPaymentModal(sc)
                                  setPaymentForm({
                                    amountRupees: sc.remainingRupees,
                                    method: 'UPI',
                                    transactionRef: '',
                                    notes: '',
                                  })
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: '#059669',
                                  color: '#fff',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Collect
                              </button>
                            )}
                            <button
                              onClick={() => openStudentLedger(sc.studentId)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border-color)',
                                background: 'var(--surface)',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              Ledger
                            </button>
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

      {/* ── TAB 3: CAUTION & SECURITY DEPOSITS ── */}
      {activeTab === 'DEPOSITS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Admission No</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Deposit Item</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Initial Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Refunded</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Adjusted</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Held Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                      No refundable caution deposits recorded.
                    </td>
                  </tr>
                ) : (
                  deposits.map((d) => {
                    const remaining = parseFloat(d.remainingRupees)
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.studentName}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--foreground-muted)' }}>{d.admissionNo}</td>
                        <td style={{ padding: '12px 16px' }}>{d.name}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>₹{parseFloat(d.totalRupees).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', color: '#16a34a' }}>₹{parseFloat(d.refundedRupees).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', color: '#d97706' }}>₹{parseFloat(d.adjustedRupees).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed' }}>
                          ₹{remaining.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: d.status === 'HELD' ? '#ede9fe' : '#f1f5f9',
                              color: d.status === 'HELD' ? '#6d28d9' : '#475569',
                            }}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {remaining > 0 ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => {
                                  setRefundModal(d)
                                  setRefundForm({ amountRupees: d.remainingRupees, refundMode: 'BANK_TRANSFER', reference: '', reason: '' })
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #059669',
                                  background: 'rgba(5,150,105,0.08)',
                                  color: '#059669',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Refund
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustModal(d)
                                  setAdjustForm({ amountRupees: d.remainingRupees, reasonType: 'DAMAGED_PROPERTY', notes: '' })
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #d97706',
                                  background: 'rgba(217,119,6,0.08)',
                                  color: '#d97706',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Adjust
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Settled</span>
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

      {/* ── TAB 4: VERIFIED PAYMENTS & SERIALIZED RECEIPTS ── */}
      {activeTab === 'PAYMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Monitoring KPI Cards */}
          {monitoringKPIs && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Total Successful</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d', marginTop: 4 }}>{monitoringKPIs.totalSuccessfulCount}</div>
              </div>
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>Total Pending</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#a16207', marginTop: 4 }}>{monitoringKPIs.totalPendingCount}</div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Under Verification</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{monitoringKPIs.underVerificationCount}</div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Failed Payments</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>{monitoringKPIs.failedCount}</div>
              </div>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 600 }}>Delayed (&gt;5m)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ea580c', marginTop: 4 }}>{monitoringKPIs.delayedCount}</div>
              </div>
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 600 }}>Unreconciled</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#7e22ce', marginTop: 4 }}>{monitoringKPIs.unreconciledCount}</div>
              </div>
              <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#86198f', fontWeight: 600 }}>Refunds Pending</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#a21caf', marginTop: 4 }}>{monitoringKPIs.refundsPendingCount}</div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#14532d', fontWeight: 600 }}>Amount Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d', marginTop: 4 }}>₹{(monitoringKPIs.amountCollectedRupees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#78350f', fontWeight: 600 }}>Awaiting Confirmation</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#d97706', marginTop: 4 }}>₹{(monitoringKPIs.amountAwaitingConfirmationRupees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleReconcilePayments}
                disabled={reconciling}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 12,
                  cursor: reconciling ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                }}
              >
                <RefreshCw size={13} className={reconciling ? 'animate-spin' : ''} />
                {reconciling ? 'Reconciling...' : 'Reconcile Gateway'}
              </button>
              <button
                onClick={() => {
                  setSupportIssuesModal(true)
                  loadSupportIssues()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#c2410c',
                }}
              >
                <AlertCircle size={13} /> Support Issues
              </button>
              <button
                onClick={() => {
                  setWebhooksModal(true)
                  loadWebhookEvents()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                <FileText size={13} /> Webhook Logs
              </button>
              <Link
                href="/app/setup/payment-gateway"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 12,
                  textDecoration: 'none',
                  color: '#0284c7',
                  fontWeight: 500,
                }}
              >
                <CreditCard size={13} /> Gateway Setup
              </Link>
            </div>
            <button
              onClick={() =>
                handleExportCSV(
                  'Payment-Transactions',
                  ['Receipt Number', 'Payment ID', 'Student', 'Admission No', 'Date', 'Method', 'Amount (INR)', 'Invoice Ref'],
                  payments.map((p) => [
                    p.receiptNumber || '—',
                    p.paymentNumber,
                    p.studentName,
                    p.admissionNo,
                    new Date(p.paymentDate).toISOString().slice(0, 10),
                    p.method,
                    p.amountRupees,
                    p.invoiceNumber || '—',
                  ])
                )
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--surface)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {reconcileFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={14} />
              <span>{reconcileFeedback}</span>
            </div>
          )}

          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Receipt #</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payment Ref / UTR</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student & Admission</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status / Substate</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                      No verified payments recorded.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    let notesData: any = {}
                    try {
                      notesData = p.notes ? JSON.parse(p.notes) : {}
                    } catch {}
                    const detailed = notesData.detailedStatus || p.status
                    const isPending = p.status === 'PENDING'
                    const isUnderVerification = detailed === 'VERIFICATION_PENDING' || detailed === 'RECONCILIATION_PENDING'

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0891b2' }}>
                          {p.receiptNumber || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--foreground-muted)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{p.paymentNumber}</div>
                          {p.transactionRef && (
                            <div style={{ fontSize: 10, color: '#64748b' }}>UTR: {p.transactionRef}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{p.studentName}</div>
                          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{p.admissionNo}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--foreground-muted)' }}>
                          {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'var(--surface-subtle)',
                              border: '1px solid var(--border-color)',
                              fontSize: 11,
                            }}
                          >
                            {p.method}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                          ₹{parseFloat(p.amountRupees).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background:
                                  p.status === 'SUCCESS'
                                    ? '#dcfce7'
                                    : isUnderVerification
                                    ? '#fef3c7'
                                    : p.status === 'FAILED'
                                    ? '#fee2e2'
                                    : p.status === 'REFUNDED'
                                    ? '#f3e8ff'
                                    : '#fef9c3',
                                color:
                                  p.status === 'SUCCESS'
                                    ? '#15803d'
                                    : isUnderVerification
                                    ? '#b45309'
                                    : p.status === 'FAILED'
                                    ? '#b91c1c'
                                    : p.status === 'REFUNDED'
                                    ? '#7e22ce'
                                    : '#a16207',
                              }}
                            >
                              {detailed}
                            </span>
                            {notesData.provider && (
                              <span style={{ fontSize: 10, color: '#64748b' }}>via {notesData.provider}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {(isPending || isUnderVerification) && (
                              <button
                                onClick={() => handleCheckProviderStatus(p.id)}
                                disabled={checkingPaymentId === p.id}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  fontSize: 11,
                                  color: '#1d4ed8',
                                  cursor: checkingPaymentId === p.id ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontWeight: 600,
                                }}
                              >
                                <RefreshCw size={11} className={checkingPaymentId === p.id ? 'animate-spin' : ''} />
                                {checkingPaymentId === p.id ? 'Checking...' : 'Check Provider'}
                              </button>
                            )}
                            <button
                              onClick={() => setTimelinePayment(p)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border-color)',
                                background: 'var(--surface)',
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Clock size={12} /> Timeline
                            </button>
                            {p.receiptId && (
                              <button
                                onClick={() => openReceiptModal(p.receiptId!)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--surface)',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Receipt size={12} /> Receipt
                              </button>
                            )}
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

      {/* ── TAB 5: OVERDUE COLLECTION FOLLOW-UPS & REMINDERS (SECTION 7) ── */}
      {activeTab === 'FOLLOW_UP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: 'rgba(220, 38, 38, 0.05)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={18} color="#dc2626" />
              <div>
                <strong style={{ fontSize: 13, color: '#dc2626' }}>Parent Dues Communication & Follow-up Workspace:</strong>
                <span style={{ fontSize: 13, color: 'var(--foreground)', marginLeft: 6 }}>
                  Directly contact parents via phone, WhatsApp, or formal email reminder. All communication events are automatically logged to the student&apos;s chronological timeline.
                </span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
              {followUps.length} Overdue Accounts
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student & Class</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Parent / Guardian Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Outstanding Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Overdue Days</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Follow-up Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Last Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Direct Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                      <CheckCircle2 size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      All accounts are in good standing! No overdue balances found.
                    </td>
                  </tr>
                ) : (
                  followUps.map((f) => (
                    <tr key={f.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{f.studentName}</div>
                        <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>
                          {f.admissionNo} • {f.classroomName}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{f.parentName}</div>
                        <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>
                          {f.parentPhone || 'No phone'} {f.parentEmail ? `• ${f.parentEmail}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>
                        ₹{parseFloat(f.totalOutstandingRupees).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: f.daysOverdue > 30 ? '#fee2e2' : '#fef3c7',
                            color: f.daysOverdue > 30 ? '#b91c1c' : '#b45309',
                          }}
                        >
                          {f.daysOverdue} days
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'var(--surface-subtle)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {f.followUpStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--foreground-muted)' }}>
                        {f.lastContactDate ? new Date(f.lastContactDate).toLocaleDateString('en-IN') : 'Never'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {f.parentPhone && (
                            <>
                              <a
                                href={`tel:${f.parentPhone}`}
                                title="Call Parent"
                                style={{
                                  padding: 6,
                                  borderRadius: 6,
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--surface)',
                                  color: 'var(--foreground)',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Phone size={13} />
                              </a>
                              <a
                                href={`https://wa.me/${f.parentPhone.replace(/[^0-9]/g, '')}?text=Dear%20Parent,%20kindly%20note%20that%20an%20outstanding%20fee%20balance%20of%20INR%20${f.totalOutstandingRupees}%20is%20due%20for%20${encodeURIComponent(f.studentName)}.%20Please%20contact%20school%20office.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Send WhatsApp"
                                style={{
                                  padding: 6,
                                  borderRadius: 6,
                                  border: '1px solid #16a34a',
                                  background: 'rgba(22, 163, 74, 0.1)',
                                  color: '#16a34a',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <MessageSquare size={13} />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => setReminderModal(f)}
                            title="Preview & Send Email Reminder"
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              border: '1px solid #2563eb',
                              background: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Mail size={13} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setFollowUpModal(f)
                            setFollowUpForm({
                              status: f.followUpStatus === 'NOT_CONTACTED' ? 'CONTACTED' : f.followUpStatus,
                              notes: f.followUpNotes || '',
                              nextFollowUpDate: '',
                            })
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border-color)',
                            background: 'var(--surface)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Log Follow-up
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: 12 FINANCIAL REPORTS & EXPORTS (SECTION 9) ── */}
      {activeTab === 'REPORTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              background: 'var(--surface)',
              padding: 16,
              borderRadius: 10,
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Select Report:</span>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--foreground)',
                }}
              >
                <option value="DAILY_COLLECTION">1. Daily Collection Report</option>
                <option value="MONTHLY_COLLECTION">2. Monthly Collection Report</option>
                <option value="OUTSTANDING_FEES">3. Outstanding Fees Report</option>
                <option value="OVERDUE_AGING">4. Overdue Aging Report</option>
                <option value="PAYMENT_MODE">5. Payment Mode Breakdown Report</option>
                <option value="DEPOSITS_HELD">6. Refundable Deposits Held Report</option>
                <option value="REFUNDS">7. Deposit Refunds Ledger Report</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (reportRows.length === 0) return
                const headers = Object.keys(reportRows[0])
                const rows = reportRows.map((r) => headers.map((h) => String(r[h] ?? '')))
                handleExportCSV(selectedReportType, headers, rows)
              }}
              disabled={reportRows.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #059669',
                background: '#059669',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: reportRows.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={15} /> Export Report (CSV / Excel)
            </button>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {loadingReport ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                Compiling financial report...
              </div>
            ) : reportRows.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                No records matching criteria for this report.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                    {Object.keys(reportRows[0]).map((k) => (
                      <th key={k} style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {Object.keys(row).map((k) => (
                        <td key={k} style={{ padding: '12px 16px' }}>
                          {String(row[k] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 7: COMPLETE FINANCIAL AUDIT TRAIL (SECTION 10) ── */}
      {activeTab === 'AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.05)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ShieldCheck size={18} color="#059669" />
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>
              <strong>Immutable Audit Log:</strong> Every financial mutation (fee plan activation, schedule generation, payment recording, receipt issuance, refund, and deposit adjustment) is permanently recorded with actor identity and timestamp.
            </span>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Entity</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Summary</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Authorized Actor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)' }}>
                      No financial audit records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'var(--surface-subtle)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{log.entity}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--foreground)' }}>{log.summary}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{log.actorName}</div>
                        <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{log.actorRole}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--foreground-muted)' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 8: BULK SPREADSHEET IMPORT (TAB 5) ── */}
      {activeTab === 'IMPORT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SpreadsheetImportWorkspace
            module="FEES"
            onSuccess={() => {
              loadInitialData()
              loadTabData()
            }}
          />
        </div>
      )}

      {/* ── MODAL: ACTIVATE & APPLY STRUCTURE TO CLASSROOM ── */}
      {showApplyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 540,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
              Apply Fee Structure to Classroom
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--foreground-muted)' }}>
              Structure: <strong>{showApplyModal.name}</strong> ({showApplyModal.items.length} fee heads)
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Target Classroom
              </label>
              <select
                value={applyClassroomId}
                onChange={(e) => setApplyClassroomId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  color: 'var(--foreground)',
                }}
              >
                <option value="">All Eligible Classrooms in Program</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(5, 150, 105, 0.08)',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                fontSize: 12,
                color: 'var(--foreground)',
                marginBottom: 20,
              }}
            >
              <strong>Idempotent Application Guarantee:</strong>
              <div style={{ marginTop: 4 }}>
                The engine will generate student fee schedules and installment records only for newly eligible enrolled students. Already scheduled installments will not be duplicated.
              </div>
            </div>

            {applyResult && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <strong>Success!</strong> Applied to {applyResult.appliedCount} student(s) ({applyResult.schedulesCreated} schedules created, {applyResult.skippedCount} already assigned).
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowApplyModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {applyResult ? 'Close' : 'Cancel'}
              </button>
              {!applyResult && (
                <button
                  onClick={handleApplyStructure}
                  disabled={applying}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#059669',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: applying ? 'not-allowed' : 'pointer',
                  }}
                >
                  {applying ? 'Applying...' : 'Confirm Application'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COLLECT PAYMENT ── */}
      {collectPaymentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 480,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
              Collect Fee Payment
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--foreground-muted)' }}>
              Student: <strong>{collectPaymentModal.studentName}</strong> ({collectPaymentModal.admissionNo})
            </p>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Installment & Scheduled Due
                </label>
                <div style={{ padding: '8px 12px', background: 'var(--surface-subtle)', borderRadius: 6, fontSize: 13 }}>
                  {collectPaymentModal.itemName} ({collectPaymentModal.period}) — Remaining: <strong>₹{collectPaymentModal.remainingRupees}</strong>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amountRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountRupees: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#059669',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Payment Mode *
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface)',
                    fontSize: 13,
                  }}
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789 or Cheque #98765"
                  value={paymentForm.transactionRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setCollectPaymentModal(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#059669',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: recordingPayment ? 'not-allowed' : 'pointer',
                  }}
                >
                  {recordingPayment ? 'Recording...' : 'Record Payment & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: OFFICIAL RECEIPT VIEWER & PRINT (SECTION 3.6 & 6) ── */}
      {receiptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              color: '#0f172a',
              width: '100%',
              maxWidth: 620,
              borderRadius: 12,
              padding: 32,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {receiptModal.tenant?.name || 'PreOne Academy'}
                </h2>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {receiptModal.tenant?.address || 'Main Campus, PreOne Education District'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Phone: {receiptModal.tenant?.phone || '+91 98765 43210'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'inline-block', padding: '4px 10px', background: '#059669', color: '#fff', fontWeight: 700, borderRadius: 4, fontSize: 12 }}>
                  FEE RECEIPT
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                  Receipt #: {receiptModal.receiptNumber}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Date: {new Date(receiptModal.issuedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 14, background: '#f8fafc', borderRadius: 8, marginBottom: 20, fontSize: 12 }}>
              <div>
                <div style={{ color: '#64748b', fontSize: 11 }}>STUDENT DETAILS</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {receiptModal.payment?.student ? `${receiptModal.payment.student.firstName} ${receiptModal.payment.student.lastName || ''}`.trim() : '—'}
                </div>
                <div>Admission No: {receiptModal.payment?.student?.admissionNo || '—'}</div>
                <div>Classroom: {receiptModal.payment?.student?.currentClassroom?.name || 'Unassigned'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: 11 }}>PAYMENT METADATA</div>
                <div>Payment Mode: <strong>{receiptModal.payment?.method}</strong></div>
                <div>Ref / UTR: {receiptModal.payment?.transactionRef || 'N/A'}</div>
                <div>Payment ID: {receiptModal.payment?.paymentNumber}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12, marginBottom: 24 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '8px 0' }}>Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount Paid (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0' }}>Fee Settlement via {receiptModal.payment?.method}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700 }}>
                    ₹{(receiptModal.amountCents / 100).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 24, marginTop: 24 }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                <div>• This is an electronically generated valid receipt.</div>
                <div>• Retain this receipt for your records.</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px dashed #94a3b8', width: 140, marginBottom: 6 }}></div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Authorized Signatory</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 }}>
              <button
                onClick={() => setReceiptModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PROCESS REFUND ── */}
      {refundModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 480,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
              Process Deposit Refund
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--foreground-muted)' }}>
              Student: <strong>{refundModal.studentName}</strong> • Available: <strong>₹{refundModal.remainingRupees}</strong>
            </p>

            <form onSubmit={handleProcessRefund} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Refund Amount (₹) * (Max ₹{refundModal.remainingRupees})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={parseFloat(refundModal.remainingRupees)}
                  required
                  value={refundForm.amountRupees}
                  onChange={(e) => setRefundForm({ ...refundForm, amountRupees: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#059669',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Refund Payment Mode *
                </label>
                <select
                  value={refundForm.refundMode}
                  onChange={(e) => setRefundForm({ ...refundForm, refundMode: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Bank Reference / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN987654321"
                  value={refundForm.reference}
                  onChange={(e) => setRefundForm({ ...refundForm, reference: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Refund Reason / Authority Note *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Program completion / Academic year graduation clearance"
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setRefundModal(null)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {processingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADJUST DEPOSIT ── */}
      {adjustModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 480,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
              Adjust Deposit Balance
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--foreground-muted)' }}>
              Deduct against damages or arrears for <strong>{adjustModal.studentName}</strong> (Available: ₹{adjustModal.remainingRupees})
            </p>

            <form onSubmit={handleAdjustDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Adjustment Reason Category *
                </label>
                <select
                  value={adjustForm.reasonType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reasonType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                >
                  <option value="DAMAGED_PROPERTY">Damaged School Property / Equipment</option>
                  <option value="UNRETURNED_BOOKS_KITS">Unreturned Books / Welcome Kits</option>
                  <option value="LIBRARY_LOSS">Library Book Loss</option>
                  <option value="FEE_ARREARS">Adjustment against Outstanding Fee Arrears</option>
                  <option value="OTHER_AUTHORIZED">Other Authorized Deduction</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Deduction Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={parseFloat(adjustModal.remainingRupees)}
                  required
                  value={adjustForm.amountRupees}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amountRupees: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 14, fontWeight: 700, color: '#d97706' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Itemized Explanation / Incident Reference *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Broken tablet screen replacement during Art activity on 15 Oct"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAdjust}
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#d97706', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {processingAdjust ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: STUDENT FINANCIAL LEDGER 360° (SECTION 8) ── */}
      {ledgerStudentId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 720,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {loadingLedger || !studentLedger ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                Loading student financial ledger...
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700 }}>
                      {studentLedger.student?.name}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                      Admission: <strong>{studentLedger.student?.admissionNo}</strong> • Classroom: {studentLedger.student?.classroom}
                    </div>
                  </div>
                  <button
                    onClick={() => setLedgerStudentId(null)}
                    style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--foreground-muted)' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Total Billed</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>₹{studentLedger.summary?.totalBilledRupees?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Total Paid</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>₹{studentLedger.summary?.totalPaidRupees?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Outstanding</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#d97706' }}>₹{studentLedger.summary?.totalOutstandingRupees?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Overdue</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>₹{studentLedger.summary?.totalOverdueRupees?.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Invoices & Billing Schedule</h4>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                    <thead style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Invoice #</th>
                        <th style={{ padding: '8px 12px' }}>Title</th>
                        <th style={{ padding: '8px 12px' }}>Due Date</th>
                        <th style={{ padding: '8px 12px' }}>Total</th>
                        <th style={{ padding: '8px 12px' }}>Balance</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentLedger.invoices?.map((inv: any) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                          <td style={{ padding: '8px 12px' }}>{inv.title}</td>
                          <td style={{ padding: '8px 12px' }}>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                          <td style={{ padding: '8px 12px' }}>₹{inv.totalRupees}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: parseFloat(inv.balanceRupees) > 0 ? '#dc2626' : '#16a34a' }}>
                            ₹{inv.balanceRupees}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{inv.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setLedgerStudentId(null)}
                    style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 13, cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: LOG PARENT FOLLOW-UP (SECTION 7.1) ── */}
      {followUpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div style={{ background: 'var(--surface)', width: '100%', maxWidth: 460, borderRadius: 12, padding: 24, border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
              Record Fee Follow-up
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--foreground-muted)' }}>
              Account: <strong>{followUpModal.studentName}</strong> • Parent: {followUpModal.parentName}
            </p>

            <form onSubmit={handleSaveFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Follow-up Status *
                </label>
                <select
                  value={followUpForm.status}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                >
                  <option value="CONTACTED">Contacted (Spoke with Parent)</option>
                  <option value="PROMISED_TO_PAY">Promised to Pay (Commitment Given)</option>
                  <option value="REMINDER_SENT">Reminder Dispatched</option>
                  <option value="ESCALATED">Escalated to Management</option>
                  <option value="RESOLVED">Resolved (Paid in full)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Conversation Notes / Agreed Date *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Parent confirmed salary deposit on 10th and will settle pending tuition installment online."
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Next Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setFollowUpModal(null)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFollowUp}
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingFollowUp ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PREVIEW EMAIL REMINDER (SECTION 7.2) ── */}
      {reminderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div style={{ background: 'var(--surface)', width: '100%', maxWidth: 540, borderRadius: 12, padding: 24, border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>
              Preview Official Fee Reminder Email
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--foreground-muted)' }}>
              Dispatches formal payment reminder to <strong>{reminderModal.parentEmail || reminderModal.parentName}</strong>
            </p>

            <div
              style={{
                padding: 16,
                background: 'var(--surface-subtle)',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              <div><strong>Subject:</strong> Urgent Fee Reminder — Outstanding Dues for {reminderModal.studentName}</div>
              <div style={{ margin: '12px 0 0 0', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                Dear {reminderModal.parentName},<br /><br />
                This is a friendly reminder from PreOne Academy regarding the pending fee balance of <strong>₹{reminderModal.totalOutstandingRupees}</strong> for your child <strong>{reminderModal.studentName}</strong> (Admission No: {reminderModal.admissionNo}).<br /><br />
                The installment has been overdue by <strong>{reminderModal.daysOverdue} days</strong>. Kindly arrange settlement through the online Parent Portal or school front desk accounts counter at your earliest convenience.<br /><br />
                Warm regards,<br />
                <strong>Finance & Accounts Office</strong><br />
                PreOne Preschool Management
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setReminderModal(null)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: sendingReminder ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Send size={14} /> {sendingReminder ? 'Sending...' : 'Send Reminder Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW STRUCTURE DETAILS ── */}
      {viewStructureModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div style={{ background: 'var(--surface)', width: '100%', maxWidth: 580, borderRadius: 12, padding: 24, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700 }}>
                  {viewStructureModal.name}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                  Code: <strong>{viewStructureModal.code || viewStructureModal.id.slice(0, 8)}</strong> • Academic Year: {viewStructureModal.academicSession?.name || 'All'}
                </div>
              </div>
              <button onClick={() => setViewStructureModal(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--foreground-muted)' }}>
                ✕
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Fee Head</th>
                  <th style={{ padding: '8px 12px' }}>Type</th>
                  <th style={{ padding: '8px 12px' }}>Frequency</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {viewStructureModal.items.map((i) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{i.name}</td>
                    <td style={{ padding: '8px 12px' }}>{i.feeType}</td>
                    <td style={{ padding: '8px 12px' }}>{i.frequency}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      ₹{(i.amountCents / 100).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewStructureModal(null)}
                style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PAYMENT LIFECYCLE TIMELINE ── */}
      {timelinePayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 580,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="#0284c7" />
                  Transaction Lifecycle Timeline
                </h3>
                <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                  Ref: <strong>{timelinePayment.paymentNumber}</strong>
                  {timelinePayment.transactionRef ? ` • UTR: ${timelinePayment.transactionRef}` : ''}
                </div>
              </div>
              <button
                onClick={() => setTimelinePayment(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--foreground-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Summary Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                marginBottom: 20,
                fontSize: 12,
              }}
            >
              <div>
                <div style={{ color: 'var(--foreground-muted)', fontSize: 11 }}>STUDENT</div>
                <div style={{ fontWeight: 600 }}>{timelinePayment.studentName}</div>
                <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{timelinePayment.admissionNo}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--foreground-muted)', fontSize: 11 }}>AMOUNT & STATUS</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>
                  ₹{parseFloat(timelinePayment.amountRupees).toLocaleString('en-IN')}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: timelinePayment.status === 'SUCCESS' ? '#dcfce7' : '#fee2e2',
                    color: timelinePayment.status === 'SUCCESS' ? '#15803d' : '#b91c1c',
                  }}
                >
                  {timelinePayment.status} ({timelinePayment.method})
                </span>
              </div>
            </div>

            {/* Event Timeline */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--foreground)' }}>
                Audited Event History
              </h4>
              {(() => {
                let parsed: any = {}
                try {
                  parsed = timelinePayment.notes ? JSON.parse(timelinePayment.notes) : {}
                } catch {
                  parsed = { rawNotes: timelinePayment.notes }
                }
                const events: any[] = Array.isArray(parsed.timeline) ? parsed.timeline : []

                if (events.length === 0) {
                  return (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--foreground-muted)', fontSize: 12, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                      No structured gateway timeline records found for this entry.
                      {parsed.rawNotes && <div style={{ marginTop: 8, fontSize: 11 }}>Note: {parsed.rawNotes}</div>}
                    </div>
                  )
                }

                return (
                  <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 9,
                        top: 6,
                        bottom: 6,
                        width: 2,
                        background: 'var(--border-color)',
                      }}
                    />
                    {events.map((evt, idx) => {
                      const isSuccess = ['VERIFIED_SUCCESS', 'RECEIPT_ISSUED'].includes(evt.event)
                      const isFail = ['FAILED'].includes(evt.event)
                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: -24,
                              top: 2,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: isSuccess ? '#16a34a' : isFail ? '#dc2626' : '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </div>
                          <div style={{ background: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: isSuccess ? '#15803d' : isFail ? '#b91c1c' : 'var(--foreground)' }}>
                                {evt.event}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>
                                {evt.at ? new Date(evt.at).toLocaleString('en-IN') : '—'}
                              </span>
                            </div>
                            {evt.orderId && <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Gateway Order: {evt.orderId}</div>}
                            {evt.gatewayPaymentId && <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Gateway Payment ID: {evt.gatewayPaymentId}</div>}
                            {evt.receiptNumber && <div style={{ fontSize: 11, color: '#0891b2', fontWeight: 600 }}>Receipt Issued: {evt.receiptNumber}</div>}
                            {evt.reason && <div style={{ fontSize: 11, color: '#dc2626' }}>Failure Reason: {evt.reason}</div>}
                            {evt.by && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Triggered by: {evt.by}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTimelinePayment(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PAYMENT SUPPORT ISSUES WORKSPACE ── */}
      {supportIssuesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 720,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={18} color="#c2410c" />
                  Payment Exceptions & Support Tickets
                </h3>
                <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                  Manage parent-reported payment discrepancies, unconfirmed bank deductions, and escalations.
                </div>
              </div>
              <button
                onClick={() => setSupportIssuesModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--foreground-muted)' }}
              >
                ✕
              </button>
            </div>

            {loadingIssues ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--foreground-muted)' }}>Loading support cases...</div>
            ) : supportIssues.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)', background: 'var(--surface-subtle)', borderRadius: 8 }}>
                No open payment issues or disputes found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {supportIssues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      padding: 14,
                      background: 'var(--surface-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0284c7' }}>{issue.id}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 600,
                          background: issue.status === 'RESOLVED' ? '#dcfce7' : '#ffedd5',
                          color: issue.status === 'RESOLVED' ? '#15803d' : '#c2410c',
                        }}
                      >
                        {issue.status} • {issue.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      Student: {issue.studentName || issue.studentId} • Amount: ₹{(issue.amountCents / 100).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 8 }}>
                      Reported Issue: <em>&ldquo;{issue.reportedIssue}&rdquo;</em>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Logged by {issue.parentName} on {new Date(issue.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setSupportIssuesModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: WEBHOOK INGESTION AUDIT LOGS ── */}
      {webhooksModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: 760,
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="#0284c7" />
                  Provider Webhook Ingestion Logs
                </h3>
                <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                  Audit log of raw incoming webhook notifications from Razorpay, Cashfree, and PayU.
                </div>
              </div>
              <button
                onClick={() => setWebhooksModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--foreground-muted)' }}
              >
                ✕
              </button>
            </div>

            {loadingWebhooks ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--foreground-muted)' }}>Loading webhook records...</div>
            ) : webhookEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--foreground-muted)', background: 'var(--surface-subtle)', borderRadius: 8 }}>
                No webhook notifications recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {webhookEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      padding: 12,
                      background: 'var(--surface-subtle)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                        {ev.provider} • {ev.eventType}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 600,
                          background: ev.status === 'PROCESSED' ? '#dcfce7' : ev.status === 'DUPLICATE' ? '#eff6ff' : '#fee2e2',
                          color: ev.status === 'PROCESSED' ? '#15803d' : ev.status === 'DUPLICATE' ? '#1d4ed8' : '#b91c1c',
                        }}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <div style={{ color: 'var(--foreground-muted)', fontSize: 11, marginBottom: 4 }}>
                      Event ID: <code>{ev.providerEventId}</code> • Signature: {ev.signatureValid ? '✅ Verified' : '❌ Invalid'}
                    </div>
                    {ev.receiptNumber && (
                      <div style={{ color: '#0891b2', fontWeight: 600, fontSize: 11 }}>Issued Receipt: {ev.receiptNumber}</div>
                    )}
                    {ev.error && <div style={{ color: '#dc2626', fontSize: 11 }}>Error: {ev.error}</div>}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                      Received: {new Date(ev.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setWebhooksModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
