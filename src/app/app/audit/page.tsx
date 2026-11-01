'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  ScrollText,
  ShieldCheck,
  Download,
  Filter,
  Eye,
  Globe,
  Terminal,
  Search,
  RefreshCw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Clock,
  Layers,
  FileCode2,
} from 'lucide-react'
import { PageHead, EmptyState, Skeleton, KpiTile, GlobalKpiCard, KpiGrid } from '@/components/preone/ui'
import { SearchFilterBar, GlobalModuleNavigation, AUDIT_CATEGORY_CONFIG } from '@/components/preone'
import { DataTable, Column } from '@/components/preone/DataTable'
import { Modal } from '@/components/preone/Modal'
import { useToast } from '@/components/preone/Toast'
import { fmtDate, timeAgo } from '@/lib/format'

interface Log {
  id: string
  action: string
  entity: string
  entityId: string | null
  module: string | null
  summary: string | null
  severity: string
  actorId: string | null
  actorName: string | null
  actorRole: string | null
  branchId: string | null
  academicSessionId: string | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  oldValues: string | null
  newValues: string | null
  createdAt: string
}

interface Kpis {
  totalEvents: number
  todayEvents: number
  securityEvents: number
  criticalEvents: number
  failedActions: number
  exportEvents: number
}

const ACTION_CLS: Record<string, string> = {
  CREATE: 'b-success',
  UPDATE: 'b-info',
  DELETE: 'b-danger',
  LOGIN: 'b-primary',
  APPROVE: 'b-success',
  REJECT: 'b-danger',
  PUBLISH: 'b-orange',
  SCAN: 'b-pink',
  GATE_PICKUP: 'b-success',
  PICKUP_VERIFICATION_FAILED: 'b-danger',
  LOGIN_FAILED: 'b-danger',
  AUTHORIZATION_FAILED: 'b-danger',
  ROLE_CHANGED: 'b-danger',
  PERMISSION_CHANGED: 'b-danger',
  AUDIT_LOG_EXPORTED: 'b-neutral',
}

const MODULES = [
  'ALL',
  'Auth',
  'Users',
  'Setup',
  'Academics',
  'Admissions',
  'Students',
  'Operations',
  'Fees',
  'Announcements',
  'Settings',
  'Audit',
]

const SEVERITIES = ['ALL', 'INFO', 'WARNING', 'CRITICAL']

