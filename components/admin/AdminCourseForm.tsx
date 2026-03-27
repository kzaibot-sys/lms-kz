'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

interface AdminCourseFormProps {
  courseId?: string
  initialData?: {
    titleRu: string
    titleKz: string
    descriptionRu: string
    descriptionKz: string
    category: string
    difficulty: string
    isPublished: boolean
    coverUrl: string
    sortOrder: number
  }
}

const defaultData = {
  titleRu: '',
  titleKz: '',
  descriptionRu: '',
  descriptionKz: '',
  category: '',
  difficulty: 'beginner',
  isPublished: false,
  coverUrl: '',
  sortOrder: 0,
}

export function AdminCourseForm({ courseId, initialData }: AdminCourseFormProps) {
  const router = useRouter()
  const isEdit = !!courseId

  const [form, setForm] = useState(initialData ?? defaultData)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const payload = {
        title_ru: form.titleRu.trim(),
        title_kz: form.titleKz.trim() || form.titleRu.trim(),
        description_ru: form.descriptionRu.trim() || null,
        description_kz: form.descriptionKz.trim() || null,
        category: form.category.trim() || null,
        difficulty: form.difficulty,
        is_published: form.isPublished,
        cover_url: form.coverUrl.trim() || null,
        sort_order: form.sortOrder,
      }

      const url = isEdit ? `/api/admin/courses/${courseId}` : '/api/admin/courses'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Ошибка сохранения')
      }

      router.push('/admin/courses')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Название (RU) *</label>
          <input
            type="text"
            value={form.titleRu}
            onChange={(e) => handleChange('titleRu', e.target.value)}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Название (KZ)</label>
          <input
            type="text"
            value={form.titleKz}
            onChange={(e) => handleChange('titleKz', e.target.value)}
            placeholder="Если не заполнено — используется RU"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Описание (RU)</label>
        <textarea
          value={form.descriptionRu}
          onChange={(e) => handleChange('descriptionRu', e.target.value)}
          rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Описание (KZ)</label>
        <textarea
          value={form.descriptionKz}
          onChange={(e) => handleChange('descriptionKz', e.target.value)}
          rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Категория</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder="Например: Программирование"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Уровень сложности</label>
          <select
            value={form.difficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">URL обложки</label>
        <input
          type="url"
          value={form.coverUrl}
          onChange={(e) => handleChange('coverUrl', e.target.value)}
          placeholder="https://example.com/cover.jpg"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Порядок сортировки</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => handleChange('sortOrder', parseInt(e.target.value, 10) || 0)}
            min={0}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => handleChange('isPublished', !form.isPublished)}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                form.isPublished ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.isPublished ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-sm font-medium">
              {form.isPublished ? 'Опубликован' : 'Черновик'}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEdit ? 'Сохранить' : 'Создать курс'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/courses')}
          className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
