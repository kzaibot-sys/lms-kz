import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { Video, UserProgress } from '@/lib/types/database'
import { VideoPlayer } from '@/components/player'

interface PageProps {
  params: { locale: string; courseId: string; videoId: string }
}

export default async function TelegramVideoPage({ params }: PageProps) {
  const { locale, courseId, videoId } = params
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch current video + all course videos for prev/next navigation
  const [{ data: video, error: videoError }, { data: allVideos }] = await Promise.all([
    supabase.from('videos').select('*').eq('id', videoId).single(),
    supabase
      .from('videos')
      .select('id, order_index')
      .eq('course_id', courseId)
      .eq('processing_status', 'ready')
      .order('order_index', { ascending: true }),
  ])

  if (videoError || !video) {
    notFound()
  }

  const videoData = video as Video
  const videoList = (allVideos ?? []) as Pick<Video, 'id' | 'order_index'>[]

  // Find prev/next
  const currentIdx = videoList.findIndex((v) => v.id === videoId)
  const prevVideoId = currentIdx > 0 ? videoList[currentIdx - 1].id : undefined
  const nextVideoId = currentIdx < videoList.length - 1 ? videoList[currentIdx + 1].id : undefined

  // Fetch saved progress for this user/video
  let savedPosition = 0
  if (user) {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('current_time_seconds')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle()

    if (progress) {
      savedPosition = (progress as UserProgress).current_time_seconds ?? 0
    }
  }

  if (!videoData.hls_url) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Видео ещё обрабатывается. Попробуйте позже.
        </p>
      </div>
    )
  }

  const title = locale === 'kz' ? videoData.title_kz : videoData.title_ru
  const description = locale === 'kz' ? videoData.description_kz : videoData.description_ru

  return (
    <div>
      {/* Back to course */}
      <Link
        href={`/${locale}/tg/courses/${courseId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        К курсу
      </Link>

      {/* Video Player */}
      <div className="mb-4 overflow-hidden rounded-xl">
        <VideoPlayer
          videoId={videoId}
          hlsUrl={videoData.hls_url}
          savedPosition={savedPosition}
          duration={videoData.duration_seconds}
          prevVideoId={prevVideoId}
          nextVideoId={nextVideoId}
          courseId={courseId}
          locale={locale}
        />
      </div>

      {/* Video metadata */}
      <h1 className="mb-2 text-lg font-bold text-foreground">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
