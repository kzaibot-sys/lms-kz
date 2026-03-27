import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: dataRaw } = await supabase.from('users').select('role').eq('id', user.id).single()
  const data = dataRaw as { role: string } | null
  return data?.role === 'admin' ? user : null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminUser = await checkAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { courseId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { courseId } = body

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Get all videos for this course
  const { data: videosRaw } = await supabase
    .from('videos')
    .select('id')
    .eq('course_id', courseId)

  const videos = videosRaw as { id: string }[] | null

  if (!videos || videos.length === 0) {
    return NextResponse.json({ success: true, deleted: 0 })
  }

  const videoIds = videos.map((v) => v.id)

  // Delete user_progress records
  const { error } = await supabase
    .from('user_progress')
    .delete()
    .eq('user_id', params.id)
    .in('video_id', videoIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
