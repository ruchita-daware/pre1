'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Package,
  BookOpen,
  Shirt,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  Boxes,
} from 'lucide-react'
import { PageHead, EmptyState, StatusBadge, Skeleton, KpiTile } from '@/components/preone/ui'
import { ParentStudentSelector } from '@/components/parent/ParentStudentSelector'
import { useParentStudents } from '@/lib/parent/use-parent-students'
import { fmtDate } from '@/lib/format'

interface AssignedItem {
  id: string
  issueNumber: string
  issueDate: string
  studentId: string
  studentName: string
  admissionNo: string
  classroomName: string | null
  itemName: string
  sku: string
  category: string
  description: string | null
  kitNumber: string | null
  bundleName: string | null
  quantityIssued: number
  quantityReturned: number
  pendingQuantity: number
  status: 'ISSUED' | 'RETURNED' | 'PARTIALLY_RETURNED'
  notes: string | null
}

interface InventorySummary {
  totalAssigned: number
  pendingReturns: number
  kitsIssued: number
}

export function ParentInventoryView({ session }: { session?: any }) {
  const { students, selectedStudentId, selectedStudent, selectStudent, loading: loadingStudents } = useParentStudents()
  const [items, setItems] = useState<AssignedItem[]>([])
  const [summary, setSummary] = useState<InventorySummary>({ totalAssigned: 0, pendingReturns: 0, kitsIssued: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  const fetchInventory = useCallback(async (studentId?: string | null) => {
    try {
      setLoading(true)
      setError(null)
      const url = studentId
        ? `/api/v1/parent/inventory?studentId=${encodeURIComponent(studentId)}`
        : '/api/v1/parent/inventory'
      const res = await fetch(url)
      const json = await res.json()
      if (json.success && json.data) {
        setItems(json.data.items || [])
        setSummary(json.data.summary || { totalAssigned: 0, pendingReturns: 0, kitsIssued: 0 })
      } else {
        setError(json.error?.message || 'Failed to load assigned inventory items.')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading assigned materials.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      fetchInventory(selectedStudentId)
    } else if (!loadingStudents && students.length === 0) {
      setLoading(false)
    }
  }, [selectedStudentId, loadingStudents, students.length, fetchInventory])

  // Extract unique categories for filter tabs
  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    return ['ALL', ...Array.from(set)]
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (categoryFilter !== 'ALL' && it.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = it.itemName.toLowerCase().includes(q)
        const matchSku = it.sku.toLowerCase().includes(q)
        const matchBundle = it.bundleName?.toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchBundle) return false
      }
      return true
    })
  }, [items, categoryFilter, searchQuery])

  return (
    <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Page Head & Student Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <PageHead
            title="Student Inventory & Materials"
            subtitle="View school-issued books, uniforms, kits, and learning supplies assigned to your child."
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

      {/* ── Summary KPI Tiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">{summary.totalAssigned}</div>
            <div className="text-xs text-muted-foreground font-medium">Total Items Issued</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Boxes size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">{summary.kitsIssued}</div>
            <div className="text-xs text-muted-foreground font-medium">Welcome & Activity Kits</div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <RotateCcw size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground font-mono">{summary.pendingReturns}</div>
            <div className="text-xs text-muted-foreground font-medium">Returnable Assets In Use</div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat === 'ALL' ? 'All Materials' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assigned item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchInventory(selectedStudentId)}
            className="p-1.5 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Refresh inventory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Assigned Items List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Package size={44} className="text-muted-foreground/60" />}
          title={searchQuery || categoryFilter !== 'ALL' ? 'No Matching Items' : 'No Items Assigned'}
          message={
            searchQuery || categoryFilter !== 'ALL'
              ? 'No items matched your current search or category filter.'
              : selectedStudent
              ? `No school supplies, books, or uniforms are currently recorded as issued to ${selectedStudent.name}.`
              : 'Select a linked child above to view their issued materials.'
          }
        />
      ) : (
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs divide-y divide-border/60">
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-5">Item & Kit Details</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2">Issue Date</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors items-center text-xs"
            >
              <div className="sm:col-span-5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  {item.category.toLowerCase().includes('uniform') ? (
                    <Shirt size={16} />
                  ) : item.category.toLowerCase().includes('book') ? (
                    <BookOpen size={16} />
                  ) : (
                    <Package size={16} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-[13px]">{item.itemName}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                    {item.bundleName && (
                      <span className="px-1.5 py-0.2 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                        Kit: {item.bundleName}
                      </span>
                    )}
                    <span className="font-mono text-[10px]">SKU: {item.sku}</span>
                    <span>• Ref: {item.issueNumber}</span>
                  </div>
                  {item.notes && <div className="text-[11px] text-muted-foreground italic mt-1">{item.notes}</div>}
                </div>
              </div>

              <div className="sm:col-span-2 text-muted-foreground font-medium">
                <span className="sm:hidden font-semibold text-foreground mr-1">Category:</span>
                {item.category}
              </div>

              <div className="sm:col-span-2 sm:text-center text-muted-foreground">
                <span className="sm:hidden font-semibold text-foreground mr-1">Qty:</span>
                <span className="font-mono font-semibold text-foreground">{item.quantityIssued}</span>
                {item.quantityReturned > 0 && (
                  <span className="text-[10px] text-muted-foreground block">
                    ({item.quantityReturned} returned)
                  </span>
                )}
              </div>

              <div className="sm:col-span-2 text-muted-foreground">
                <span className="sm:hidden font-semibold text-foreground mr-1">Date:</span>
                {fmtDate(item.issueDate)}
              </div>

              <div className="sm:col-span-1 sm:text-right">
                <StatusBadge
                  status={item.status}
                  label={
                    item.status === 'RETURNED'
                      ? 'Returned'
                      : item.status === 'PARTIALLY_RETURNED'
                      ? 'Partial'
                      : 'Issued'
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
