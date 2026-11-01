'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  GraduationCap,
  Calendar,
  School,
  HeartPulse,
  ShieldCheck,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  IndianRupee,
  Bus,
  FileText,
  Clock,
  Sparkles,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { PageHead, StatusBadge, Avatar, EmptyState, Skeleton } from '@/components/preone/ui'
import { ParentStudentSelector } from '@/components/parent/ParentStudentSelector'
import { useParentStudents } from '@/lib/parent/use-parent-students'
import { fmtDate, formatPreschoolAge } from '@/lib/format'

export function ParentStudentsView({ session }: { session?: any }) {
  const { students, selectedStudentId, selectedStudent, selectStudent, loading: loadingStudents } = useParentStudents()
  const [profile, setProfile] = useState<any | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStudentProfile = useCallback(async (studentId: string) => {
    try {
      setLoadingProfile(true)
      setError(null)
      const res = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}`)
      const json = await res.json()
      if (json.success && json.data) {
        setProfile(json.data)
      } else {
        setError(json.error?.message || 'Failed to load student profile details.')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading student profile.')
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentProfile(selectedStudentId)
    }
  }, [selectedStudentId, fetchStudentProfile])

  if (loadingStudents) {
    return (
      <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="h-12 w-64 bg-muted/40 animate-pulse rounded-xl" />
        <div className="h-64 bg-muted/30 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <EmptyState
          icon={<Users size={48} className="text-muted-foreground/60" />}
          title="No Linked Students"
          message="There are currently no active students linked to your parent account. Please contact the preschool front desk if you believe this is an error."
        />
      </div>
    )
  }

  const student = profile?.student || selectedStudent

  return (
    <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Page Header & Student Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <PageHead
            title="My Children"
            subtitle="View student identity, classroom enrollment, teacher details, and authorized records."
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

      {loadingProfile && !profile ? (
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-52 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
            <div className="h-52 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : student ? (
        <div className="space-y-6">
          {/* ── 1. Hero Identity Card ── */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/10 via-blue-500/5 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
              <div className="relative">
                <Avatar
                  name={`${student.firstName || ''} ${student.lastName || ''}`.trim()}
                  src={student.photoUrl || undefined}
                  size={76}
                  className="rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {student.firstName} {student.lastName || ''}
                  </h2>
                  <StatusBadge status={student.status || 'ACTIVE'} />
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground font-medium">
                  <span className="font-mono bg-muted/60 px-2 py-0.5 rounded-md text-foreground">
                    Adm #{student.admissionNo}
                  </span>
                  {student.seatNumber && (
                    <span className="font-mono text-muted-foreground">
                      Seat: {student.seatNumber}
                    </span>
                  )}
                  <span>•</span>
                  <span>{student.gender || 'Preschooler'}</span>
                  {student.dob && (
                    <>
                      <span>•</span>
                      <span>Born: {fmtDate(student.dob)}</span>
                      <span>({formatPreschoolAge(student.dob)})</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto pt-2 sm:pt-0">
                <Link
                  href="/app/daily-diary"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 text-xs font-semibold hover:bg-purple-100 transition-colors"
                >
                  <CalendarCheck size={14} />
                  <span>Daily Diary</span>
                </Link>
                <Link
                  href="/app/finance"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <IndianRupee size={14} />
                  <span>Fees</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── 2. Information Grid: Academic Placement & Health Safety ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Placement */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-2 border-b border-border/50">
                <GraduationCap size={18} className="text-purple-600 dark:text-purple-400" />
                <span>Classroom & Academic Placement</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="text-[11px] text-muted-foreground font-medium">Classroom</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {student.currentClassroom?.name || profile?.classroom?.name || 'Classroom Assigned'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="text-[11px] text-muted-foreground font-medium">Program</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {student.programType || student.currentClassroom?.program?.name || 'Early Years'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="text-[11px] text-muted-foreground font-medium">Primary Educator</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {student.currentClassroom?.primaryTeacher?.fullName || 'Assigned Educator'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="text-[11px] text-muted-foreground font-medium">Campus Branch</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1">
                    <MapPin size={12} className="text-muted-foreground" />
                    <span>{student.branchName || 'Main Campus'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Health, Allergies & Safety Notes */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-2 border-b border-border/50">
                <HeartPulse size={18} className="text-rose-500" />
                <span>Health, Nutrition & Safety</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">Blood Group:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {student.bloodGroup || 'Not Recorded'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-muted-foreground font-medium block">Allergies & Sensitivities:</span>
                  {student.allergies ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold text-[11px]">
                      <AlertTriangle size={11} /> {student.allergies}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">No known allergies reported</span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-muted-foreground font-medium block">Dietary Restrictions:</span>
                  <span className="text-foreground text-[11px]">
                    {student.dietaryRestrictions || 'Standard preschool meal plan'}
                  </span>
                </div>

                {student.medicalAlerts && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-[11px]">
                    <b>Medical Alert:</b> {student.medicalAlerts}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Authorized Guardians & Pickup Security ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Authorized Family & Pickup Contacts</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Verified guardians authorized to pick up {student.firstName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(profile?.student?.guardians || []).length > 0 ? (
                profile.student.guardians.map((link: any, idx: number) => {
                  const g = link.guardian || {}
                  const isPrimary = link.isPrimary
                  const canPickup = link.canPickup || link.pickupStatus === 'AUTHORIZED'

                  return (
                    <div
                      key={g.id || idx}
                      className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-[13px]">{g.fullName || 'Guardian'}</span>
                        {isPrimary && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground">
                        Relationship: <span className="text-foreground font-medium">{link.relationship || g.relationship || 'Guardian'}</span>
                      </div>

                      {g.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                          <Phone size={11} /> {g.phone}
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Pickup Rights:</span>
                        {canPickup ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ShieldCheck size={12} /> Authorized
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Contact Only</span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-3 text-xs text-muted-foreground py-2">
                  Guardian authorization records synced from school admissions dossier.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
