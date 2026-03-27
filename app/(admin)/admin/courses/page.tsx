import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminCoursesTable } from '@/components/admin/AdminCoursesTable'
import { Plus } from 'lucide-react'

export default async function AdminCoursesPage() {
  const supabase = createClient()

  const { data: coursesRaw } = await supabase
    .from('courses')
    .select('id, title_ru, title_kz, category, difficulty, is_published, created_at, sort_order')
    .order('sort_order', { ascending: true })

  const courses = coursesRaw as any[] | null

  // Get video counts
  const { data: videosRaw } = await supabase
    .from('videos')
    .select('id, course_id')
    .in('course_id', courses?.map((c) => c.id) ?? [])

  const videos = videosRaw as any[] | null

  const videoCountByCourse = new Map<string, number>()
  videos?.forEach((v) => {
    videoCountByCourse.set(v.course_id, (videoCountByCourse.get(v.course_id) ?? 0) + 1)
  })

  const coursesWithCount = (courses ?? []).map((c) => ({
    ...c,
    videoCount: videoCountByCourse.get(c.id) ?? 0,
  }))

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Управление курсами</h1>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Создать курс
        </Link>
      </div>

      <AdminCoursesTable courses={coursesWithCount} />
    </div>
  )
}
