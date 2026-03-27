import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

/**
 * Converts an input video file into a multi-quality HLS package.
 * Creates 480p, 720p, and 1080p renditions plus a master playlist.
 *
 * @param inputPath  Local path to the source video file
 * @param videoId    Unique video identifier (used for output directory name)
 * @returns          Path to the output directory containing master.m3u8
 */
export async function convertToHLS(inputPath: string, videoId: string): Promise<string> {
  const outputDir = `/tmp/${videoId}_hls`

  // Create output directories
  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(`${outputDir}/480p`, { recursive: true })
  fs.mkdirSync(`${outputDir}/720p`, { recursive: true })
  fs.mkdirSync(`${outputDir}/1080p`, { recursive: true })

  console.log(`[ffmpeg] Starting HLS conversion for ${inputPath} -> ${outputDir}`)

  // Convert to 3 quality renditions in one pass
  // Each rendition gets its own audio track copy
  execSync(
    `ffmpeg -i "${inputPath}" \
    -filter_complex "[0:v]split=3[v1][v2][v3]" \
    -map "[v1]" -map 0:a:0 -vf scale=854:480 -c:v libx264 -b:v 800k -c:a aac -b:a 128k \
    -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${outputDir}/480p/seg%03d.ts" \
    "${outputDir}/480p/index.m3u8" \
    -map "[v2]" -map 0:a:0 -vf scale=1280:720 -c:v libx264 -b:v 2500k -c:a aac -b:a 128k \
    -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${outputDir}/720p/seg%03d.ts" \
    "${outputDir}/720p/index.m3u8" \
    -map "[v3]" -map 0:a:0 -vf scale=1920:1080 -c:v libx264 -b:v 5000k -c:a aac -b:a 128k \
    -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${outputDir}/1080p/seg%03d.ts" \
    "${outputDir}/1080p/index.m3u8"`,
    {
      timeout: 600_000, // 10 minutes
      maxBuffer: 100 * 1024 * 1024, // 100 MB stdout/stderr buffer
    }
  )

  // Verify all index files were created
  const expectedFiles = [
    path.join(outputDir, '480p', 'index.m3u8'),
    path.join(outputDir, '720p', 'index.m3u8'),
    path.join(outputDir, '1080p', 'index.m3u8'),
  ]
  for (const f of expectedFiles) {
    if (!fs.existsSync(f)) {
      throw new Error(`FFmpeg conversion did not produce expected file: ${f}`)
    }
  }

  // Create master playlist
  const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=928000,RESOLUTION=854x480
480p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2628000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5128000,RESOLUTION=1920x1080
1080p/index.m3u8`

  fs.writeFileSync(`${outputDir}/master.m3u8`, masterContent)
  console.log(`[ffmpeg] Conversion complete. Master playlist: ${outputDir}/master.m3u8`)

  return outputDir
}

/**
 * Removes all temporary files for a given video (input + HLS output dir).
 */
export function cleanupTempFiles(inputPath: string, videoId: string): void {
  try {
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath)
      console.log(`[ffmpeg] Cleaned up input: ${inputPath}`)
    }
  } catch (err) {
    console.warn(`[ffmpeg] Failed to clean up input file: ${err}`)
  }

  try {
    const outputDir = `/tmp/${videoId}_hls`
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true })
      console.log(`[ffmpeg] Cleaned up HLS dir: ${outputDir}`)
    }
  } catch (err) {
    console.warn(`[ffmpeg] Failed to clean up HLS directory: ${err}`)
  }
}
