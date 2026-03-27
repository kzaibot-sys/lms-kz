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

  const { data: profileRaw } = await supabase
    .from('users')
    .select('language')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { language: string } | null
  const lang = profile?.language ?? 'ru'

  const { data: videoRaw, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !videoRaw) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  const video = videoRaw as any

  // Verify the course is published (unless admin)
  const { data: courseRaw } = await supabase
    .from('courses')
    .select('is_published')
    .eq('id', video.course_id)
    .single()

  const course = courseRaw as { is_published: boolean } | null

  if (!course?.is_published) {
    const { data: adminCheckRaw } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const adminCheck = adminCheckRaw as { role: string } | null
    if (adminCheck?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json({
    ...video,
    title: lang === 'kz' ? video.title_kz : video.title_ru,
    description: lang === 'kz' ? video.description_kz : video.description_ru,
  })
}
