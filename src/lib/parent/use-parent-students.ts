'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ParentLinkedStudent {
  id: string
  name: string
  firstName: string
  lastName?: string | null
  admissionNo: string
  photoUrl?: string | null
  classroom?: string | null
  teacher?: string | null
  attendance?: string | null
}

const STORAGE_KEY = 'preone:parent:selected-child-id'
const EVENT_NAME = 'preone:parent-child-changed'

export function useParentStudents(initialStudentId?: string | null) {
  const [students, setStudents] = useState<ParentLinkedStudent[]>([])
  const [selectedStudentId, setSelectedStudentIdState] = useState<string | null>(initialStudentId || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/v1/parent/today')
      const json = await res.json()
      if (json.success && json.data?.children) {
        const loaded: ParentLinkedStudent[] = json.data.children.map((c: any) => ({
          id: c.id,
          name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          firstName: c.firstName || c.name?.split(' ')[0] || 'Child',
          lastName: c.lastName || null,
          admissionNo: c.admissionNo || '',
          photoUrl: c.photoUrl || null,
          classroom: c.classroom || null,
          teacher: c.teacher || null,
          attendance: c.attendance || null,
        }))
        setStudents(loaded)

        // Resolve preferred selection: initial prop -> saved localStorage -> first child
        let preferredId: string | null = null
        if (typeof window !== 'undefined') {
          const savedId = window.localStorage.getItem(STORAGE_KEY)
          if (savedId && loaded.some((s) => s.id === savedId)) {
            preferredId = savedId
          }
        }
        if (!preferredId && initialStudentId && loaded.some((s) => s.id === initialStudentId)) {
          preferredId = initialStudentId
        }
        if (!preferredId && loaded.length > 0) {
          preferredId = loaded[0].id
        }

        if (preferredId) {
          setSelectedStudentIdState(preferredId)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, preferredId)
          }
        }
      } else {
        setError(json.error?.message || 'Failed to load linked students')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading linked children')
    } finally {
      setLoading(false)
    }
  }, [initialStudentId])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Listen for child changes across other parent components
  useEffect(() => {
    const handleChildChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.studentId) {
        setSelectedStudentIdState(detail.studentId)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_NAME, handleChildChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENT_NAME, handleChildChanged)
      }
    }
  }, [])

  const selectStudent = useCallback(
    (studentId: string) => {
      setSelectedStudentIdState(studentId)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, studentId)
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { studentId } }))
      }
    },
    []
  )

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0] || null

  return {
    students,
    selectedStudentId: selectedStudent?.id || selectedStudentId,
    selectedStudent,
    selectStudent,
    loading,
    error,
    refresh: fetchStudents,
  }
}
