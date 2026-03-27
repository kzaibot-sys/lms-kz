import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, Mail, Phone, Calendar } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'
import { AdminStudentProgressTable } from '@/components/admin/AdminStudentProgressTable'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  params: { id: string }
}

export default async function AdminStudentDetailPage({ params }: Props) {
  const supabase = createClient()

  const { data: studentRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!studentRaw) notFound()

  const student = studentRaw as any

  // Fetch courses with progress for this student
  const { data: coursesRaw } = await supabase
    .from('courses')
    .select('id, title_ru')
    .eq('is_published', true)

  const courses = coursesRaw as { id: string; title_ru: string }[] | null
  const courseList = courses ?? []
  const courseIds = courseList.map((c) => c.id)

  const { data: videosRaw } = courseIds.length
    ? await supabase
        .from('videos')
        .select('id, course_id, duration_seconds')
        .in('course_id', courseIds)
        .eq('processing_status', 'ready')
    : { data: [] as { id: string; course_id: string; duration_seconds: number }[] }

  const videos = videosRaw as { id: string; course_id: string; duration_seconds: number }[] | null
  const videoIds = videos?.map((v) => v.id) ?? []

  const { data: progressDataRaw } = videoIds.length
    ? await supabase
        .from('user_progress')
        .select('video_id, completion_percentage, is_completed, last_watched_at')
        .eq('user_id', params.id)
        .in('video_id', videoIds)
    : { data: [] as { video_id: string; completion_percentage: number; is_completed: boolean; last_watched_at: string }[] }

  const progressData = progressDataRaw as { video_id: string; completion_percentage: number; is_completed: boolean; last_watched_at: string }[] | null

  const progressMap = new Map(progressData?.map((p) => [p.video_id, p]) ?? [])

  const courseProgress = courseList.map((course) => {
    const courseVideos = videos?.filter((v) => v.course_id === course.id) ?? []
    const videoCount = courseVideos.length

    let progress = 0
    let lastWatched: string | null = null

    if (videoCount > 0) {
      const sum = courseVideos.reduce((acc, v) => {
        const p = progressMap.get(v.id)
        if (p?.last_watched_at && (!lastWatched || p.last_watched_at > lastWatched)) {
          lastWatched = p.last_watched_at
        }
        return acc + (p?.completion_percentage ?? 0)
      }, 0)
      progress = sum / videoCount
    }

    return {
      courseId: course.id,
      courseTitle: course.title_ru,
      videoCount,
      progress,
      lastWatched,
    }
  }).filter((c) => c.progress > 0 || c.videoCount > 0)

  return (
    <div className="p-6">
      <Link
        href="/admin/students"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Назад к студентам
      </Link>

      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {student.first_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {student.first_name} {student.last_name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {student.email}
              </span>
              {student.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {student.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Зарегистрирован {format(new Date(student.created_at), 'd MMMM yyyy', { locale: ru })}
              </span>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            student.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {student.status === 'active' ? 'Активный' : 'Заблокирован'}
          </span>
        </div>
      </div>

      {/* Course Progress */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Прогресс по курсам</h2>
        </div>
        <AdminStudentProgressTable
          studentId={params.id}
          courseProgress={courseProgress}
        />
      </div>
    </div>
  )
}
