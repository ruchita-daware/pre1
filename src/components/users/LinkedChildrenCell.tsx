'use client'

import React from 'react'
import { Baby, Users, Building2 } from 'lucide-react'
import { Avatar } from '@/components/preone/ui'
import { UserRecord } from './types'

export interface LinkedChildrenCellProps {
  user: UserRecord
  onChildClick?: (studentId: string) => void
  className?: string
}

export function LinkedChildrenCell({
  user,
  onChildClick,
  className = '',
}: LinkedChildrenCellProps) {
  const children = user.guardianProfile?.students || []
  const isCrossCampus = user.guardianProfile?.isCrossCampus
  const campusesCount = user.guardianProfile?.campusesCount

  if (children.length === 0) {
    return (
      <div className={`text-xs text-gray-400 dark:text-gray-500 italic flex items-center gap-1.5 ${className}`}>
        <Baby className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" aria-hidden="true" />
        <span>No linked children</span>
      </div>
    )
  }

  return (
    <div className={`linked-children-cell space-y-1 max-w-xs ${className}`}>
      {/* Primary Row: Compact Avatar Stack / Child Pill count */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {children.length === 1 ? (
          <div
            className="inline-flex items-center gap-1.5 bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 px-2 py-1 rounded-lg border border-purple-200/60 dark:border-purple-800/50 text-xs font-semibold"
            title={`${children[0].name} ${children[0].classroom ? '(' + children[0].classroom + ')' : ''}`}
          >
            <Avatar name={children[0].name} size="xs" className="shrink-0 ring-1 ring-purple-300" />
            <span className="truncate max-w-[130px]">{children[0].name}</span>
            {children[0].classroom && (
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                ({children[0].classroom})
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] font-bold shrink-0">
              <Users className="w-3 h-3 text-indigo-500" />
              <span>{children.length} Children</span>
            </div>
            {children.map((c, i) => (
              <span
                key={c.id || i}
                className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-[11px] font-medium"
                title={`${c.name} ${c.classroom ? '(' + c.classroom + ')' : ''}`}
              >
                <span className="truncate max-w-[95px]">{c.name}</span>
                {c.classroom && (
                  <span className="text-muted-foreground text-[9.5px]">({c.classroom})</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {isCrossCampus && (
        <div className="text-[10px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
          <Building2 className="w-2.5 h-2.5 shrink-0" />
          <span>{campusesCount ? `${campusesCount} Campus Branches` : 'Multi-Campus'}</span>
        </div>
      )}
    </div>
  )
}
