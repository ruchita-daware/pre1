'use client'

import React from 'react'
import { Users, GraduationCap, Sparkles, Check } from 'lucide-react'
import { Avatar } from '@/components/preone/ui'
import type { ParentLinkedStudent } from '@/lib/parent/use-parent-students'

export interface ParentStudentSelectorProps {
  students: ParentLinkedStudent[]
  selectedStudentId: string | null
  onSelectStudent: (studentId: string) => void
  label?: string
  className?: string
  compact?: boolean
}

export function ParentStudentSelector({
  students,
  selectedStudentId,
  onSelectStudent,
  label = 'Select Child',
  className = '',
  compact = false,
}: ParentStudentSelectorProps) {
  if (students.length === 0) {
    return null
  }

  // Single-child mode: display clean verification pill without tab switching controls
  if (students.length === 1) {
    const student = students[0]
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-foreground ${className}`}
        aria-label={`Active student: ${student.name}`}
      >
        <Avatar name={student.name} src={student.photoUrl || undefined} size={24} />
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">{student.name}</span>
          {student.classroom && (
            <span className="text-[11px] px-2 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
              {student.classroom}
            </span>
          )}
          {student.admissionNo && (
            <span className="text-[11px] text-muted-foreground font-mono">
              #{student.admissionNo}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Multi-child switcher: tabbed switcher with tactile pills
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && !compact && (
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Users size={12} className="text-purple-500" />
          {label}
        </span>
      )}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="tablist"
        aria-label="Parent linked children selector"
      >
        {students.map((student) => {
          const isSelected = student.id === selectedStudentId
          return (
            <button
              key={student.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              id={`tab-child-${student.id}`}
              aria-controls={`panel-child-${student.id}`}
              onClick={() => onSelectStudent(student.id)}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer shrink-0 text-left ${
                isSelected
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-100 font-semibold shadow-xs ring-1 ring-purple-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Avatar name={student.name} src={student.photoUrl || undefined} size={26} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="truncate max-w-[140px] font-medium">{student.name}</span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {student.classroom ? <span>{student.classroom}</span> : <span>#{student.admissionNo}</span>}
                </div>
              </div>
              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 ml-0.5">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
