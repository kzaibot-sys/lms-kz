'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Video } from 'lucide-react'

interface CourseFormData {
  title_ru: string
  title_kz: string
  description_ru: string
  description_kz: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  cover_url: string
  sort_order: number
  is_published: boolean
}

export default function AdminCourseEditPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const isNew = courseId === 'new'

  const [formData, setFormData] = useState<CourseFormData>({
    title_ru: '',
    title_kz: '',
    description_ru: '',
    description_kz: '',
    category: '',
    difficulty: 'beginner',
    cover_url: '',
    sort_order: 0,
    is_published: false,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isNew) {
      fetchCourse()
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`)
      if (!res.ok) throw new Error('Course not found')
      const data = await res.json()
      const c = data.course
      setFormData({
        title_ru: c.title_ru ?? '',
        title_kz: c.title_kz ?? '',
        description_ru: c.description_ru ?? '',
        description_kz: c.description_kz ?? '',
        category: c.category ?? '',
        difficulty: c.difficulty ?? 'beginner',
        cover_url: c.cover_url ?? '',
        sort_order: c.sort_order ?? 0,
        is_published: c.is_published ?? false,
      })
    } catch (err) {
      setError('Не удалось загрузить курс')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const url = isNew ? '/api/admin/courses' : `/api/admin/courses/${courseId}`
      const method = isNew ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save course')
      }

      const data = await res.json()

      if (isNew) {
        router.push(`/admin/courses/${data.course.id}`)
      } else {
        setSuccess('Курс сохранён')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к курсам
        </Link>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Создать курс' : 'Редактировать курс'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titles */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Основная информация</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название (RU) *</label>
              <input
                type="text"
                value={formData.title_ru}
                onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Название курса на русском"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Название (KZ) *</label>
              <input
                type="text"
                value={formData.title_kz}
                onChange={(e) => setFormData({ ...formData, title_kz: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Название курса на казахском"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Описание (RU)</label>
              <textarea
                value={formData.description_ru}
                onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Описание курса на русском"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Описание (KZ)</label>
              <textarea
                value={formData.description_kz}
                onChange={(e) => setFormData({ ...formData, description_kz: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Описание курса на казахском"
              />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Настройки</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Категория</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Например: Программирование"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Сложность</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as CourseFormData['difficulty'] })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="beginner">Начальный</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Порядок сортировки</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">URL обложки</label>
            <input
              type="url"
              value={formData.cover_url}
              onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="is_published" className="text-sm font-medium">
              Опубликован
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>

            {!isNew && (
              <Link
                href={`/admin/courses/${courseId}/videos`}
                className="flex items-center gap-2 rounded-lg border border-input px-6 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
              >
                <Video className="h-4 w-4" />
                Управление видео
              </Link>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
