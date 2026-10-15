import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, bad } from '@/lib/api'
import { S3StorageService } from '@/lib/storage/s3-storage-service'

import path from 'path'
import fs from 'fs'

/**
 * PUT /api/v1/uploads/mock-s3?key=...
 * Dev/test helper endpoint simulating direct S3 upload when AWS credentials are not configured.
 * Saves uploaded file to public/uploads directory for durable local persistence.
 */
async function _PUT(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const key = searchParams.get('key')
  if (!key) {
    return bad('Key query parameter required', 'KEY_REQUIRED')
  }

  const filename = searchParams.get('filename')
  const mimeType = req.headers.get('content-type') || 'application/octet-stream'
  const arrayBuffer = await req.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Extract tenantId and category from key (tenants/{tenantId}/{category}/...)
  const parts = key.split('/')
  const tenantId = searchParams.get('tenantId') || parts[1] || 'mock-tenant'
  const category = (searchParams.get('category') || parts[2] || 'avatars') as any

  if (filename) {
    const dirPath = path.join(process.cwd(), 'public', 'uploads', category)
    try {
      await fs.promises.mkdir(dirPath, { recursive: true })
      await fs.promises.writeFile(path.join(dirPath, filename), buffer)
    } catch {
      // ignore
    }
  }

  await S3StorageService.uploadBufferToS3({
    tenantId,
    category,
    buffer,
    mimeType,
  })

  return ok({
    uploaded: true,
    key,
    size: buffer.length,
    url: filename ? `/uploads/${category}/${filename}` : undefined,
  })
}

export const PUT = withApi(_PUT)
