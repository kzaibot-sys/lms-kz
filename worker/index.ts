import 'dotenv/config'
import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

import { processYoutube } from './processors/youtube'
import { processUpload } from './processors/upload'
import { convertToHLS, cleanupTempFiles } from './utils/ffmpeg'
import { uploadHLSToStorage } from './utils/storage'
import {
  updateVideoStatus,
  updateJobStatus,
  setJobOutputUrl,
  failJob,
} from './utils/db'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoJobData {
  /** 'youtube' or 'upload' */
  type: 'youtube' | 'upload'
  /** DB video record id */
  videoId: string
  /** DB video_processing_jobs record id */
  jobId: string
  /** Source URL — YouTube link or Supabase Storage signed URL */
  url: string
}

// ─── Redis Connection ─────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
})

connection.on('connect', () => console.log('[redis] Connected'))
connection.on('error', (err) => console.error('[redis] Error:', err.message))

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<VideoJobData>(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    const { type, videoId, jobId, url } = job.data

    console.log(`\n[worker] Starting job ${jobId} | type=${type} | video=${videoId}`)

    // Mark as processing
    await updateJobStatus(jobId, 'processing')
    await updateVideoStatus(videoId, 'processing')

    let inputPath: string | null = null

    try {
      // ── Step 1: Download source ──────────────────────────────────────────
      await job.updateProgress(5)

      if (type === 'youtube') {
        inputPath = await processYoutube(videoId, url)
      } else if (type === 'upload') {
        inputPath = await processUpload(videoId, url)
      } else {
        throw new Error(`Unknown job type: ${type}`)
      }

      console.log(`[worker] Source downloaded: ${inputPath}`)
      await job.updateProgress(30)

      // ── Step 2: Convert to HLS ───────────────────────────────────────────
      const hlsDir = await convertToHLS(inputPath, videoId)
      console.log(`[worker] HLS conversion complete: ${hlsDir}`)
      await job.updateProgress(70)

      // ── Step 3: Upload to Supabase Storage ───────────────────────────────
      const hlsUrl = await uploadHLSToStorage(hlsDir, videoId)
      console.log(`[worker] Uploaded to storage: ${hlsUrl}`)
      await job.updateProgress(95)

      // ── Step 4: Update DB records ─────────────────────────────────────────
      await setJobOutputUrl(jobId, hlsUrl)
      await updateVideoStatus(videoId, 'ready', hlsUrl)
      await updateJobStatus(jobId, 'completed')

      await job.updateProgress(100)
      console.log(`[worker] Job ${jobId} completed successfully`)

      return { hlsUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[worker] Job ${jobId} FAILED:`, message)

      await updateVideoStatus(videoId, 'error', undefined, message)
      await failJob(jobId, message)

      // Re-throw so BullMQ records the failure and can retry
      throw err
    } finally {
      // Always clean up temp files
      if (inputPath) {
        cleanupTempFiles(inputPath, videoId)
      }
    }
  },
  {
    connection,
    concurrency: 2,
    removeOnComplete: {
      age: 60 * 60 * 24, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7, // Keep failed jobs for 7 days
    },
  }
)

// ─── Worker event handlers ────────────────────────────────────────────────────

worker.on('completed', (job) => {
  console.log(`[worker] ✓ Job ${job.id} (${job.data.videoId}) completed`)
})

worker.on('failed', (job, err) => {
  if (job) {
    console.error(`[worker] ✗ Job ${job.id} (${job.data.videoId}) failed:`, err.message)
  } else {
    console.error('[worker] ✗ Unknown job failed:', err.message)
  }
})

worker.on('stalled', (jobId) => {
  console.warn(`[worker] Job ${jobId} stalled`)
})

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err.message)
})

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`\n[worker] Received ${signal}, shutting down gracefully...`)
  await worker.close()
  await connection.quit()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

console.log('[worker] Video processing worker started. Waiting for jobs...')
console.log(`[worker] Queue: video-processing | Concurrency: 2 | Redis: ${REDIS_URL}`)
