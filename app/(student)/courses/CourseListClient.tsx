'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { CourseCard } from '@/components/student/CourseCard'
import { EmptyState } from '@/components/ui/empty-state'
import { BookOpen } from 'lucide-react'

interface CourseWithProgress {
  id: string
  title_ru: string
  title_kz: string
  cover_url: string | null
  category: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  videoCount: number
  totalDuration: number
  progress: number
}

interface CourseListClientProps {
  courses: CourseWithProgress[]
  lang: 'ru' | 'kz'
}

type StatusFilter = 'all' | 'in-progress' | 'completed'

export function CourseListClient({ courses, lang }: CourseListClientProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const categories = useMemo(() => {
    const cats = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)))
    return cats as string[]
  }, [courses])

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const title = lang === 'kz' ? course.title_kz : course.title_ru
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && course.progress >= 100) ||
        (statusFilter === 'in-progress' && course.progress > 0 && course.progress < 100)
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [courses, search, categoryFilter, statusFilter, lang])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Мои курсы</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courses.length} курсов доступно
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск курсов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Все категории</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex rounded-lg border bg-muted p-1 gap-1">
          {(['all', 'in-progress', 'completed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Все' : s === 'in-progress' ? 'В процессе' : 'Завершённые'}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Курсы не найдены"
          description="Попробуйте изменить параметры поиска или фильтры"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={lang === 'kz' ? course.title_kz : course.title_ru}
              coverUrl={course.cover_url}
              progress={course.progress}
              videoCount={course.videoCount}
              totalDuration={course.totalDuration}
              difficulty={course.difficulty}
              category={course.category}
            />
          ))}
        </div>
      )}
    </div>
  )
}
