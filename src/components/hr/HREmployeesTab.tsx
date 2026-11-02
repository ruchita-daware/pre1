'use client'

import React, { useMemo, useState } from 'react'
import { Eye, Pencil, Users, PhoneCall, Mail, GraduationCap, ShieldCheck, CalendarRange, Award, X, RotateCcw } from 'lucide-react'
import { Avatar, StatusBadge, IconButton } from '@/components/preone/ui'
import { DataTable, Column } from '@/components/preone/DataTable'
import { HRScheduleTab } from './HRScheduleTab'
import { HRTrainingTab } from './HRTrainingTab'
import { HRPerformanceTab } from './HRPerformanceTab'
import type { StaffListItem, BranchOption } from './types'

export type StaffSubView = 'directory' | 'schedule' | 'compliance' | 'performance'

interface HREmployeesTabProps {
  staffList: StaffListItem[] | null
  branches: BranchOption[]
  branchFilter: string
  onBranchFilterChange: (b: string) => void
  statusFilter: string
  onStatusFilterChange: (s: string) => void
  departmentFilter: string
  onDepartmentFilterChange: (d: string) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onViewStaff: (staffId: string) => void
  onEditStaff: (staff: StaffListItem) => void
  onOpenOnboard?: () => void
  canWrite?: boolean
  subView?: StaffSubView
  onSubViewChange?: (v: StaffSubView) => void
}

