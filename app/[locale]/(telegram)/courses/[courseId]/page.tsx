import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlayCircle, Clock, ChevronLeft, CheckCircle } from 'lucide-react'
import type { Course, Video } from '@/lib/types/database'
import { formatDuration } from '@/lib/utils'

interface PageProps {
  params: { locale: string; courseId: string }
}

export default async function TelegramCourseDetailPage({ params }: PageProps) {
  const { locale, courseId } = params
  const supabase = createClient()

  // Fetch course and videos in parallel
  const [{ data: course, error: courseError }, { data: videos, error: videosError }] =
    await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).eq('is_published', true).single(),
      supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseId)
        .eq('processing_status', 'ready')
        .order('order_index', { ascending: true }),
    ])

  if (courseError || !course) {
    notFound()
  }

  const courseData = course as Course
  const videoList = (videos ?? []) as Video[]

  const title = locale === 'kz' ? courseData.title_kz : courseData.title_ru
  const description =
    locale === 'kz' ? courseData.description_kz : courseData.description_ru

  const totalDuration = videoList.reduce((acc, v) => acc + (v.duration_seconds ?? 0), 0)

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/${locale}/tg/courses`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Назад к курсам
      </Link>

      {/* Course cover */}
      {courseData.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={courseData.cover_url}
          alt={title}
          className="mb-4 w-full rounded-xl object-cover"
          style={{ maxHeight: '200px' }}
        />
      )}

      {/* Course info */}
      <h1 className="mb-2 text-xl font-bold text-foreground">{title}</h1>

      {description && (
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>
      )}

      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <PlayCircle className="h-4 w-4" />
          {videoList.length} видео
        </span>
        {totalDuration > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(totalDuration)}
          </span>
        )}
      </div>

      {/* Video list */}
      {videoList.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center">
          <PlayCircle className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Видеоуроки ещё не добавлены</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Содержание
          </h2>
          {videoList.map((video, idx) => {
            const videoTitle = locale === 'kz' ? video.title_kz : video.title_ru

            return (
              <Link
                key={video.id}
                href={`/${locale}/tg/courses/${courseId}/videos/${video.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors active:bg-muted"
              >
                {/* Index */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{videoTitle}</p>
                  {video.duration_seconds > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(video.duration_seconds)}
                    </p>
                  )}
                </div>

                <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
