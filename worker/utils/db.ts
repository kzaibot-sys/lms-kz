import { createClient } from '@supabase/supabase-js'
import type { ProcessingStatus, JobStatus } from '../../lib/types/database'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Updates the processing_status (and optionally hls_url / processing_error)
 * of a video record in the `videos` table.
 */
export async function updateVideoStatus(
  videoId: string,
  status: ProcessingStatus,
  hlsUrl?: string,
  error?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()

  const updates: Record<string, unknown> = {
    processing_status: status,
  }

  if (hlsUrl !== undefined) {
    updates.hls_url = hlsUrl
  }

  if (error !== undefined) {
    updates.processing_error = error
  } else if (status === 'ready') {
    // Clear any previous error on success
    updates.processing_error = null
  }

  const { error: dbError } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', videoId)

  if (dbError) {
    console.error(`[db] Failed to update video ${videoId} status to ${status}:`, dbError.message)
    throw new Error(`DB update failed: ${dbError.message}`)
  }

  console.log(`[db] Video ${videoId} status -> ${status}${hlsUrl ? ` (hls: ${hlsUrl})` : ''}`)
}

/**
 * Updates the status (and optionally completed_at) of a video_processing_jobs record.
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  completedAt?: Date
): Promise<void> {
  const supabase = getSupabaseAdmin()

  const updates: Record<string, unknown> = {
    status,
  }

  if (completedAt !== undefined) {
    updates.completed_at = completedAt.toISOString()
  } else if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString()
  }

  const { error: dbError } = await supabase
    .from('video_processing_jobs')
    .update(updates)
    .eq('id', jobId)

  if (dbError) {
    console.error(`[db] Failed to update job ${jobId} status to ${status}:`, dbError.message)
    throw new Error(`DB update failed: ${dbError.message}`)
  }

  console.log(`[db] Job ${jobId} status -> ${status}`)
}

/**
 * Marks a job as failed, recording the error message and timestamp.
 */
export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error: dbError } = await supabase
    .from('video_processing_jobs')
    .update({
      status: 'failed' as JobStatus,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (dbError) {
    console.error(`[db] Failed to mark job ${jobId} as failed:`, dbError.message)
  }
}

/**
 * Sets output_hls_url on the job record once HLS upload is complete.
 */
export async function setJobOutputUrl(jobId: string, hlsUrl: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error: dbError } = await supabase
    .from('video_processing_jobs')
    .update({ output_hls_url: hlsUrl })
    .eq('id', jobId)

  if (dbError) {
    console.error(`[db] Failed to set output_hls_url on job ${jobId}:`, dbError.message)
  }
}
