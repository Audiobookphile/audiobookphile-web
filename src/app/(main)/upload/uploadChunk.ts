import { getMimeType, UploadProgressInfo } from './uploadTypes'

export interface MultipartUploadParams {
  file: File
  uploadId: string
  partUrls: string[]
  partSize: number
  storagePath: string
  cookie: string
  providerPrefix: string
  uploadedBytes: number
  totalSize: number
  onProgress?: (progress: UploadProgressInfo) => void
}

export async function uploadMultipart(params: MultipartUploadParams): Promise<{ uploadedBytes: number; path: string }> {
  const {
    file,
    uploadId,
    partUrls,
    partSize,
    storagePath,
    cookie,
    providerPrefix,
    uploadedBytes,
    totalSize,
    onProgress,
  } = params
  const parts: { PartNumber: number; ETag: string }[] = []
  let partUploadedBytes = 0

  for (let i = 0; i < partUrls.length; i++) {
    const partNumber = i + 1
    const start = i * partSize
    const end = Math.min(start + partSize, file.size)
    const chunk = file.slice(start, end)
    const MAX_PART_RETRIES = 3
    let attempt = 0

    await new Promise<void>((res, rej) => {
      const sendPart = (): void => {
        attempt++
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', partUrls[i], true)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const loaded = uploadedBytes + partUploadedBytes + event.loaded
            onProgress({
              percent: Math.round((loaded / totalSize) * 100),
              loaded,
              total: totalSize,
            })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader('ETag') || `"${partNumber}"`
            parts.push({ PartNumber: partNumber, ETag: etag })
            partUploadedBytes += chunk.size
            res()
          } else if (attempt < MAX_PART_RETRIES && (xhr.status >= 500 || xhr.status === 429)) {
            console.warn(
              `[Multipart] Part ${partNumber} failed with HTTP ${xhr.status}, retrying (${attempt}/${MAX_PART_RETRIES})...`
            )
            setTimeout(sendPart, 1500 * attempt)
          } else {
            rej(new Error(`Part ${partNumber} failed: HTTP ${xhr.status}`))
          }
        }
        xhr.onerror = () => {
          if (attempt < MAX_PART_RETRIES) {
            console.warn(`[Multipart] Part ${partNumber} network error, retrying (${attempt}/${MAX_PART_RETRIES})...`)
            setTimeout(sendPart, 1500 * attempt)
          } else {
            rej(new Error(`Part ${partNumber} network error`))
          }
        }
        xhr.ontimeout = () => {
          if (attempt < MAX_PART_RETRIES) {
            console.warn(`[Multipart] Part ${partNumber} timed out, retrying (${attempt}/${MAX_PART_RETRIES})...`)
            setTimeout(sendPart, 1500 * attempt)
          } else {
            rej(new Error(`Part ${partNumber} upload timed out`))
          }
        }
        xhr.timeout = 3600000
        xhr.send(chunk)
      }
      sendPart()
    })
  }

  // Complete the multipart upload server-side
  const presignUrl = '/api/upload/presign'
  const completeHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cookie}`,
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    completeHeaders['apikey'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }

  const completeRes = await fetch(presignUrl, {
    method: 'POST',
    headers: completeHeaders,
    body: JSON.stringify({
      action: 'complete-multipart',
      filename: storagePath,
      uploadId,
      parts,
    }),
  })

  if (!completeRes.ok) {
    const err = (await completeRes.json().catch(() => ({}))) as {
      error?: string
    }
    throw new Error(`Complete multipart failed: ${err.error ?? completeRes.status}`)
  }

  return {
    uploadedBytes: file.size,
    path: providerPrefix + storagePath,
  }
}

export interface SinglePartUploadParams {
  file: File & { mime_type?: string }
  uploadUrl: string
  storagePath: string
  providerPrefix: string
  uploadedBytes: number
  totalSize: number
  onProgress?: (progress: UploadProgressInfo) => void
}

export async function uploadSinglePart(
  params: SinglePartUploadParams
): Promise<{ uploadedBytes: number; path: string }> {
  const { file, uploadUrl, storagePath, providerPrefix, uploadedBytes, totalSize, onProgress } = params
  const MAX_RETRIES = 3
  let attempt = 0

  return new Promise<{ uploadedBytes: number; path: string }>((resolve, reject) => {
    const attemptUpload = (): void => {
      attempt++
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)

      const contentType = file.type || file.mime_type || getMimeType(file.name) || 'application/octet-stream'

      if (providerPrefix === 'supabase://') {
        xhr.setRequestHeader('Content-Type', contentType)
        xhr.setRequestHeader('x-upsert', 'true')
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const chunkLoaded = uploadedBytes + event.loaded
          onProgress({
            percent: Math.round((chunkLoaded / totalSize) * 100),
            loaded: chunkLoaded,
            total: totalSize,
          })
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            uploadedBytes: file.size,
            path: providerPrefix + storagePath,
          })
        } else {
          if (attempt < MAX_RETRIES && (xhr.status >= 500 || xhr.status === 429)) {
            console.warn(`Upload failed with ${xhr.status}, retrying (${attempt}/${MAX_RETRIES})...`)
            setTimeout(attemptUpload, 2000 * attempt)
          } else {
            reject(new Error(`Failed to upload ${file.name}: HTTP ${xhr.status} ${xhr.responseText}`))
          }
        }
      }

      xhr.onerror = () => {
        if (attempt < MAX_RETRIES) {
          console.warn(`Network error, retrying (${attempt}/${MAX_RETRIES})...`)
          setTimeout(attemptUpload, 2000 * attempt)
        } else {
          reject(new Error(`Network error uploading ${file.name}`))
        }
      }

      xhr.ontimeout = () => {
        if (attempt < MAX_RETRIES) {
          console.warn(`Upload timed out, retrying (${attempt}/${MAX_RETRIES})...`)
          setTimeout(attemptUpload, 2000 * attempt)
        } else {
          reject(new Error(`Upload timed out for ${file.name}`))
        }
      }

      xhr.timeout = 3600000
      xhr.send(file)
    }

    attemptUpload()
  })
}

/**
 * Stream a backup archive to server /api/backups/upload
 */
export async function uploadBackupArchive(
  file: File,
  accessToken: string,
  onProgress?: (progress: UploadProgressInfo) => void
): Promise<void> {
  const form = new FormData()
  form.set('file', file)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/backups/upload', true)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          percent: Math.round((event.loaded / event.total) * 100),
          loaded: event.loaded,
          total: event.total,
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress && file.size > 0) {
          onProgress({
            percent: 100,
            loaded: file.size,
            total: file.size,
          })
        }
        resolve()
      } else {
        const msg = xhr.responseText?.trim() || `Upload failed with status ${xhr.status}`
        reject(new Error(msg))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Upload failed due to network error'))
    }

    xhr.send(form)
  })
}
