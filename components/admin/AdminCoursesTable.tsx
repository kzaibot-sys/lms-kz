'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Video, Eye, EyeOff, MoreHorizontal } from 'lucide-react'

interface CourseRow {
  id: string
  title_ru: string
  title_kz: string
  category: string | null
  difficulty: string
  is_published: boolean
  created_at: string
  videoCount: number
}

interface AdminCoursesTableProps {
  courses: CourseRow[]
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

export function AdminCoursesTable({ courses: initialCourses }: AdminCoursesTableProps) {
  const router = useRouter()
  const [courses, setCourses] = useState(initialCourses)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentStatus }),
      })
      if (response.ok) {
        setCourses((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_published: !currentStatus } : c))
        )
      }
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить курс "${title}"?`)) return
    setLoadingId(id)
    try {
      const response = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== id))
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Название</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Категория</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Уровень</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Видео</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Статус</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {courses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  Курсы не найдены
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium line-clamp-1">{course.title_ru}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{course.title_kz}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {course.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {difficultyLabels[course.difficulty] ?? course.difficulty}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3.5 w-3.5 text-muted-foreground" />
                      {course.videoCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        course.is_published
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {course.is_published ? 'Опубликован' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Videos */}
                      <Link
                        href={`/admin/courses/${course.id}/videos`}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Управление видео"
                      >
                        <Video className="h-4 w-4" />
                      </Link>

                      {/* Edit */}
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>

                      {/* Publish/Unpublish */}
                      <button
                        onClick={() => handleTogglePublish(course.id, course.is_published)}
                        disabled={loadingId === course.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                        title={course.is_published ? 'Снять с публикации' : 'Опубликовать'}
                      >
                        {course.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(course.id, course.title_ru)}
                        disabled={loadingId === course.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50 dark:hover:bg-red-950"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
