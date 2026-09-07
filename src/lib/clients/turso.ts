import { mkdirSync } from 'node:fs'
import { type Client, createClient } from '@libsql/client'
import type { JobRecord } from '../utils/types'

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
  // Auto-migrate existing databases that may lack github_url or doc_platform columns
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
