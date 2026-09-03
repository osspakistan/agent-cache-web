import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { StreamEvent } from '../../shared/types'

let s3Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (s3Client) return s3Client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are required',
    )
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return s3Client
}

export function getBucketName(): string {
  return process.env.R2_BUCKET || 'agent-cache'
}

export function getPublicR2Url(key: string): string | null {
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  if (!publicBase) return null
  return `${publicBase}/${key}`
}

/**
 * Upload an individual file directly to R2.
 */
export async function uploadToR2(
  key: string,
  content: string | Uint8Array | Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  const client = getR2Client()
  const bucket = getBucketName()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof content === 'string' ? Buffer.from(content) : content,
      ContentType: contentType,
    }),
  )
}

/**
 * Fetch an object directly from R2.
 */
export async function getFromR2(key: string): Promise<Uint8Array | null> {
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )

    if (!res.Body) return null
    return await res.Body.transformToByteArray()
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name
    if (code === 'NoSuchKey' || code === 'NotFound') return null
    throw err
  }
}

/**
 * Append or save an event directly to R2 .dingdong/events.jsonl
 */
export async function appendEventToR2(jobId: string, event: StreamEvent): Promise<void> {
  const eventsKey = `jobs/${jobId}/.dingdong/events.jsonl`
  const logsKey = `jobs/${jobId}/logs.txt`

  // Format log entry
  const line = JSON.stringify(event) + '\n'
  const time = new Date(event.timestamp).toISOString().split('T')[1].slice(0, 8)
  let logText = `[${time}] [${event.type.toUpperCase()}]`
  if (event.message) logText += ` ${event.message}`
  if (event.machine) logText += ` MACHINE: ${event.machine}`
  if (event.human) logText += ` HUMAN: ${event.human}`
  if (event.current_url) logText += ` (${event.current_url})`
  logText += '\n'

  // Fetch current buffer from R2 and append
  try {
    const currentEvents = (await getFromR2(eventsKey)) ?? new Uint8Array(0)
    const currentLogs = (await getFromR2(logsKey)) ?? new Uint8Array(0)

    const newEvents = Buffer.concat([Buffer.from(currentEvents), Buffer.from(line)])
    const newLogs = Buffer.concat([Buffer.from(currentLogs), Buffer.from(logText)])

    await Promise.all([
      uploadToR2(eventsKey, newEvents, 'text/plain; charset=utf-8'),
      uploadToR2(logsKey, newLogs, 'text/plain; charset=utf-8'),
    ])
  } catch (err) {
    console.error(`[R2] Failed to append event for ${jobId}:`, err)
  }
}

/**
 * Read all events recorded for a job directly from R2.
 */
export async function readEventsFromR2(jobId: string): Promise<StreamEvent[]> {
  const eventsKey = `jobs/${jobId}/.dingdong/events.jsonl`
  const bytes = await getFromR2(eventsKey)
  if (!bytes) return []

  const content = Buffer.from(bytes).toString('utf8')
  const lines = content.split('\n').filter((l) => l.trim().length > 0)
  const events: StreamEvent[] = []

  for (const line of lines) {
    try {
      events.push(JSON.parse(line))
    } catch {
      // Ignore corrupted line
    }
  }

  return events
}

/**
 * Read raw logs recorded for a job directly from R2.
 */
export async function readRawLogsFromR2(jobId: string): Promise<string> {
  const logsKey = `jobs/${jobId}/logs.txt`
  const bytes = await getFromR2(logsKey)
  if (!bytes) return 'No logs recorded.'
  return Buffer.from(bytes).toString('utf8')
}
