'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Receipt,
  Plus,
  Search,
  Sliders,
  ExternalLink,
  Copy,
  Eye,
  Check,
  Star,
  FileText,
  Trash2,
  RefreshCw,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  CreditCard,
  Layers,
  HelpCircle,
  ArrowRight,
  Code2,
} from 'lucide-react'
import { KpiTile, EmptyState, StatusBadge } from '@/components/preone/ui'
import { Modal } from '@/components/preone/Modal'
import { useToast } from '@/components/preone/Toast'
import { inr, fmtDate } from '@/lib/format'
import { APPROVED_TEMPLATE_FIELDS, FieldDefinition } from '@/lib/templates/field-registry'
import { TEMPLATE_PRESETS } from '@/lib/templates/presets'
import { PageFormat } from '@/lib/templates/types'

interface ReceiptTemplateItem {
  id: string
  name: string
  type: string
  isDefault: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  pageSize: PageFormat
  elementsCount: number
  publishedAt: string | null
  updatedAt: string
  createdAt: string
  definition: any
}

export function ReceiptTemplateStudio() {
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ReceiptTemplateItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<ReceiptTemplateItem | null>(null)
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false)
  const [selectedFieldDomain, setSelectedFieldDomain] = useState<string>('ALL')

  // Form State for Quick Customizer
  const [customForm, setCustomForm] = useState({
    name: '',
    presetKey: 'FEE_RECEIPT_SLEEK',
    pageSize: 'A4_PORTRAIT' as PageFormat,
    orientation: 'portrait' as 'portrait' | 'landscape',
    // Sections toggles
    showLogo: true,
    showBranchName: true,
    showAddress: true,
    showGstNumber: true,
    showAdmissionNo: true,
    showProgram: true,
    showGuardianName: true,
    showInvoiceRef: true,
    showPaymentMode: true,
    showTransactionRef: true,
    showBalance: true,
    showAmountInWords: true,
    showSignatureBlock: true,
    showSchoolStamp: true,
    showTerms: true,
    receiptTitle: 'OFFICIAL FEE RECEIPT',
    termsText: '1. Fees once paid are non-refundable unless specified as caution deposit.\n2. Please preserve this receipt for tax and academic records.',
    thankYouMessage: 'Thank you for partnering in your child’s educational journey.',
    themeColor: '#047857', // Emerald
    fontFamily: 'Inter',
  })

  // Load fee receipt templates from database
  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/templates?type=FEE_RECEIPT', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.success) {
        setTemplates(data.data?.items || [])
      } else {
        toast.error('Failed to load templates', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  // Top KPI Metrics
  const totalCount = templates.length
  const activeCount = templates.filter((t) => t.status === 'PUBLISHED').length
  const draftCount = templates.filter((t) => t.status === 'DRAFT').length
  const defaultTemplate = templates.find((t) => t.isDefault) || templates[0]

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates
    const q = searchTerm.toLowerCase()
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, searchTerm])

  // Filter approved field registry
  const filteredFields = useMemo(() => {
    return APPROVED_TEMPLATE_FIELDS.filter((f) => {
      if (selectedFieldDomain !== 'ALL' && f.domain !== selectedFieldDomain) return false
      return true
    })
  }, [selectedFieldDomain])

  // Actions
  const handleSetDefault = async (t: ReceiptTemplateItem) => {
    try {
      const res = await fetch(`/api/v1/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Default Template Set', `"${t.name}" is now the active default receipt template`)
        loadTemplates()
      } else {
        toast.error('Failed', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  const handlePublish = async (t: ReceiptTemplateItem) => {
    try {
      const res = await fetch(`/api/v1/templates/${t.id}/publish`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Template Published', `"${t.name}" is now published and active`)
        loadTemplates()
      } else {
        toast.error('Failed to publish', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  const handleDuplicate = async (t: ReceiptTemplateItem) => {
    try {
      const res = await fetch(`/api/v1/templates/${t.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Template Duplicated', `Created "${data.data?.name || 'Copy'}" in Drafts`)
        loadTemplates()
      } else {
        toast.error('Failed to duplicate', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  const handleDelete = async (t: ReceiptTemplateItem) => {
    if (!window.confirm(`Are you sure you want to delete template "${t.name}"?`)) return
    try {
      const res = await fetch(`/api/v1/templates/${t.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Template Deleted', `"${t.name}" removed`)
        loadTemplates()
      } else {
        toast.error('Delete Failed', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  const handleCreateNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customForm.name.trim()) {
      toast.error('Name Required', 'Please enter a name for the receipt template')
      return
    }

    try {
      const res = await fetch('/api/v1/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customForm.name.trim(),
          type: 'FEE_RECEIPT',
          presetKey: customForm.presetKey,
          format: customForm.pageSize,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.data?.id) {
        toast.success('Template Created', `"${customForm.name}" created in Template Studio!`)
        setShowCreateModal(false)
        loadTemplates()
        // Open Template Studio
        router.push(`/app/setup/templates/${data.data.id}`)
      } else {
        toast.error('Failed to create template', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  const copyToken = (key: string) => {
    const token = `{{${key}}}`
    navigator.clipboard.writeText(token)
    toast.success('Copied Placeholder', `${token} copied to clipboard`)
  }

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          label="Total Templates"
          value={totalCount.toString()}
          meta="Fee receipt designs"
          icon={<Receipt className="size-5 text-indigo-600" />}
          iconClass="ic-purple"
        />
        <KpiTile
          label="Active / Published"
          value={activeCount.toString()}
          meta="Ready for automated billing"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          iconClass="ic-emerald"
        />
        <KpiTile
          label="Draft Templates"
          value={draftCount.toString()}
          meta="Under customization"
          icon={<Sliders className="size-5 text-amber-600" />}
          iconClass="ic-amber"
        />
        <KpiTile
          label="Default Template"
          value={defaultTemplate?.name ? defaultTemplate.name.slice(0, 18) + (defaultTemplate.name.length > 18 ? '...' : '') : 'None'}
          meta="Used on payment receipts"
          icon={<Star className="size-5 text-amber-500 fill-amber-500/20" />}
          iconClass="ic-blue"
        />
      </div>

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setFieldDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Code2 className="size-3.5 text-indigo-500" />
            <span>Field Registry Tokens</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCustomForm({
                name: `Fee Receipt — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                presetKey: 'FEE_RECEIPT_SLEEK',
                pageSize: 'A4_PORTRAIT',
                orientation: 'portrait',
                showLogo: true,
                showBranchName: true,
                showAddress: true,
                showGstNumber: true,
                showAdmissionNo: true,
                showProgram: true,
                showGuardianName: true,
                showInvoiceRef: true,
                showPaymentMode: true,
                showTransactionRef: true,
                showBalance: true,
                showAmountInWords: true,
                showSignatureBlock: true,
                showSchoolStamp: true,
                showTerms: true,
                receiptTitle: 'OFFICIAL FEE RECEIPT',
                termsText: '1. Fees once paid are non-refundable unless specified as caution deposit.\n2. Please preserve this receipt for tax and academic records.',
                thankYouMessage: 'Thank you for partnering in your child’s educational journey.',
                themeColor: '#047857',
                fontFamily: 'Inter',
              })
              setShowCreateModal(true)
            }}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Create Receipt Template</span>
          </button>
        </div>
      </div>

      {/* Templates Table / List */}
      {!filteredTemplates.length ? (
        <EmptyState
          icon={<Receipt className="size-8 text-indigo-500" />}
          title="No Receipt Templates Found"
          message="Create your first fee receipt template or choose from our pre-designed templates."
          action={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
            >
              + Create Receipt Template
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto w-full min-w-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full min-w-[850px] text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="p-3.5">Template Name</th>
                <th className="p-3.5">Paper Format</th>
                <th className="p-3.5">Canvas Elements</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Last Updated</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTemplates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Receipt className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.isDefault && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold flex items-center gap-0.5">
                              <Star className="size-2.5 fill-amber-500" /> Default
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {t.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {t.pageSize || 'A4_PORTRAIT'}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono">
                    {t.elementsCount || t.definition?.elements?.length || 0} items
                  </td>
                  <td className="p-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400">
                    {fmtDate(t.updatedAt)}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(t)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1"
                        title="Quick Visual Preview"
                      >
                        <Eye className="size-3" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/app/setup/templates/${t.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
                        title="Edit in Visual Template Studio"
                      >
                        <Sliders className="size-3" />
                        <span>Open in Studio</span>
                      </button>

                      {!t.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(t)}
                          className="px-2 py-1 text-xs text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                          title="Make Default Receipt"
                        >
                          <Star className="size-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDuplicate(t)}
                        className="px-2 py-1 text-xs text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        title="Duplicate Template"
                      >
                        <Copy className="size-3.5" />
                      </button>

                      {t.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handlePublish(t)}
                          className="px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                          title="Publish Template"
                        >
                          Publish
                        </button>
                      )}

                      {!t.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-rose-600"
                          title="Delete Template"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE RECEIPT TEMPLATE MODAL */}
      {showCreateModal && (
        <Modal
          title="Create New Receipt Template"
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <form onSubmit={handleCreateNewTemplate} className="space-y-4 p-1 max-h-[80vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={customForm.name}
                onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                placeholder="e.g. Executive Fee Receipt (A4 Portrait)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Choose Base Preset */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Starting Layout & Paper Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'FEE_RECEIPT_SLEEK',
                    title: 'Sleek Minimalist (A4 Portrait)',
                    sub: 'Modern clean receipt with subtle borders & QR',
                    pageSize: 'A4_PORTRAIT',
                  },
                  {
                    id: 'FEE_RECEIPT',
                    title: 'Executive Half-A4 (A5 Landscape)',
                    sub: 'Two-per-page compact voucher format',
                    pageSize: 'RECEIPT_HALF_A4',
                  },
                  {
                    id: 'FEE_RECEIPT_INSTITUTIONAL',
                    title: 'Institutional Formal (A4 Portrait)',
                    sub: 'Traditional double border with crest & dual sign',
                    pageSize: 'A4_PORTRAIT',
                  },
                  {
                    id: 'FEE_RECEIPT_THERMAL',
                    title: 'Compact Thermal Roll (80 mm)',
                    sub: 'POS thermal printer receipt with monospace font',
                    pageSize: 'RECEIPT_THERMAL',
                  },
                ].map((item) => {
                  const isSel = customForm.presetKey === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setCustomForm({
                          ...customForm,
                          presetKey: item.id,
                          pageSize: item.pageSize as PageFormat,
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.title}</div>
                      <div className="text-[11px] opacity-75 mt-0.5">{item.sub}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-indigo-500" />
                Template Studio Integration
              </div>
              <p>
                Clicking <strong>"Create & Open in Studio"</strong> will initialize this design in PreOne Template Studio, where you can visually move, resize, format text, and map any student/payment token.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
              >
                <span>Create & Open in Studio</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VISUAL PREVIEW MODAL */}
      {previewTemplate && (
        <Modal
          title={`Receipt Preview — ${previewTemplate.name}`}
          open={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
        >
          <div className="space-y-4 p-2 max-h-[85vh] overflow-y-auto">
            {/* Sample Preview Disclaimer */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-amber-600" />
                SAMPLE VISUAL PREVIEW
              </span>
              <span className="text-[11px] opacity-75">Generated with simulated student transaction data</span>
            </div>

            {/* Rendered Preview Card */}
            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-lg space-y-4 max-w-xl mx-auto font-sans text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-3 border-slate-200">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">SUNSHINE MONTESSORI PRESCHOOL</h2>
                  <p className="text-[11px] text-slate-600">Main Campus • Pune, Maharashtra</p>
                  <p className="text-[10px] text-slate-500">Affiliation: CBSE-PRE-2026 • GSTIN: 27AABCS1429B1Z8</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider block">
                    PAID
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-1">REC-2026-0042</div>
                  <div className="text-[10px] text-slate-500">{fmtDate(new Date().toISOString())}</div>
                </div>
              </div>

              {/* Student & Bill Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px]">
                <div className="space-y-1">
                  <div>Student Name: <strong className="text-slate-900">Aarav Sharma</strong></div>
                  <div>Admission #: <span className="font-mono font-semibold">ADM-2026-018</span></div>
                  <div>Program: <span className="font-semibold">Nursery A (Morning Batch)</span></div>
                </div>
                <div className="space-y-1 text-right">
                  <div>Parent: <span className="font-semibold">Rajesh Sharma</span></div>
                  <div>Payment Mode: <strong className="text-emerald-700">UPI / QR</strong></div>
                  <div>Txn Ref: <span className="font-mono text-[10px]">UPI/9381029810/HDFC</span></div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Fee Head / Description</th>
                      <th className="p-2">Period</th>
                      <th className="p-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2 font-medium">Tuition & Learning Kit Fee</td>
                      <td className="p-2 text-slate-500">Term 1 (AY 2026-27)</td>
                      <td className="p-2 font-mono font-bold text-right">15,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Activity & Sensory Discovery</td>
                      <td className="p-2 text-slate-500">Annual</td>
                      <td className="p-2 font-mono font-bold text-right">3,000.00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={2} className="p-2 text-right">Total Paid:</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700">₹18,000.00</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in words */}
              <div className="text-[11px] text-slate-600 italic">
                Amount in Words: <strong>Rupees Eighteen Thousand Only</strong>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div className="space-y-0.5">
                  <p>1. Fees once paid are non-refundable unless specified as caution deposit.</p>
                  <p>2. Computer generated receipt — no signature required.</p>
                </div>
                <div className="text-right">
                  <div className="h-8 border-b border-slate-400 w-28 mb-1"></div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewTemplate.id
                  setPreviewTemplate(null)
                  router.push(`/app/setup/templates/${id}`)
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <Sliders className="size-3.5" />
                <span>Open in Visual Template Studio</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DYNAMIC FIELD REGISTRY TOKEN MODAL */}
      {fieldDrawerOpen && (
        <Modal
          title="Dynamic Field Tokens & Placeholders"
          open={fieldDrawerOpen}
          onClose={() => setFieldDrawerOpen(false)}
        >
          <div className="space-y-4 p-1 max-h-[80vh] overflow-y-auto text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Click any token to copy placeholder format <code>&#123;&#123;field.key&#125;&#125;</code> into your clipboard. These map dynamically to verified database values during receipt generation.
            </p>

            {/* Domain filter pills */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              {['ALL', 'FINANCE', 'STUDENT', 'SCHOOL', 'GUARDIAN'].map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setSelectedFieldDomain(dom)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    selectedFieldDomain === dom
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {dom}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredFields.map((f) => (
                <div
                  key={f.key}
                  onClick={() => copyToken(f.key)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        &#123;&#123;{f.key}&#125;&#125;
                      </code>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {f.domain}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                      {f.label} — <span className="text-slate-400">e.g. "{f.sampleValue}"</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
