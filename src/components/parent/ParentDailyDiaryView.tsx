'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  Eye,
  Sparkles,
  Calendar,
  Utensils,
  Moon,
  Smile,
  ShieldAlert,
  FileText,
  RefreshCw,
  Sun,
  Coffee,
} from 'lucide-react'
import { PageHead, StatusBadge, EmptyState, Skeleton, Avatar } from '@/components/preone/ui'
import { ParentStudentSelector } from '@/components/parent/ParentStudentSelector'
import { useParentStudents } from '@/lib/parent/use-parent-students'
import { isoDate, fmtDate } from '@/lib/format'

interface DailyDiaryData {
  student: {
    id: string
    name: string
    admissionNo: string
    photoUrl?: string | null
    classroom?: {
      id: string
      name: string
      primaryTeacher?: { fullName: string } | null
    } | null
  }
  schedule?: {
    id: string
    subjectName: string
    startTime: string
    endTime: string
    activityType: string
  }[]
  todayAttendance?: {
    status: string
    markedAt?: string | null
    notes?: string | null
  } | null
  activities?: {
    id: string
    title: string
    activityType: string
    status: string
    actualOutcome?: string | null
  }[]
  teacherNotes?: string[]
}

interface DailyReportData {
  timeline: {
    id: string
    type: string
    title: string
    body?: string | null
    mood?: string | null
    createdAt: string
  }[]
  observations: {
    id: string
    narrative: string
    category?: string | null
    observedAt: string
  }[]
}