export function HREmployeesTab({
  staffList,
  branches,
  branchFilter,
  onBranchFilterChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  searchQuery,
  onSearchQueryChange,
  onViewStaff,
  onEditStaff,
  onOpenOnboard,
  canWrite,
  subView: controlledSubView,
  onSubViewChange,
}: HREmployeesTabProps) {
  const [internalSubView, setInternalSubView] = useState<StaffSubView>('directory')
  const currentSubView = controlledSubView || internalSubView
  const setSubView = onSubViewChange || setInternalSubView
  // Columns definition matching section 7 & 40
  const columns = useMemo<Column<StaffListItem>[]>(
    () => [
      {
        key: 'name',
        header: 'Employee',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-3 py-1">
            <Avatar name={row.name} size="md" />
            <div>
              <div className="font-semibold text-foreground leading-tight hover:text-primary transition-colors text-sm">
                {row.name}
              </div>
              <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="font-mono px-1.5 py-0.2 rounded bg-muted/60 text-[11px] font-medium text-foreground">
                  {row.employeeCode}
                </span>
                {row.role && <span>• {row.role}</span>}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'designation',
        header: 'Designation & Department',
        sortable: true,
        render: (row) => (
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-foreground">{row.designation || 'Staff'}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>{row.department || 'Academics'}</span>
              {row.assignedClassrooms && row.assignedClassrooms.length > 0 && (
                <span className="badge b-primary text-[10px] px-1.5 py-0 font-medium">
                  {row.assignedClassrooms.length} class{row.assignedClassrooms.length > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'branchName',
        header: 'Campus Branch',
        sortable: true,
        render: (row) => (
          <span className="text-xs text-foreground font-medium px-2 py-0.5 rounded bg-muted/30">
            {row.branchName || 'Main Campus'}
          </span>
        ),
      },
      {
        key: 'joiningDate',
        header: 'Joining Date',
        sortable: true,
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.joiningDate ? new Date(row.joiningDate).toLocaleDateString('en-IN') : '—'}
          </span>
        ),
      },
      {
        key: 'contact',
        header: 'Contact',
        render: (row) => (
          <div className="text-xs space-y-1">
            {row.phone && (
              <a
                href={`tel:${row.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                title="Call Phone"
              >
                <PhoneCall size={12} className="text-primary/70 shrink-0" />
                <span className="font-mono text-[11.5px]">{row.phone}</span>
              </a>
            )}
            {row.email && (
              <a
                href={`mailto:${row.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors truncate max-w-[170px]"
                title="Send Email"
              >
                <Mail size={12} className="text-primary/70 shrink-0" />
                <span className="truncate text-[11px]">{row.email}</span>
              </a>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              icon={<Eye size={15} />}
              label="View Staff Profile"
              size="sm"
              onClick={() => onViewStaff(row.id)}
            />
            {canWrite && (
              <IconButton
                icon={<Pencil size={14} />}
                label="Edit Employee"
                size="sm"
                onClick={() => onEditStaff(row)}
              />
            )}
          </div>
        ),
      },
    ],
    [canWrite, onViewStaff, onEditStaff]
  )

  // Filter toolbar
  const filterToolbar = (
    <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto scrollbar-none py-0.5 max-w-full">
      {/* Branch Selector */}
      <div className="relative shrink-0">
        <select
          className={`select !h-9 text-xs py-1 pl-3 pr-8 font-medium rounded-xl border cursor-pointer shadow-2xs transition-colors focus:ring-1 focus:ring-primary/30 ${
            branchFilter !== 'ALL'
              ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
              : 'bg-background/80 border-border/80 text-foreground hover:border-border'
          }`}
          style={{ width: 'auto', minWidth: 140, height: 36 }}
          value={branchFilter}
          onChange={(e) => onBranchFilterChange(e.target.value)}
          aria-label="Filter by campus"
        >
          <option value="ALL">All Campuses</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="relative shrink-0">
        <select
          className={`select !h-9 text-xs py-1 pl-3 pr-8 font-medium rounded-xl border cursor-pointer shadow-2xs transition-colors focus:ring-1 focus:ring-primary/30 ${
            statusFilter !== 'ALL'
              ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
              : 'bg-background/80 border-border/80 text-foreground hover:border-border'
          }`}
          style={{ width: 'auto', minWidth: 130, height: 36 }}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Staff</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
        </select>
      </div>

      {/* Department Filter */}
      <div className="relative shrink-0">
        <select
          className={`select !h-9 text-xs py-1 pl-3 pr-8 font-medium rounded-xl border cursor-pointer shadow-2xs transition-colors focus:ring-1 focus:ring-primary/30 ${
            departmentFilter !== 'ALL'
              ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
              : 'bg-background/80 border-border/80 text-foreground hover:border-border'
          }`}
          style={{ width: 'auto', minWidth: 145, height: 36 }}
          value={departmentFilter}
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="ALL">All Departments</option>
          <option value="Academics">Academics</option>
          <option value="Administration">Administration</option>
          <option value="Finance">Finance</option>
          <option value="Operations">Operations</option>
          <option value="Transport">Transport</option>
        </select>
      </div>

      {/* Reset Filter Button */}
      {(branchFilter !== 'ALL' || statusFilter !== 'ALL' || departmentFilter !== 'ALL') && (
        <button
          type="button"
          onClick={() => {
            onBranchFilterChange('ALL')
            onStatusFilterChange('ALL')
            onDepartmentFilterChange('ALL')
          }}
          className="btn btn-ghost btn-sm text-xs h-9 px-2.5 text-muted-foreground hover:text-foreground shrink-0 rounded-xl flex items-center gap-1 border border-border/60"
          title="Reset filters"
        >
          <X size={13} />
          <span>Reset</span>
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ── Sub-View Bar for Specialized Tasks ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
          <button
            type="button"
            onClick={() => setSubView('directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentSubView === 'directory'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={13} />
            <span>Staff Directory</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentSubView === 'schedule'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarRange size={13} />
            <span>Classroom Allocations</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('compliance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentSubView === 'compliance'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Compliance & Safety</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentSubView === 'performance'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award size={13} />
            <span>Appraisals & Reviews</span>
          </button>
        </div>
      </div>

      {/* ── Active View Content ── */}
      {currentSubView === 'directory' && (
        <DataTable
          columns={columns}
          data={staffList}
          loading={staffList === null}
          onRowClick={(row) => onViewStaff(row.id)}
          searchPlaceholder="Search employees by name, code, contact, role..."
          searchValue={searchQuery}
          onSearch={onSearchQueryChange}
          filters={filterToolbar}
          emptyTitle="No Employees Found"
          emptyMessage="No employee records match your search or filter criteria."
          emptyIcon={<Users size={36} className="text-muted-foreground opacity-50" />}
          paginate
          defaultPageSize={15}
          showExport
          exportFileName="preone-employees-directory"
        />
      )}

      {currentSubView === 'schedule' && (
        <HRScheduleTab branchFilter={branchFilter} />
      )}

      {currentSubView === 'compliance' && (
        <HRTrainingTab canWrite={canWrite} />
      )}

      {currentSubView === 'performance' && (
        <HRPerformanceTab canWrite={canWrite} />
      )}
    </div>
  )
}
