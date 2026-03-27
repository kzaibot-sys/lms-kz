import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Lock } from 'lucide-react'
import type { Course } from '@/lib/types/database'

interface PageProps {
  params: { locale: string }
}

export default async function TelegramCoursesPage({ params }: PageProps) {
  const { locale } = params
  const supabase = createClient()

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Не удалось загрузить курсы
      </div>
    )
  }

  const courseList = (courses ?? []) as Course[]

  if (courseList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Курсов пока нет</p>
        <p className="mt-1 text-sm text-muted-foreground">Загляните позже</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-foreground">Курсы</h1>
      <div className="space-y-3">
        {courseList.map((course) => {
          const title = locale === 'kz' ? course.title_kz : course.title_ru
          const description =
            locale === 'kz' ? course.description_kz : course.description_ru

          return (
            <Link
              key={course.id}
              href={`/${locale}/tg/courses/${course.id}`}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors active:bg-muted"
            >
              {/* Cover image or placeholder */}
              {course.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.cover_url}
                  alt={title}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BookOpen className="h-7 w-7 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{title}</p>
                {description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      course.difficulty === 'beginner'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : course.difficulty === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {course.difficulty === 'beginner'
                      ? 'Начинающий'
                      : course.difficulty === 'intermediate'
                      ? 'Средний'
                      : 'Продвинутый'}
                  </span>
                  {course.category && (
                    <span className="text-xs text-muted-foreground">{course.category}</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