export function ParentDailyDiaryView({ session }: { session?: any }) {
  const { students, selectedStudentId, selectedStudent, selectStudent, loading: loadingStudents } = useParentStudents()
  const [selectedDate, setSelectedDate] = useState<string>(isoDate())

  const [diaryData, setDiaryData] = useState<DailyDiaryData | null>(null)
  const [reportData, setReportData] = useState<DailyReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDiaryForDate = useCallback(async (studentId: string, dateStr: string) => {
    try {
      setLoading(true)
      setError(null)

      const [resDiary, resReport] = await Promise.all([
        fetch(`/api/v1/parent/daily-diary?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(dateStr)}`)
          .then((r) => r.json())
          .catch(() => ({ success: false })),
        fetch(`/api/v1/parent/daily-report?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(dateStr)}`)
          .then((r) => r.json())
          .catch(() => ({ success: false })),
      ])

      if (resDiary.success && resDiary.data) {
        setDiaryData(resDiary.data)
      } else {
        setDiaryData(null)
      }

      if (resReport.success && resReport.data) {
        setReportData(resReport.data)
      } else {
        setReportData(null)
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading classroom daily diary.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      fetchDiaryForDate(selectedStudentId, selectedDate)
    }
  }, [selectedStudentId, selectedDate, fetchDiaryForDate])

  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(isoDate(d))
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(isoDate(d))
  }

  const isToday = selectedDate === isoDate()

  // Categorize care timeline items (meals, naps, bathroom, routine)
  const careMeals = useMemo(() => {
    return (reportData?.timeline || []).filter((t) => t.type === 'MEAL')
  }, [reportData])

  const careNaps = useMemo(() => {
    return (reportData?.timeline || []).filter((t) => t.type === 'NAP')
  }, [reportData])

  const careRoutine = useMemo(() => {
    return (reportData?.timeline || []).filter((t) => ['ARRIVAL', 'PICKUP', 'BATHROOM', 'ACTIVITY', 'NOTE'].includes(t.type))
  }, [reportData])

  return (
    <div className="page-shell max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Page Header & Student Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <PageHead
            title="Classroom Daily Diary"
            subtitle="Today's classroom schedule, care routine updates, feeding, naps, and teacher notes."
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

      {/* ── Date Navigator & Attendance Bar ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Date Selector Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1.5 rounded-xl border border-border/80 hover:bg-muted text-foreground cursor-pointer transition-colors"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60">
            <Calendar size={14} className="text-purple-600 dark:text-purple-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-1.5 rounded-xl border border-border/80 hover:bg-muted text-foreground cursor-pointer transition-colors"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(isoDate())}
              className="px-2.5 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 rounded-lg hover:bg-purple-100 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Daily Attendance Status Pill */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Daily Attendance:</span>
          {diaryData?.todayAttendance ? (
            <div className="flex items-center gap-2">
              <StatusBadge status={diaryData.todayAttendance.status} />
              {diaryData.todayAttendance.markedAt && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  Recorded at {new Date(diaryData.todayAttendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Attendance not logged yet</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-44 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-60 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
            <div className="h-60 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── 1. Daily Care & Routine Telemetry ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sun size={17} className="text-amber-500" />
                <span>Care Routine & Well-being Updates</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{fmtDate(selectedDate)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Feeding & Meals */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground text-[12px]">
                  <Utensils size={15} className="text-emerald-500" />
                  <span>Meals & Nutrition</span>
                </div>
                {careMeals.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">No meal records logged for this day.</p>
                ) : (
                  <div className="space-y-1.5">
                    {careMeals.map((m) => (
                      <div key={m.id} className="text-[11px]">
                        <span className="font-semibold text-foreground">{m.title}</span>
                        {m.body && <span className="text-muted-foreground block">{m.body}</span>}
                        {m.mood && <span className="text-[10px] text-purple-600 font-medium">Mood: {m.mood}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Naps & Rest */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground text-[12px]">
                  <Moon size={15} className="text-blue-500" />
                  <span>Nap & Rest Time</span>
                </div>
                {careNaps.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">No nap records logged for this day.</p>
                ) : (
                  <div className="space-y-1.5">
                    {careNaps.map((n) => (
                      <div key={n.id} className="text-[11px]">
                        <span className="font-semibold text-foreground">{n.title}</span>
                        {n.body && <span className="text-muted-foreground block">{n.body}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Check-in / Departure / Routine */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground text-[12px]">
                  <Clock size={15} className="text-purple-500" />
                  <span>Arrival & Pickup Routine</span>
                </div>
                {careRoutine.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">Standard campus day routine.</p>
                ) : (
                  <div className="space-y-1.5">
                    {careRoutine.slice(0, 3).map((r) => (
                      <div key={r.id} className="text-[11px]">
                        <span className="font-semibold text-foreground">{r.title}</span>
                        {r.body && <span className="text-muted-foreground block">{r.body}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. Classroom Schedule / Timetable & Subjects ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Schedule */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />
                  <span>Class Timetable & Periods</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {diaryData?.student?.classroom?.name || 'Assigned Classroom'}
                </span>
              </div>

              {(diaryData?.schedule || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No scheduled timetable entries for this date.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {diaryData!.schedule!.map((row) => (
                    <div key={row.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-foreground">{row.subjectName}</div>
                        <div className="text-[11px] text-muted-foreground">{row.activityType}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-md">
                        {row.startTime} – {row.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activities & Teacher Notes for Parents */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Teacher Notes & Completed Activities</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Notes for Parents</span>
              </div>

              {(diaryData?.activities || []).length === 0 && (diaryData?.teacherNotes || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No notes or special activities recorded for this date.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Activities */}
                  {(diaryData?.activities || []).map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{act.title}</span>
                        <StatusBadge status={act.status} />
                      </div>
                      {act.actualOutcome && (
                        <p className="text-[11px] text-muted-foreground">Outcome: {act.actualOutcome}</p>
                      )}
                    </div>
                  ))}

                  {/* Teacher Notes */}
                  {(diaryData?.teacherNotes || []).map((note, i) => (
                    <div key={i} className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 text-xs text-purple-900 dark:text-purple-200">
                      <b>Educator Note:</b> {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Published Developmental Observations ── */}
          {(reportData?.observations || []).length > 0 && (
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-2 border-b border-border/50">
                <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                <span>Today&apos;s Teacher Observations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportData!.observations.map((obs) => (
                  <div key={obs.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs space-y-1.5">
                    {obs.category && (
                      <span className="px-2 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold text-[10px] uppercase tracking-wider">
                        {obs.category}
                      </span>
                    )}
                    <p className="text-foreground text-[12px] leading-relaxed">&ldquo;{obs.narrative}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
