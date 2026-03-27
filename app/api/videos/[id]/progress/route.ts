import { NextRequest, NextResponse } from 'next/server'
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

  const { data: progress, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('video_id', params.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(progress ?? null)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { currentTime?: number; completionPercentage?: number; isCompleted?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { currentTime, completionPercentage, isCompleted } = body

  if (currentTime === undefined || completionPercentage === undefined) {
    return NextResponse.json({ error: 'currentTime and completionPercentage are required' }, { status: 400 })
  }

  const shouldMarkComplete = isCompleted ?? completionPercentage >= 90

  // Upsert progress
  const { data: progressRecord, error } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id: user.id,
        video_id: params.id,
        current_time_seconds: Math.floor(currentTime),
        completion_percentage: Math.min(100, Math.round(completionPercentage)),
        is_completed: shouldMarkComplete,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,video_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If just completed, check if all videos in course are done → issue certificate
  if (shouldMarkComplete) {
    await checkAndIssueCertificate(supabase, user.id, params.id)
  }

  return NextResponse.json(progressRecord)
}

async function checkAndIssueCertificate(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  userId: string,
  videoId: string
) {
  try {
    // Get course_id for this video
    const { data: video } = await supabase
      .from('videos')
      .select('course_id')
      .eq('id', videoId)
      .single()

    if (!video) return

    // Get all ready videos in this course
    const { data: allVideos } = await supabase
      .from('videos')
      .select('id')
      .eq('course_id', video.course_id)
      .eq('processing_status', 'ready')

    if (!allVideos || allVideos.length === 0) return

    const videoIds = allVideos.map((v) => v.id)

    // Get user progress for all videos
    const { data: progressRecords } = await supabase
      .from('user_progress')
      .select('video_id, is_completed')
      .eq('user_id', userId)
      .in('video_id', videoIds)

    const completedIds = new Set(progressRecords?.filter((p) => p.is_completed).map((p) => p.video_id) ?? [])
    const allCompleted = videoIds.every((id) => completedIds.has(id))

    if (!allCompleted) return

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', video.course_id)
      .single()

    if (existingCert) return

    // Issue certificate
    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    await supabase.from('certificates').insert({
      user_id: userId,
      course_id: video.course_id,
      certificate_number: certNumber,
      issued_at: new Date().toISOString(),
    })
  } catch {
    // Non-critical — ignore errors
  }
}
