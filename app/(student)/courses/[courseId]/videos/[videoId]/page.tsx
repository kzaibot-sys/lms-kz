import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import VideoPlayer from '@/components/player/VideoPlayer'

interface Props {
  params: { courseId: string; videoId: string }
}

export default async function VideoPage({ params }: Props) {
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
  const lang = (profile?.language ?? 'ru') as 'ru' | 'kz'

  // Fetch course (verify access)
  const { data: courseRaw } = await supabase
    .from('courses')
    .select('id, title_ru, title_kz, is_published')
    .eq('id', params.courseId)
    .eq('is_published', true)
    .single()

  if (!courseRaw) notFound()

  const course = courseRaw as any

  // Fetch current video
  const { data: videoRaw, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', params.videoId)
    .eq('course_id', params.courseId)
    .single()

  if (videoError || !videoRaw) notFound()

  const video = videoRaw as any

  // Fetch all course videos for navigation
  const { data: allVideosRaw } = await supabase
    .from('videos')
    .select('id, title_ru, title_kz, order_index, processing_status')
    .eq('course_id', params.courseId)
    .order('order_index', { ascending: true })

  const allVideos = allVideosRaw as any[] | null
  const videoList = allVideos ?? []
  const currentIndex = videoList.findIndex((v: any) => v.id === params.videoId)
  const prevVideo = currentIndex > 0 ? videoList[currentIndex - 1] : null
  const nextVideo = currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null

  // Fetch user's saved progress for this video
  const { data: progressRaw } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('video_id', params.videoId)
    .single()

  const progress = progressRaw as any

  const savedPosition = progress?.current_time_seconds ?? 0

  const videoTitle = lang === 'kz' ? video.title_kz : video.title_ru
  const videoDescription = lang === 'kz' ? video.description_kz : video.description_ru
  const courseTitle = lang === 'kz' ? course.title_kz : course.title_ru

  const isProcessing = video.processing_status !== 'ready'

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground transition-colors">
          Курсы
        </Link>
        <span>/</span>
        <Link href={`/courses/${params.courseId}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
          {courseTitle}
        </Link>
        <span>/</span>
        <span className="truncate max-w-[200px] text-foreground">{videoTitle}</span>
      </nav>

      {/* Video Player */}
      <div className="mb-4 overflow-hidden rounded-xl">
        {isProcessing ? (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
            <div className="text-center">
              <div className="mb-2 text-4xl">⏳</div>
              <p className="font-medium">Видео обрабатывается...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Пожалуйста, зайдите позже
              </p>
            </div>
          </div>
        ) : !video.hls_url ? (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
            <p className="text-muted-foreground">Видео недоступно</p>
          </div>
        ) : (
          <VideoPlayer
            videoId={video.id}
            hlsUrl={video.hls_url}
            savedPosition={savedPosition}
            duration={video.duration_seconds}
            courseId={params.courseId}
            locale={lang}
            prevVideoId={prevVideo?.id}
            nextVideoId={nextVideo?.id}
          />
        )}
      </div>

      {/* Video Info */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{videoTitle}</h1>
            {videoDescription && (
              <p className="mt-2 text-sm text-muted-foreground">{videoDescription}</p>
            )}
          </div>
          {progress?.is_completed && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Завершено
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        {prevVideo ? (
          <Link
            href={`/courses/${params.courseId}/videos/${prevVideo.id}`}
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            <div className="text-left">
              <div className="text-xs text-muted-foreground">Предыдущее</div>
              <div className="line-clamp-1 max-w-[180px]">
                {lang === 'kz' ? prevVideo.title_kz : prevVideo.title_ru}
              </div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextVideo ? (
          <Link
            href={`/courses/${params.courseId}/videos/${nextVideo.id}`}
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Следующее</div>
              <div className="line-clamp-1 max-w-[180px]">
                {lang === 'kz' ? nextVideo.title_kz : nextVideo.title_ru}
              </div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Video List Sidebar (compact) */}
      {videoList.length > 1 && (
        <div className="mt-8 rounded-xl border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Содержание курса</h2>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {videoList.map((v, idx) => {
              const isCurrent = v.id === params.videoId
              const vTitle = lang === 'kz' ? v.title_kz : v.title_ru
              return (
                <Link
                  key={v.id}
                  href={`/courses/${params.courseId}/videos/${v.id}`}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 ${isCurrent ? 'bg-primary/5 font-medium' : ''}`}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{idx + 1}</span>
                  <span className="flex-1 line-clamp-1">{vTitle}</span>
                  {isCurrent && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
