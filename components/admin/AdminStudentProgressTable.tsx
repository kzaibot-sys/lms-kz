'use client'

import { useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface CourseProgressRow {
  courseId: string
  courseTitle: string
  videoCount: number
  progress: number
  lastWatched: string | null
}

interface AdminStudentProgressTableProps {
  studentId: string
  courseProgress: CourseProgressRow[]
}

export function AdminStudentProgressTable({ studentId, courseProgress: initial }: AdminStudentProgressTableProps) {
  const [courseProgress, setCourseProgress] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleReset = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Сбросить прогресс студента по курсу "${courseTitle}"?`)) return

    setLoadingId(courseId)
    try {
      const response = await fetch(`/api/admin/students/${studentId}/reset-progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })

      if (response.ok) {
        setCourseProgress((prev) =>
          prev.map((c) =>
            c.courseId === courseId ? { ...c, progress: 0, lastWatched: null } : c
          )
        )
      }
    } finally {
      setLoadingId(null)
    }
  }

  if (courseProgress.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Студент ещё не начал ни одного курса
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Курс</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Прогресс</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Последняя активность</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {courseProgress.map((row) => (
            <tr key={row.courseId} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{row.courseTitle}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar value={row.progress} size="sm" className="w-24" />
                  <span className="text-xs text-muted-foreground">{Math.round(row.progress)}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {row.lastWatched
                  ? format(new Date(row.lastWatched), 'd MMM yyyy, HH:mm', { locale: ru })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleReset(row.courseId, row.courseTitle)}
                  disabled={loadingId === row.courseId || row.progress === 0}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  title="Сбросить прогресс"
                >
                  {loadingId === row.courseId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Сбросить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
