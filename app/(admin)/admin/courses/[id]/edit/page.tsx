import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AdminCourseForm } from '@/components/admin/AdminCourseForm'

interface Props {
  params: { id: string }
}

export default async function AdminEditCoursePage({ params }: Props) {
  const supabase = createClient()

  const { data: courseRaw } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!courseRaw) notFound()

  const course = courseRaw as any

  return (
    <div className="p-6">
      <Link
        href="/admin/courses"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Назад к курсам
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Редактировать курс</h1>
      <AdminCourseForm
        courseId={params.id}
        initialData={{
          titleRu: course.title_ru,
          titleKz: course.title_kz,
          descriptionRu: course.description_ru ?? '',
          descriptionKz: course.description_kz ?? '',
          category: course.category ?? '',
          difficulty: course.difficulty,
          isPublished: course.is_published,
          coverUrl: course.cover_url ?? '',
          sortOrder: course.sort_order,
        }}
      />
    </div>
  )
}
