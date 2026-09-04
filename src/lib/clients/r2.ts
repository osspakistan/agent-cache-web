import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { StreamEvent } from '../utils/types'

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
    { abortSignal: AbortSignal.timeout(10000) },
  )
}

export async function getFromR2(key: string): Promise<Uint8Array | null> {
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { abortSignal: AbortSignal.timeout(10000) },
    )

    if (!res.Body) return null
    return await res.Body.transformToByteArray()
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'NoSuchKey') {
      return null
    }
    return null
  }
}

export async function appendEventToR2(jobId: string, event: StreamEvent): Promise<void> {
  const eventsKey = `jobs/${jobId}/.dingdong/events.jsonl`
  const logsKey = `jobs/${jobId}/logs.txt`

  try {
    const [existingEvents, existingLogs] = await Promise.all([
      getFromR2(eventsKey),
      getFromR2(logsKey),
    ])

    const line = `${JSON.stringify(event)}\n`
    const time = new Date(event.timestamp).toISOString().split('T')[1].slice(0, 8)
    let logText = `[${time}] [${event.type.toUpperCase()}]`
    if (event.type === 'phase') logText += ` --- Phase: ${event.phase} (${event.message}) ---`
    else if (event.type === 'progress')
      logText += ` [${event.done}/${event.total}] ${event.current_url}`
    else if (event.type === 'log') logText += ` ${event.message}`
    else if (event.type === 'complete') logText += ` SUCCESS: ${event.message}`
    else if (event.type === 'error')
      logText += ` ERROR: machine=${event.machine} human=${event.human}`
    logText += '\n'

    const newEvents = existingEvents
      ? Buffer.concat([existingEvents, Buffer.from(line, 'utf8')])
      : Buffer.from(line, 'utf8')

    const newLogs = existingLogs
      ? Buffer.concat([existingLogs, Buffer.from(logText, 'utf8')])
      : Buffer.from(logText, 'utf8')

    await Promise.all([
      uploadToR2(eventsKey, newEvents, 'text/plain; charset=utf-8'),
      uploadToR2(logsKey, newLogs, 'text/plain; charset=utf-8'),
    ])
  } catch (err) {
    console.error(`[R2] Failed to append event for ${jobId}:`, err)
  }
}

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
      // ignore
    }
  }

  return events
}

export async function readRawLogsFromR2(jobId: string): Promise<string> {
  const logsKey = `jobs/${jobId}/logs.txt`
  const bytes = await getFromR2(logsKey)
  if (!bytes) return 'No logs recorded.'
  return Buffer.from(bytes).toString('utf8')
}
