import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user language
  const { data: profileRaw } = await supabase
    .from('users')
    .select('language')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { language: string } | null
  const lang = profile?.language ?? 'ru'

  // Fetch published courses
  const { data: coursesRaw, error } = await supabase
    .from('courses')
    .select('id, title_ru, title_kz, description_ru, description_kz, cover_url, category, difficulty, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const courses = coursesRaw as any[] | null
  const courseList = courses ?? []
  const courseIds = courseList.map((c: any) => c.id)

  // Fetch videos for these courses
  const { data: videosRaw } = courseIds.length
    ? await supabase
        .from('videos')
        .select('id, course_id, duration_seconds')
        .in('course_id', courseIds)
        .eq('processing_status', 'ready')
    : { data: [] as any[] }

  const videos = videosRaw as any[] | null
  const videoList = videos ?? []
  const videoIds = videoList.map((v: any) => v.id)

  // Fetch user progress
  const { data: progressDataRaw } = videoIds.length
    ? await supabase
        .from('user_progress')
        .select('video_id, completion_percentage, is_completed')
        .eq('user_id', user.id)
        .in('video_id', videoIds)
    : { data: [] as any[] }

  const progressData = progressDataRaw as any[] | null
  const progressMap = new Map<string, any>((progressData ?? []).map((p: any) => [p.video_id, p]))

  const result = courseList.map((course) => {
    const courseVideos = videoList.filter((v) => v.course_id === course.id)
    const videoCount = courseVideos.length
    const totalDuration = courseVideos.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)

    let progress = 0
    if (videoCount > 0) {
      const sum = courseVideos.reduce((acc, v) => {
        const p = progressMap.get(v.id)
        return acc + (p?.completion_percentage ?? 0)
      }, 0)
      progress = sum / videoCount
    }

    return {
      id: course.id,
      title: lang === 'kz' ? course.title_kz : course.title_ru,
      title_ru: course.title_ru,
      title_kz: course.title_kz,
      description: lang === 'kz' ? course.description_kz : course.description_ru,
      cover_url: course.cover_url,
      category: course.category,
      difficulty: course.difficulty,
      videoCount,
      totalDuration,
      progress,
    }
  })

  return NextResponse.json(result)
}
