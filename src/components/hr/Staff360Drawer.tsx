'use client'

import React, { useState } from 'react'
import {
  User,
  Briefcase,
  Phone,
  Mail,
  Building,
  CreditCard,
  CalendarCheck,
  CalendarDays,
  ShieldCheck,
  GraduationCap,
  FileText,
  Lock,
} from 'lucide-react'
import { Drawer } from '@/components/preone/Modal'
import { Avatar, StatusBadge, Skeleton } from '@/components/preone/ui'
import { money, timeOf } from './types'

interface Staff360DrawerProps {
  open: boolean
  onClose: () => void
  staff: any | null
  loading?: boolean
}

type SubTab = 'overview' | 'employment' | 'salary' | 'attendance' | 'documents'

export function Staff360Drawer({ open, onClose, staff, loading }: Staff360DrawerProps) {
  const [subTab, setSubTab] = useState<SubTab>('overview')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={staff ? staff.user?.fullName || 'Staff 360 Profile' : 'Staff Profile'}
      subtitle={staff ? `${staff.employeeCode} • ${staff.designation || 'Staff'}` : 'Employee details'}
      icon={<User size={18} />}
    >
      {loading || !staff ? (
        <div className="space-y-4 p-2">
          <Skeleton h={80} variant="card" />
          <Skeleton h={200} variant="card" />
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* ── Employee Header Strip ── */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 flex items-center gap-3">
            <Avatar name={staff.user?.fullName || staff.name} src={staff.user?.avatarUrl || staff.avatarUrl || staff.user?.photoUrl || staff.photoUrl} size="lg" />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground truncate">{staff.user?.fullName}</h2>
                <StatusBadge status={staff.status} />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="font-mono font-medium">{staff.employeeCode}</span>
                <span>•</span>
                <span>{staff.designation || 'Staff'}</span>
                <span>•</span>
                <span>{staff.branch?.name || 'Main Campus'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                {staff.user?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {staff.user.phone}
                  </span>
                )}
                {staff.user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} /> {staff.user.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Sub-Navigation Tabs (5 Clean Tabs) ── */}
          <div className="overflow-x-auto pb-1 no-scrollbar">
            <div className="seg">
              {(
                [
                  { key: 'overview', label: 'Overview' },
                  { key: 'employment', label: 'Employment' },
                  { key: 'salary', label: 'Salary & Bank' },
                  { key: 'attendance', label: 'Attendance & Leaves' },
                  { key: 'documents', label: 'Documents & Compliance' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSubTab(t.key)}
                  className={subTab === t.key ? 'on' : ''}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content: Overview ── */}
          {subTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[11px] text-muted-foreground">Department</div>
                  <div className="font-semibold text-foreground mt-0.5">{staff.department || 'Academics'}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[11px] text-muted-foreground">Employment Type</div>
                  <div className="font-semibold text-foreground mt-0.5">{staff.employmentType}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[11px] text-muted-foreground">Joining Date</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[11px] text-muted-foreground">Notice Period</div>
                  <div className="font-semibold text-foreground mt-0.5">{staff.noticePeriodDays} Days</div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
                <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Phone size={13} className="text-primary" />
                  <span>Emergency Contact</span>
                </div>
                <div className="text-foreground">
                  {staff.emergencyContactName ? (
                    <>
                      {staff.emergencyContactName}{' '}
                      {staff.emergencyContactPhone ? `(${staff.emergencyContactPhone})` : ''}
                    </>
                  ) : (
                    <span className="text-muted-foreground">None provided</span>
                  )}
                </div>
              </div>

              {/* Assigned Classrooms */}
              {staff.classrooms && staff.classrooms.length > 0 && (
                <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1.5">
                  <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-primary" />
                    <span>Assigned Primary Classrooms</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {staff.classrooms.map((c: any) => (
                      <span key={c.id} className="badge b-primary text-xs px-2 py-0.5">
                        {c.name} ({c.code})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab Content: Employment ── */}
          {subTab === 'employment' && (
            <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Designation:</span>
                  <div className="font-semibold text-foreground">{staff.designation || 'Staff'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Qualification:</span>
                  <div className="font-semibold text-foreground">{staff.qualification || 'ECCE Certified'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Probation End Date:</span>
                  <div className="font-semibold text-foreground">
                    {staff.probationEndDate ? new Date(staff.probationEndDate).toLocaleDateString('en-IN') : 'Confirmed'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Confirmation Date:</span>
                  <div className="font-semibold text-foreground">
                    {staff.confirmationDate ? new Date(staff.confirmationDate).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <div className="font-semibold text-foreground">
                    {staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender:</span>
                  <div className="font-semibold text-foreground">{staff.gender || '—'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Blood Group:</span>
                  <div className="font-semibold text-foreground">{staff.bloodGroup || '—'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Marital Status:</span>
                  <div className="font-semibold text-foreground">{staff.maritalStatus || '—'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Current Address:</span>
                  <div className="text-foreground">{staff.currentAddress || '—'}</div>
                </div>
              </div>

              {/* Employment & Designation History Timeline */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase size={13} className="text-primary" />
                  <span>Employment & Designation History Timeline</span>
                </div>
                {staff.employmentHistory && staff.employmentHistory.length > 0 ? (
                  <div className="relative pl-4 space-y-3 border-l-2 border-primary/30 mt-2">
                    {staff.employmentHistory.map((item: any) => (
                      <div key={item.id} className="relative group">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                        <div className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>{item.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                        {item.actorName && (
                          <div className="text-[10px] text-muted-foreground/75 mt-0.5">Recorded by: {item.actorName}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No historical milestones recorded.</div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab Content: Salary & Bank ── */}
          {subTab === 'salary' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-2.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5 pb-1 border-b border-border/50">
                  <CreditCard size={14} className="text-primary" />
                  <span>Salary Structure (Monthly)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-muted-foreground">Basic Salary</span>
                    <div className="font-mono font-semibold text-foreground">
                      {money(staff.salaryStructure?.basicSalary)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HRA</span>
                    <div className="font-mono font-semibold text-foreground">
                      {money(staff.salaryStructure?.hra)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Special Allowance</span>
                    <div className="font-mono font-semibold text-foreground">
                      {money(staff.salaryStructure?.specialAllowance)}
                    </div>
                  </div>
                </div>
              </div>

              {staff.bankDetails ? (
                <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-2">
                  <div className="font-semibold text-foreground">Bank Account Details (Confidential)</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Bank Name:</span>
                      <div className="font-medium text-foreground">{staff.bankDetails.bankName}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Number:</span>
                      <div className="font-mono font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                        <Lock size={11} className="text-muted-foreground" />
                        <span>{staff.bankDetails.accountNumberMasked || '••••••••'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IFSC Code:</span>
                      <div className="font-mono font-medium text-foreground">{staff.bankDetails.ifscCode}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-border/60 bg-card text-muted-foreground text-center">
                  No bank details configured
                </div>
              )}
            </div>
          )}

          {/* ── Tab Content: Attendance & Leaves ── */}
          {subTab === 'attendance' && (
            <div className="space-y-4">
              {/* Leave balances */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Annual Leave Balances
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {staff.leaveBalances && staff.leaveBalances.length > 0 ? (
                    staff.leaveBalances.map((lb: any) => (
                      <div key={lb.id} className="p-2.5 rounded-lg border border-border/60 bg-card space-y-0.5">
                        <div className="text-[11px] font-medium text-foreground">{lb.leaveType?.name || 'Leave'}</div>
                        <div className="text-lg font-bold text-primary">{lb.balance} d</div>
                        <div className="text-[10px] text-muted-foreground">
                          {lb.consumed} consumed • {lb.totalCredited} credited
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-3 text-center text-muted-foreground border border-border/50 rounded-lg">
                      Standard preschool leave quota active
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Punches */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Recent Daily Punches
                </div>
                <div className="divide-y divide-border/50 border border-border/60 rounded-lg overflow-hidden bg-card">
                  {staff.attendanceRecords && staff.attendanceRecords.length > 0 ? (
                    staff.attendanceRecords.slice(0, 5).map((att: any) => (
                      <div key={att.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20">
                        <div>
                          <div className="font-medium text-foreground">
                            {new Date(att.date).toLocaleDateString('en-IN')}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            In: {timeOf(att.checkIn)} • Out: {timeOf(att.checkOut)} ({att.workedHours}h)
                          </div>
                        </div>
                        <StatusBadge status={att.status} />
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">No recent attendance records</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab Content: Documents & Compliance ── */}
          {subTab === 'documents' && (
            <div className="space-y-3">
              {/* Statutory ID Masking */}
              <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-2.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Statutory Identifiers (Masked)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">PAN Number:</span>
                    <div className="font-mono font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Lock size={11} className="text-muted-foreground" />
                      <span>{staff.panNumber || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Aadhaar Number:</span>
                    <div className="font-mono font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Lock size={11} className="text-muted-foreground" />
                      <span>{staff.aadhaarNumber ? `•••• •••• ${staff.aadhaarNumber.slice(-4)}` : '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UAN / PF:</span>
                    <div className="font-mono text-foreground">{staff.uanNumber || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ESI Number:</span>
                    <div className="font-mono text-foreground">{staff.esiNumber || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Verified Documents
                </div>
                {staff.documents && staff.documents.length > 0 ? (
                  staff.documents.map((d: any) => (
                    <div key={d.id} className="p-2.5 rounded-lg border border-border/60 bg-card flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-primary" />
                        <div>
                          <div className="font-medium text-foreground">{d.docType.replace('_', ' ')}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{d.documentNumber || 'Verified'}</div>
                        </div>
                      </div>
                      <StatusBadge status={d.verificationStatus} />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground border border-border/60 rounded-lg">
                    No documents on file
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
