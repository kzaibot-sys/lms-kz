import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  video_id: z.string().uuid(),
  status: z.enum(['ready', 'error']),
  hls_url: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  duration_seconds: z.number().int().optional(),
  error_message: z.string().optional().nullable(),
  job_id: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify internal secret
    const secret = request.headers.get('x-internal-secret')
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update video
    const updateData: Record<string, unknown> = {
      processing_status: parsed.data.status,
    }

    if (parsed.data.status === 'ready') {
      if (parsed.data.hls_url) updateData.hls_url = parsed.data.hls_url
      if (parsed.data.thumbnail_url) updateData.thumbnail_url = parsed.data.thumbnail_url
      if (parsed.data.duration_seconds !== undefined) updateData.duration_seconds = parsed.data.duration_seconds
    } else {
      updateData.processing_error = parsed.data.error_message ?? 'Unknown error'
    }

    const { error: videoError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', parsed.data.video_id)

    if (videoError) {
      return NextResponse.json({ error: videoError.message }, { status: 500 })
    }

    // Update job if job_id provided
    if (parsed.data.job_id) {
      await supabase
        .from('video_processing_jobs')
        .update({
          status: parsed.data.status === 'ready' ? 'completed' : 'failed',
          output_hls_url: parsed.data.hls_url ?? null,
          error_message: parsed.data.error_message ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', parsed.data.job_id)
    } else {
      // Try to update the most recent pending/processing job for this video
      await supabase
        .from('video_processing_jobs')
        .update({
          status: parsed.data.status === 'ready' ? 'completed' : 'failed',
          output_hls_url: parsed.data.hls_url ?? null,
          error_message: parsed.data.error_message ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('video_id', parsed.data.video_id)
        .in('status', ['pending', 'processing'])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/internal/video-processed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
