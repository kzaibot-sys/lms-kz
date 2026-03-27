import fs from 'fs'
import https from 'https'
import http from 'http'
import path from 'path'

/**
 * Downloads an uploaded file from a Supabase Storage temp/signed URL
 * to a local /tmp path. Returns the local file path.
 */
export async function processUpload(videoId: string, storageUrl: string): Promise<string> {
  // Determine extension from URL (default to mp4)
  const urlObj = new URL(storageUrl)
  const ext = path.extname(urlObj.pathname) || '.mp4'
  const tmpPath = `/tmp/${videoId}${ext}`

  console.log(`[upload] Downloading ${storageUrl} -> ${tmpPath}`)

  await downloadFile(storageUrl, tmpPath)

  if (!fs.existsSync(tmpPath)) {
    throw new Error(`Download finished but output file not found: ${tmpPath}`)
  }

  const { size } = fs.statSync(tmpPath)
  console.log(`[upload] Downloaded ${(size / 1024 / 1024).toFixed(2)} MB`)

  return tmpPath
}

/**
 * Downloads a URL to a local file path, following redirects.
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)

    const makeRequest = (targetUrl: string) => {
      const protocol = targetUrl.startsWith('https') ? https : http

      protocol
        .get(targetUrl, (response) => {
          // Follow redirects (3xx)
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            response.destroy()
            makeRequest(response.headers.location)
            return
          }

          if (response.statusCode !== 200) {
            file.close()
            fs.unlink(destPath, () => {})
            reject(
              new Error(
                `Failed to download file: HTTP ${response.statusCode} from ${targetUrl}`
              )
            )
            return
          }

          response.pipe(file)

          file.on('finish', () => {
            file.close(() => resolve())
          })

          file.on('error', (err) => {
            fs.unlink(destPath, () => {})
            reject(err)
          })
        })
        .on('error', (err) => {
          file.close()
          fs.unlink(destPath, () => {})
          reject(err)
        })
    }

    makeRequest(url)
  })
}
