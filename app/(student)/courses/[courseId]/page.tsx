import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, PlayCircle, Clock, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressBar } from '@/components/ui/progress-bar'
import { formatDuration } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function CourseDetailPage({ params }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user language
  const { data: profileRaw } = await supabase
    .from('users')
    .select('language')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { language: string } | null
  const lang = profile?.language ?? 'ru'

  // Fetch course
  const { data: courseRaw, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .eq('is_published', true)
    .single()

  if (error || !courseRaw) notFound()

  const course = courseRaw as any

  // Fetch videos
  const { data: videosRaw } = await supabase
    .from('videos')
    .select('*')
    .eq('course_id', params.id)
    .eq('processing_status', 'ready')
    .order('order_index', { ascending: true })

  const videos = videosRaw as any[] | null
  const videoList = videos ?? []
  const videoIds = videoList.map((v: any) => v.id)

  // Fetch progress
  const { data: progressDataRaw } = videoIds.length
    ? await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('video_id', videoIds)
    : { data: [] as any[] }

  const progressData = progressDataRaw as any[] | null

  const progressMap = new Map<string, any>((progressData ?? []).map((p: any) => [p.video_id, p]))

  // Calculate overall progress
  let overallProgress = 0
  if (videoList.length > 0) {
    const sumProgress = videoList.reduce((sum, v) => {
      const p = progressMap.get(v.id)
      return sum + (p?.completion_percentage ?? 0)
    }, 0)
    overallProgress = sumProgress / videoList.length
  }

  // Find first incomplete video
  const firstIncomplete = videoList.find((v) => {
    const p = progressMap.get(v.id)
    return !p?.is_completed
  })
  const continueVideoId = firstIncomplete?.id ?? videoList[0]?.id

  const title = lang === 'kz' ? course.title_kz : course.title_ru
  const description = lang === 'kz' ? course.description_kz : course.description_ru
  const totalDuration = videoList.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)

  const difficultyLabels: Record<string, string> = {
    beginner: 'Начинающий',
    intermediate: 'Средний',
    advanced: 'Продвинутый',
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Hero Section */}
      <div className="mb-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Cover */}
        <div className="relative aspect-video bg-muted">
          {course.cover_url ? (
            <Image
              src={course.cover_url}
              alt={title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PlayCircle className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {difficultyLabels[course.difficulty] ?? course.difficulty}
            </span>
            {course.category && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {course.category}
              </span>
            )}
          </div>

          <h1 className="mb-2 text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mb-4 text-muted-foreground">{description}</p>
          )}

          <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4" />
              {videoList.length} видео
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(totalDuration)}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="mb-5 space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Прогресс курса</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <ProgressBar
              value={overallProgress}
              size="md"
              color={overallProgress >= 100 ? 'success' : 'default'}
            />
          </div>

          {/* Continue Button */}
          {continueVideoId && (
            <Link
              href={`/courses/${params.id}/videos/${continueVideoId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PlayCircle className="h-4 w-4" />
              {overallProgress > 0 ? 'Продолжить' : 'Начать курс'}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Video List */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Содержание курса</h2>
        </div>
        <div className="divide-y">
          {videoList.map((video, index) => {
            const p = progressMap.get(video.id)
            const isCompleted = p?.is_completed ?? false
            const videoTitle = lang === 'kz' ? video.title_kz : video.title_ru

            return (
              <Link
                key={video.id}
                href={`/courses/${params.id}/videos/${video.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                {/* Index / Check */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-medium">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="text-muted-foreground">{index + 1}</span>
                  )}
                </div>

                {/* Title */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                    {videoTitle}
                  </p>
                </div>

                {/* Duration */}
                {video.duration_seconds > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
              </Link>
            )
          })}

          {videoList.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Видео в этом курсе пока не добавлены
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
