import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const BUCKET = 'videos'

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
 * Recursively collect all files under a directory.
 */
function collectFiles(dir: string): string[] {
  const result: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath))
    } else {
      result.push(fullPath)
    }
  }
  return result
}

/**
 * Determine content-type for HLS file extensions.
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.m3u8':
      return 'application/vnd.apple.mpegurl'
    case '.ts':
      return 'video/mp2t'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Uploads all HLS files (.m3u8 and .ts) from the local HLS output directory
 * to Supabase Storage under videos/[videoId]/.
 *
 * @param hlsDir   Local path to the HLS output directory (e.g. /tmp/abc_hls)
 * @param videoId  Video identifier used as the storage path prefix
 * @returns        Public URL of the master.m3u8 file
 */
export async function uploadHLSToStorage(hlsDir: string, videoId: string): Promise<string> {
  const supabase = getSupabaseAdmin()

  const allFiles = collectFiles(hlsDir)
  const hlsFiles = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return ext === '.m3u8' || ext === '.ts'
  })

  if (hlsFiles.length === 0) {
    throw new Error(`No HLS files found in ${hlsDir}`)
  }

  console.log(`[storage] Uploading ${hlsFiles.length} files for video ${videoId}`)

  // Upload files in parallel batches of 10 to avoid overwhelming the connection
  const BATCH_SIZE = 10
  for (let i = 0; i < hlsFiles.length; i += BATCH_SIZE) {
    const batch = hlsFiles.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (localPath) => {
        // Build storage path relative to hlsDir
        const relativePath = path.relative(hlsDir, localPath).replace(/\\/g, '/')
        const storagePath = `${videoId}/${relativePath}`

        const fileBuffer = fs.readFileSync(localPath)
        const contentType = getContentType(localPath)

        const { error } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        })

        if (error) {
          throw new Error(
            `Failed to upload ${storagePath}: ${error.message}`
          )
        }

        console.log(`[storage] Uploaded ${storagePath}`)
      })
    )
  }

  // Retrieve public URL for master.m3u8
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${videoId}/master.m3u8`)

  if (!data?.publicUrl) {
    throw new Error('Failed to retrieve public URL for master.m3u8')
  }

  console.log(`[storage] Master playlist URL: ${data.publicUrl}`)
  return data.publicUrl
}
