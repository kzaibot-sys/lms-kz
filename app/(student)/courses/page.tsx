import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CourseListClient } from './CourseListClient'
import { PageLoader } from '@/components/ui/loading-spinner'

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

async function getCoursesData(): Promise<CourseWithProgress[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user language preference
  const { data: userProfileRaw } = await supabase
    .from('users')
    .select('language')
    .eq('id', user.id)
    .single()

  const userProfile = userProfileRaw as { language: string } | null
  const lang = userProfile?.language ?? 'ru'

  // Fetch published courses with video counts
  const { data: coursesRaw, error } = await supabase
    .from('courses')
    .select('id, title_ru, title_kz, cover_url, category, difficulty')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (error || !coursesRaw) return []

  const courses = coursesRaw as { id: string; title_ru: string; title_kz: string; cover_url: string | null; category: string | null; difficulty: 'beginner' | 'intermediate' | 'advanced' }[]

  // Fetch video stats for each course
  const courseIds = courses.map((c) => c.id)

  const { data: videosRaw } = await supabase
    .from('videos')
    .select('id, course_id, duration_seconds')
    .in('course_id', courseIds)
    .eq('processing_status', 'ready')

  const videos = videosRaw as { id: string; course_id: string; duration_seconds: number }[] | null

  // Fetch user progress
  const videoIds = videos?.map((v) => v.id) ?? []
  const { data: progressRaw } = videoIds.length
    ? await supabase
        .from('user_progress')
        .select('video_id, is_completed, completion_percentage')
        .eq('user_id', user.id)
        .in('video_id', videoIds)
    : { data: [] as { video_id: string; is_completed: boolean; completion_percentage: number }[] }

  const progress = progressRaw as { video_id: string; is_completed: boolean; completion_percentage: number }[] | null
  const progressMap = new Map((progress ?? []).map((p) => [p.video_id, p]))

  return courses.map((course) => {
    const courseVideos = videos?.filter((v) => v.course_id === course.id) ?? []
    const totalDuration = courseVideos.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)
    const videoCount = courseVideos.length

    let totalProgress = 0
    if (videoCount > 0) {
      const sumProgress = courseVideos.reduce((sum, v) => {
        const p = progressMap.get(v.id)
        return sum + (p?.completion_percentage ?? 0)
      }, 0)
      totalProgress = sumProgress / videoCount
    }

    return {
      id: course.id,
      title_ru: course.title_ru,
      title_kz: course.title_kz,
      cover_url: course.cover_url,
      category: course.category,
      difficulty: course.difficulty,
      videoCount,
      totalDuration,
      progress: totalProgress,
    }
  })
}

export default async function CoursesPage() {
  const courses = await getCoursesData()

  // Detect locale from cookie
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let lang = 'ru'
  if (user) {
    const { data: profile2Raw } = await supabase.from('users').select('language').eq('id', user.id).single()
    const profile2 = profile2Raw as { language: string } | null
    lang = profile2?.language ?? 'ru'
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <CourseListClient courses={courses} lang={lang as 'ru' | 'kz'} />
    </Suspense>
  )
}