export default function AuditPage() {
  const toast = useToast()
  const [logs, setLogs] = useState<Log[] | null>(null)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [category, setCategory] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const load = useCallback(async () => {
    setBusy(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', '25')
    if (category !== 'all') params.set('category', category)
    if (moduleFilter !== 'ALL') params.set('module', moduleFilter)
    if (severityFilter !== 'ALL') params.set('severity', severityFilter)
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)

    try {
      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`)
      const j = await res.json()
      if (j.success) {
        setLogs(j.data)
        if (j.meta) {
          setTotalPages(j.meta.totalPages || 1)
          setTotalCount(j.meta.total || 0)
          if (j.meta.kpis) setKpis(j.meta.kpis)
        }
      } else {
        setLogs([])
        toast.error('Failed to load audit trail', j.error?.message || 'Server error')
      }
    } catch {
      setLogs([])
      toast.error('Failed to load audit trail', 'Network or connection error')
    } finally {
      setBusy(false)
    }
  }, [category, moduleFilter, severityFilter, searchQuery, dateFrom, dateTo, page, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = async () => {
    setExporting(true)
    const params = new URLSearchParams()
    if (moduleFilter !== 'ALL') params.set('module', moduleFilter)
    if (severityFilter !== 'ALL') params.set('severity', severityFilter)
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)

    try {
      const res = await fetch(`/api/v1/audit-logs/export?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Audit Log Exported', 'CSV downloaded and export action recorded')
      load() // Refresh to reflect AUDIT_LOG_EXPORTED
    } catch (e: any) {
      toast.error('Export failed', e.message || 'Could not export audit log')
    } finally {
      setExporting(false)
    }
  }

  // Parse JSON values safely
  const parseJsonSafe = (str: string | null) => {
    if (!str) return null
    try {
      return typeof str === 'string' ? JSON.parse(str) : str
    } catch {
      return str
    }
  }

  const columns: Column<Log>[] = [
    {
      key: 'createdAt',
      header: 'When',
      sortable: true,
      render: (l) => (
        <div style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{timeAgo(l.createdAt)}</div>
          <div className="t-caption">{fmtDate(l.createdAt)}</div>
        </div>
      ),
      export: (l) => fmtDate(l.createdAt),
    },
    {
      key: 'action',
      header: 'Action & Severity',
      render: (l) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            className={`badge ${ACTION_CLS[l.action] || 'b-neutral'}`}
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            {l.action}
          </span>
          <span
            className={`badge ${
              l.severity === 'CRITICAL'
                ? 'b-danger'
                : l.severity === 'WARNING'
                ? 'b-orange'
                : 'b-neutral'
            }`}
            style={{ fontSize: 9.5, padding: '1px 5px' }}
          >
            {l.severity}
          </span>
        </div>
      ),
      export: (l) => `${l.action} (${l.severity})`,
    },
    {
      key: 'module',
      header: 'Module',
      render: (l) => <span style={{ fontSize: 12.5, fontWeight: 600 }}>{l.module || '-'}</span>,
      export: (l) => l.module || '',
    },
    {
      key: 'entity',
      header: 'Entity & ID',
      render: (l) => (
        <div style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600 }}>{l.entity}</span>
          {l.entityId && (
            <span className="t-caption block max-w-[120px] truncate">
              #{l.entityId.slice(0, 10)}
            </span>
          )}
        </div>
      ),
      export: (l) => `${l.entity} ${l.entityId ? '#' + l.entityId : ''}`,
    },
    {
      key: 'summary',
      header: 'Summary',
      render: (l) => (
        <div style={{ maxWidth: 320 }}>
          <span style={{ fontSize: 12.5, color: 'var(--foreground)' }}>
            {l.summary || '-'}
          </span>
          {(l.oldValues || l.newValues) && (
            <span
              className="badge b-info"
              style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px' }}
            >
              Diff Available
            </span>
          )}
        </div>
      ),
      export: (l) => l.summary || '',
    },
    {
      key: 'actorName',
      header: 'Actor',
      render: (l) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{l.actorName || 'System'}</div>
          <div className="t-caption">{l.actorRole || 'SYSTEM'}</div>
        </div>
      ),
      export: (l) => `${l.actorName || 'System'} (${l.actorRole || 'SYSTEM'})`,
    },
    {
      key: 'ipAddress',
      header: 'Network',
      render: (l) => (
        <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 110 }} className="block truncate">
          {l.ipAddress || '-'}
        </span>
      ),
      export: (l) => l.ipAddress || '',
    },
  ]

  return (
    <div className="w-full min-w-0 max-w-[1460px] mx-auto space-y-4 pb-20">
      <PageHead
        breadcrumbs={[
          { label: 'Home', href: '/app' },
          { label: 'Audit Logs' },
        ]}
        title="Audit Logs & Governance"
        sub="Authoritative, tamper-evident forensic history and security event tracking across PreOne"
        actions={
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        }
      />

      {/* ── Canonical Metric Strip ── */}
      <div className="mb-4">
        <KpiGrid columns={6}>
          <GlobalKpiCard
            label="Total Events"
            value={kpis?.totalEvents ?? '...'}
            supportingText="System audit log"
            icon={<ScrollText size={15} />}
          />
          <GlobalKpiCard
            label="Today's Activity"
            value={kpis?.todayEvents ?? '...'}
            supportingText="Logged today"
            icon={<Clock size={15} />}
            iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <GlobalKpiCard
            label="Security Events"
            value={kpis?.securityEvents ?? '...'}
            supportingText="Auth & access"
            icon={<ShieldCheck size={15} />}
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <GlobalKpiCard
            label="Critical Mutations"
            value={kpis?.criticalEvents ?? '...'}
            supportingText="Data modifications"
            icon={<Flame size={15} />}
            iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <GlobalKpiCard
            label="Failed Actions"
            value={kpis?.failedActions ?? '...'}
            supportingText="System rejections"
            icon={<AlertTriangle size={15} />}
            iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <GlobalKpiCard
            label="Audit Exports"
            value={kpis?.exportEvents ?? '...'}
            supportingText="CSV generations"
            icon={<FileSpreadsheet size={15} />}
            iconClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
          />
        </KpiGrid>
      </div>

      {/* ── Category Views / Views Bar ── */}
      <GlobalModuleNavigation
        items={AUDIT_CATEGORY_CONFIG}
        activeId={category}
        onSelect={(id) => {
          setCategory(id)
          setPage(1)
        }}
        ariaLabel="Audit category views"
        className="mb-3.5"
      />

      {/* ── Main Activity Table & Advanced Filters ── */}
      <div className="card w-full min-w-0 max-w-full overflow-hidden" style={{ padding: 0 }}>
        {/* Filter Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <SearchFilterBar
            variant="embedded"
            search={{
              value: searchQuery,
              onChange: (val) => {
                setSearchQuery(val)
                setPage(1)
              },
              placeholder: 'Search action, record, summary, actor...',
              shortcut: '⌘K',
            }}
            filters={[
              {
                id: 'module',
                label: 'Module',
                type: 'select',
                value: moduleFilter,
                defaultValue: 'ALL',
                placeholder: 'All Modules',
                options: MODULES.map((m) => ({
                  value: m,
                  label: m === 'ALL' ? 'All Modules' : m,
                })),
                onChange: (val) => {
                  setModuleFilter(val)
                  setPage(1)
                },
              },
              {
                id: 'severity',
                label: 'Severity',
                type: 'status',
                value: severityFilter,
                defaultValue: 'ALL',
                placeholder: 'All Severities',
                options: SEVERITIES.map((s) => ({
                  value: s,
                  label: s === 'ALL' ? 'All Severities' : s,
                  colorDot:
                    s === 'CRITICAL' ? 'red' : s === 'WARN' ? 'amber' : s === 'INFO' ? 'blue' : undefined,
                })),
                onChange: (val) => {
                  setSeverityFilter(val)
                  setPage(1)
                },
              },
            ]}
            extraActions={
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => load()}
                disabled={busy}
                title="Refresh logs"
              >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            }
            onReset={() => {
              setSearchQuery('')
              setModuleFilter('ALL')
              setSeverityFilter('ALL')
              setDateFrom('')
              setDateTo('')
              setPage(1)
            }}
          />
        </div>

        {/* Audit Data Table */}
        <DataTable<Log>
          columns={columns}
          data={logs ?? []}
          loading={logs === null || busy}
          tableKey="audit-log-table"
          showToolbar={false}
          onRowClick={(l) => setSelectedLog(l)}
          rowActions={(l) => [
            {
              label: 'Inspect Details',
              icon: <Eye size={14} />,
              onClick: () => setSelectedLog(l),
            },
          ]}
          pagination={{
            page,
            pageSize: 25,
            total: totalCount,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: () => {},
          }}
          onRetry={() => load()}
          emptyTitle="No audit events matched"
          emptyMessage={
            searchQuery || moduleFilter !== 'ALL' || severityFilter !== 'ALL'
              ? 'No audit log records match the selected filter criteria. Try clearing or widening your query.'
              : 'As staff interact with PreOne OS, all authoritative mutations and security events land here.'
          }
          emptyAction={
            searchQuery || moduleFilter !== 'ALL' || severityFilter !== 'ALL' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('')
                  setModuleFilter('ALL')
                  setSeverityFilter('ALL')
                  setDateFrom('')
                  setDateTo('')
                  setPage(1)
                }}
              >
                Clear Filters
              </button>
            ) : undefined
          }
        />
      </div>

      {/* ── Forensic Log Detail Inspector Modal ── */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Forensic Audit Event #${selectedLog.id.slice(0, 8)}` : ''}
        subtitle="Authoritative tamper-evident snapshot & field-level diff"
        icon={<Terminal size={22} />}
        wide
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header Metadata Summary Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                background: 'var(--surface-sunken)',
                padding: 12,
                borderRadius: 10,
                fontSize: 12.5,
              }}
            >
              <div>
                <div className="t-caption">ACTION & SEVERITY</div>
                <div style={{ fontWeight: 700, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{selectedLog.action}</span>
                  <span
                    className={`badge ${
                      selectedLog.severity === 'CRITICAL'
                        ? 'b-danger'
                        : selectedLog.severity === 'WARNING'
                        ? 'b-orange'
                        : 'b-neutral'
                    }`}
                    style={{ fontSize: 9.5 }}
                  >
                    {selectedLog.severity}
                  </span>
                </div>
              </div>
              <div>
                <div className="t-caption">MODULE & ENTITY</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {selectedLog.module || 'System'} · {selectedLog.entity}
                </div>
              </div>
              <div>
                <div className="t-caption">ACTOR IDENTITY</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {selectedLog.actorName || 'System'} ({selectedLog.actorRole || 'SYSTEM'})
                </div>
              </div>
              <div>
                <div className="t-caption">TIMESTAMP</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {fmtDate(selectedLog.createdAt)}
                </div>
              </div>
            </div>

            {/* Event Summary */}
            <div>
              <div className="t-caption" style={{ fontWeight: 600, marginBottom: 4 }}>
                EVENT SUMMARY
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  background: 'var(--surface)',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {selectedLog.summary || 'No summary text recorded.'}
              </p>
            </div>

            {/* Context IDs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 8,
                fontSize: 12,
                background: 'var(--surface)',
                padding: 10,
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span className="t-caption">ENTITY ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
                  {selectedLog.entityId || 'N/A'}
                </span>
              </div>
              <div>
                <span className="t-caption">BRANCH ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
                  {selectedLog.branchId || 'All Branches'}
                </span>
              </div>
              <div>
                <span className="t-caption">ACADEMIC SESSION:</span>
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
                  {selectedLog.academicSessionId || 'Global / N/A'}
                </span>
              </div>
              <div>
                <span className="t-caption">REQUEST ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
                  {selectedLog.requestId || 'Internal'}
                </span>
              </div>
            </div>

            {/* Client / Network Forensics */}
            {(selectedLog.ipAddress || selectedLog.userAgent) && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  alignItems: 'center',
                  fontSize: 12,
                  color: 'var(--muted)',
                  padding: '4px 0',
                }}
              >
                {selectedLog.ipAddress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={13} /> IP Address: <b>{selectedLog.ipAddress}</b>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 460 }}>
                    Client Agent: <i>{selectedLog.userAgent}</i>
                  </div>
                )}
              </div>
            )}

            {/* Before / After Forensic Diff */}
            {(selectedLog.oldValues || selectedLog.newValues) && (
              <div>
                <div className="t-caption" style={{ fontWeight: 600, marginBottom: 6 }}>
                  FIELD-LEVEL MUTATION DIFF (BEFORE vs AFTER)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: selectedLog.oldValues ? '1fr 1fr' : '1fr',
                    gap: 10,
                  }}
                >
                  {selectedLog.oldValues && (
                    <div>
                      <div
                        className="t-caption"
                        style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}
                      >
                        BEFORE (ORIGINAL VALUES)
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 10,
                          background: 'var(--surface-sunken)',
                          borderRadius: 8,
                          fontSize: 11,
                          maxHeight: 220,
                          overflow: 'auto',
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
                        }}
                      >
                        {JSON.stringify(parseJsonSafe(selectedLog.oldValues), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValues && (
                    <div>
                      <div
                        className="t-caption"
                        style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}
                      >
                        AFTER (COMMITTED VALUES)
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 10,
                          background: 'var(--surface-sunken)',
                          borderRadius: 8,
                          fontSize: 11,
                          maxHeight: 220,
                          overflow: 'auto',
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                        }}
                      >
                        {JSON.stringify(parseJsonSafe(selectedLog.newValues), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
