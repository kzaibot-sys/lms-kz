import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile for language + role
  const { data: profileRaw } = await supabase
    .from('users')
    .select('language, role')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { language: string; role: string } | null
  const lang = profile?.language ?? 'ru'
  const isAdmin = profile?.role === 'admin'

  // Fetch course — admins can see drafts
  const query = supabase.from('courses').select('*').eq('id', params.id)
  if (!isAdmin) {
    query.eq('is_published', true)
  }
  const { data: courseRaw, error } = await query.single()

  if (error || !courseRaw) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

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

  const videosWithProgress = videoList.map((v) => {
    const p = progressMap.get(v.id)
    return {
      ...v,
      title: lang === 'kz' ? v.title_kz : v.title_ru,
      description: lang === 'kz' ? v.description_kz : v.description_ru,
      progress: p ?? null,
    }
  })

  let overallProgress = 0
  if (videoList.length > 0) {
    const sum = videoList.reduce((acc, v) => {
      const p = progressMap.get(v.id)
      return acc + (p?.completion_percentage ?? 0)
    }, 0)
    overallProgress = sum / videoList.length
  }

  return NextResponse.json({
    ...course,
    title: lang === 'kz' ? course.title_kz : course.title_ru,
    description: lang === 'kz' ? course.description_kz : course.description_ru,
    videos: videosWithProgress,
    overallProgress,
  })
}
