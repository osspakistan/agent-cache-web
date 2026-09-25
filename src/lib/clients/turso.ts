import { mkdirSync } from 'node:fs'
import { type Client, createClient } from '@libsql/client'
import type { FeedbackRecord, JobRecord } from '../utils/types'

let client: Client | null = null

export function getTursoClient(): Client {
  if (client) return client

  let url = process.env.TURSO_DATABASE_URL || 'file:storage/agent-cache.db'
  // Support turso:// URL scheme as libsql://
  if (url.startsWith('turso://')) {
    url = url.replace(/^turso:\/\//, 'libsql://')
  }

  const authToken = process.env.TURSO_AUTH_TOKEN

  if (url.startsWith('file:')) {
    mkdirSync('storage', { recursive: true })
  }

  client = createClient({
    url,
    authToken,
  })

  return client
}

export async function initDb(): Promise<void> {
  const db = getTursoClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      input_url TEXT NOT NULL,
      resolved_url TEXT,
      product_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      strategy TEXT,
      page_count INTEGER DEFAULT 0,
      error_machine TEXT,
      error_human TEXT,
      title TEXT,
      description TEXT,
      logo_url TEXT,
      github_url TEXT,
      doc_platform TEXT,
      r2_prefix TEXT NOT NULL,
      zip_size_bytes INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      email TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)
  try {
    await db.execute(`ALTER TABLE jobs ADD COLUMN github_url TEXT;`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE jobs ADD COLUMN doc_platform TEXT;`)
  } catch {}
}

export async function createJob(data: {
  id: string
  input_url: string
  r2_prefix: string
  status?: string
}): Promise<JobRecord> {
  const db = getTursoClient()
  const now = Date.now()
  const status = data.status || 'pending'

  await db.execute({
    sql: `
      INSERT INTO jobs (id, input_url, r2_prefix, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [data.id, data.input_url, data.r2_prefix, status, now],
  })

  return {
    id: data.id,
    input_url: data.input_url,
    r2_prefix: data.r2_prefix,
    status,
    page_count: 0,
    zip_size_bytes: 0,
    created_at: now,
  } as JobRecord
}

export async function getJobById(id: string): Promise<JobRecord | null> {
  const db = getTursoClient()
  const rs = await db.execute({
    sql: `SELECT * FROM jobs WHERE id = ? LIMIT 1`,
    args: [id],
  })

  if (rs.rows.length === 0) return null
  return rs.rows[0] as unknown as JobRecord
}

export async function updateJob(id: string, updates: Partial<JobRecord>): Promise<void> {
  const db = getTursoClient()
  const keys = Object.keys(updates).filter((k) => k !== 'id')
  if (keys.length === 0) return

  const setClause = keys.map((k) => `${k} = ?`).join(', ')
  const args = keys.map((k) => (updates as Record<string, unknown>)[k]) as (
    | string
    | number
    | null
  )[]
  args.push(id)

  await db.execute({
    sql: `UPDATE jobs SET ${setClause} WHERE id = ?`,
    args,
  })
}

export async function listCompletedJobs(limit = 50): Promise<JobRecord[]> {
  const db = getTursoClient()
  const rs = await db.execute({
    sql: `SELECT * FROM jobs WHERE status = 'complete' ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  })
  return rs.rows as unknown as JobRecord[]
}

export async function createFeedback(data: {
  id: string
  job_id: string
  kind: string
  email: string
  details: string
}): Promise<FeedbackRecord> {
  const db = getTursoClient()
  const now = Date.now()
  await db.execute({
    sql: `INSERT INTO feedback (id, job_id, kind, email, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [data.id, data.job_id, data.kind, data.email, data.details, now],
  })
  return {
    id: data.id,
    job_id: data.job_id,
    kind: data.kind,
    email: data.email,
    details: data.details,
    created_at: now,
  }
}

export async function listFeedback(limit = 100): Promise<FeedbackRecord[]> {
  const db = getTursoClient()
  const rs = await db.execute({
    sql: `SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  })
  return rs.rows as unknown as FeedbackRecord[]
}

export interface AdminStats {
  total_jobs: number
  complete_jobs: number
  failed_jobs: number
  pending_jobs: number
  total_pages: number
  total_bytes: number
  total_feedback: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = getTursoClient()
  const jobRes = await db.execute(`
    SELECT 
      COUNT(*) as total_jobs,
      SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete_jobs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
      SUM(CASE WHEN status NOT IN ('complete', 'failed') THEN 1 ELSE 0 END) as pending_jobs,
      COALESCE(SUM(page_count), 0) as total_pages,
      COALESCE(SUM(zip_size_bytes), 0) as total_bytes
    FROM jobs
  `)
  const fbRes = await db.execute(`SELECT COUNT(*) as total_fb FROM feedback`)

  const j = jobRes.rows[0] as Record<string, unknown>
  const f = fbRes.rows[0] as Record<string, unknown>

  return {
    total_jobs: Number(j.total_jobs || 0),
    complete_jobs: Number(j.complete_jobs || 0),
    failed_jobs: Number(j.failed_jobs || 0),
    pending_jobs: Number(j.pending_jobs || 0),
    total_pages: Number(j.total_pages || 0),
    total_bytes: Number(j.total_bytes || 0),
    total_feedback: Number(f.total_fb || 0),
  }
}

export async function listAllJobs(limit = 100): Promise<JobRecord[]> {
  const db = getTursoClient()
  const rs = await db.execute({
    sql: `SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  })
  return rs.rows as unknown as JobRecord[]
}
