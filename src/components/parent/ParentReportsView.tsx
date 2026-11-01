'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FileText,
  Download,
  Eye,
  Award,
  CalendarCheck,
  IndianRupee,
  Sparkles,
  Printer,
  Search,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { PageHead, StatusBadge, EmptyState, Skeleton, KpiTile } from '@/components/preone/ui'
import { ParentStudentSelector } from '@/components/parent/ParentStudentSelector'
import { useParentStudents } from '@/lib/parent/use-parent-students'
import { PdfViewerModal } from '@/components/preone/PdfViewerModal'
import { fmtDate, inr } from '@/lib/format'

interface DocumentItem {
  id: string
  title: string
  documentType: string
  fileName: string
  fileUrl?: string | null
  createdAt: string
  term?: string | null
  studentReportCards?: { id: string; term: string }[]
}

interface AttendanceSummary {
  rate: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalTracked: number
}

interface FeeSummary {
  totalDue: number
  totalPaid: number
  balance: number
}

export function ParentReportsView({ session }: { session?: any }) {
  const { students, selectedStudentId, selectedStudent, selectStudent, loading: loadingStudents } = useParentStudents()

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [reportCards, setReportCards] = useState<any[]>([])
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchReportsForChild = useCallback(async (studentId: string) => {
    try {
      setLoading(true)
      setError(null)

      const [resDocs, resRC, resAtt, resFees] = await Promise.all([
        fetch(`/api/v1/parent/documents?studentId=${encodeURIComponent(studentId)}`)
          .then((r) => r.json())
          .catch(() => ({ success: false, data: [] })),
        fetch(`/api/v1/academics/report-cards?studentId=${encodeURIComponent(studentId)}`)
          .then((r) => r.json())
          .catch(() => ({ success: false, data: { reportCards: [] } })),
        fetch(`/api/v1/parent/attendance?studentId=${encodeURIComponent(studentId)}&period=all`)
          .then((r) => r.json())
          .catch(() => ({ success: false })),
        fetch('/api/v1/parent/fees')
          .then((r) => r.json())
          .catch(() => ({ success: false })),
      ])

      if (resDocs.success && Array.isArray(resDocs.data)) {
        setDocuments(resDocs.data)
      } else {
        setDocuments([])
      }

      if (resRC.success && resRC.data?.reportCards) {
        setReportCards(resRC.data.reportCards)
      } else {
        setReportCards([])
      }

      if (resAtt.success && resAtt.data?.summary) {
        setAttendance(resAtt.data.summary)
      } else {
        setAttendance(null)
      }

      if (resFees.success && Array.isArray(resFees.data)) {
        const childFee = resFees.data.find((c: any) => c.childId === studentId) || resFees.data[0]
        if (childFee) {
          setFeeSummary({
            totalDue: childFee.totalDue || 0,
            totalPaid: childFee.totalPaid || 0,
            balance: childFee.remaining || 0,
          })
        } else {
          setFeeSummary(null)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading student reports.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      fetchReportsForChild(selectedStudentId)
    }
  }, [selectedStudentId, fetchReportsForChild])

  // Filter documents by search
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter((d) => d.title.toLowerCase().includes(q) || d.documentType.toLowerCase().includes(q))
  }, [documents, searchQuery])

  // Split into report cards vs certificates
  const publishedReportCards = useMemo(() => {
    return filteredDocuments.filter((d) => d.documentType.includes('REPORT_CARD') || d.documentType.includes('EVALUATION'))
  }, [filteredDocuments])

  const officialCertificates = useMemo(() => {
    return filteredDocuments.filter((d) => !d.documentType.includes('REPORT_CARD') && !d.documentType.includes('EVALUATION'))
  }, [filteredDocuments])

  return (
    <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Page Header & Student Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <PageHead
            title="Student Reports & Documents"
            subtitle="View and download published term report cards, attendance statements, and official certificates."
          />
        </div>
        <div>
          <ParentStudentSelector
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={selectStudent}
          />
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">{publishedReportCards.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Published Report Cards</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">{officialCertificates.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Certificates & ID Dossiers</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">
              {attendance ? `${Math.round(attendance.rate)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Attendance Health Rate</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
            <IndianRupee size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">
              {feeSummary ? inr(feeSummary.balance) : '—'}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Outstanding Fee Balance</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-44 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
          <div className="h-44 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── 1. Published Term Report Cards ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText size={16} className="text-purple-600 dark:text-purple-400" />
                <span>Term Report Cards & Academic Progress</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Published evaluation dossiers for {selectedStudent?.name || 'child'}</span>
            </div>

            {publishedReportCards.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No term report cards have been published yet for this student. Term report cards will appear here once finalized by school leadership.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {publishedReportCards.map((doc) => (
                  <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground text-[13px]">{doc.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium">
                          {doc.documentType}
                        </span>
                        <span>• Generated: {fmtDate(doc.createdAt)}</span>
                        <span>• {doc.fileName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: doc.title,
                            url: doc.fileUrl || `/api/v1/academics/report-cards/${doc.id}/render`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Eye size={13} />
                        <span>View Document</span>
                      </button>

                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Download size={13} />
                          <span>Download PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 2. Official Certificates & Identity Dossiers ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award size={16} className="text-amber-500" />
                <span>Official Certificates & Documents</span>
              </div>
              <span className="text-[11px] text-muted-foreground">School-issued credentials, bonafide & admission certificates</span>
            </div>

            {officialCertificates.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No official certificates or identity credentials generated for this student yet.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {officialCertificates.map((doc) => (
                  <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground text-[13px]">{doc.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                          {doc.documentType}
                        </span>
                        <span>• Issued: {fmtDate(doc.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: doc.title,
                            url: doc.fileUrl || `/api/v1/academics/report-cards/${doc.id}/render`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Document PDF Preview Modal ── */}
      {previewDoc && (
        <PdfViewerModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          pdfUrl={previewDoc.url}
          title={previewDoc.title}
        />
      )}
    </div>
  )
}
