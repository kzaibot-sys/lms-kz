import { execSync } from 'child_process'
import fs from 'fs'

/**
 * Downloads a YouTube video to /tmp using yt-dlp.
 * Returns the local path of the downloaded .mp4 file.
 */
export async function processYoutube(videoId: string, url: string): Promise<string> {
  const tmpPath = `/tmp/${videoId}.mp4`

  // Clean up any leftover file from a previous failed attempt
  if (fs.existsSync(tmpPath)) {
    fs.unlinkSync(tmpPath)
  }

  console.log(`[youtube] Downloading ${url} -> ${tmpPath}`)

  execSync(
    `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" -o "${tmpPath}" "${url}"`,
    {
      timeout: 300_000, // 5 minutes
      maxBuffer: 50 * 1024 * 1024, // 50 MB stdout/stderr buffer
    }
  )

  if (!fs.existsSync(tmpPath)) {
    throw new Error(`yt-dlp finished but output file not found: ${tmpPath}`)
  }

  const { size } = fs.statSync(tmpPath)
  console.log(`[youtube] Downloaded ${(size / 1024 / 1024).toFixed(2)} MB`)

  return tmpPath
}
