import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dataRaw } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const data = dataRaw as { role: string } | null
  return data?.role === 'admin' ? user : null
}

const addVideoSchema = z.object({
  title_ru: z.string().min(1),
  title_kz: z.string().min(1),
  description_ru: z.string().optional().nullable(),
  description_kz: z.string().optional().nullable(),
  source_type: z.enum(['youtube', 'upload']),
  original_url: z.string().url().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  duration_seconds: z.number().int().min(0).default(0),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check course exists
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = addVideoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    // Get max order_index
    const { data: maxOrderDataRaw } = await supabase
      .from('videos')
      .select('order_index')
      .eq('course_id', params.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const maxOrderData = maxOrderDataRaw as { order_index: number } | null
    const nextOrder = (maxOrderData?.order_index ?? -1) + 1

    // Insert video
    const { data: video, error: videoError } = await (supabase as any)
      .from('videos')
      .insert({
        course_id: params.id,
        title_ru: parsed.data.title_ru,
        title_kz: parsed.data.title_kz,
        description_ru: parsed.data.description_ru ?? null,
        description_kz: parsed.data.description_kz ?? null,
        source_type: parsed.data.source_type,
        original_url: parsed.data.original_url ?? null,
        thumbnail_url: parsed.data.thumbnail_url ?? null,
        duration_seconds: parsed.data.duration_seconds,
        order_index: nextOrder,
        processing_status: parsed.data.source_type === 'youtube' ? 'pending' : 'pending',
      })
      .select()
      .single()

    if (videoError) {
      return NextResponse.json({ error: videoError.message }, { status: 500 })
    }

    // If YouTube URL provided, create a processing job
    if (parsed.data.source_type === 'youtube' && parsed.data.original_url) {
      await (supabase as any).from('video_processing_jobs').insert({
        video_id: video.id,
        job_type: 'youtube',
        status: 'pending',
        input_url: parsed.data.original_url,
      })
    }

    return NextResponse.json({ video }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/courses/[id]/videos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
