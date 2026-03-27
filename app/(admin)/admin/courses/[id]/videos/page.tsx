import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminVideoManager } from '@/components/admin/AdminVideoManager'

interface Props {
  params: { id: string }
}

export default async function AdminCourseVideosPage({ params }: Props) {
  const supabase = createClient()

  const { data: courseRaw } = await supabase
    .from('courses')
    .select('id, title_ru, title_kz')
    .eq('id', params.id)
    .single()

  if (!courseRaw) notFound()

  const course = courseRaw as any

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('course_id', params.id)
    .order('order_index', { ascending: true })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Управление видео</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.title_ru}</p>
      </div>

      <AdminVideoManager courseId={params.id} initialVideos={videos ?? []} />
    </div>
  )
}
