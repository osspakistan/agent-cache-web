import { mkdirSync } from 'node:fs'
import { type Client, createClient } from '@libsql/client'
import type { JobRecord } from '../../shared/types'

let client: Client | null = null

export function getDb(): Client {
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
  const db = getDb()
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
      r2_prefix TEXT NOT NULL,
      zip_size_bytes INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
  `)

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_jobs_input_url ON jobs(input_url);`)
}

export async function createJob(
  record: Partial<JobRecord> & { id: string; input_url: string; r2_prefix: string },
): Promise<JobRecord> {
  const db = getDb()
  const now = Date.now()

  const full: JobRecord = {
    id: record.id,
    input_url: record.input_url,
    resolved_url: record.resolved_url ?? null,
    product_name: record.product_name ?? null,
    status: record.status ?? 'pending',
    strategy: record.strategy ?? null,
    page_count: record.page_count ?? 0,
    error_machine: record.error_machine ?? null,
    error_human: record.error_human ?? null,
    title: record.title ?? null,
    description: record.description ?? null,
    logo_url: record.logo_url ?? null,
    r2_prefix: record.r2_prefix,
    zip_size_bytes: record.zip_size_bytes ?? 0,
    created_at: record.created_at ?? now,
    completed_at: record.completed_at ?? null,
  }

  await db.execute({
    sql: `
      INSERT INTO jobs (
        id, input_url, resolved_url, product_name, status, strategy,
        page_count, error_machine, error_human, title, description,
        logo_url, r2_prefix, zip_size_bytes, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      full.id,
      full.input_url,
      full.resolved_url,
      full.product_name,
      full.status,
      full.strategy,
      full.page_count,
      full.error_machine,
      full.error_human,
      full.title,
      full.description,
      full.logo_url,
      full.r2_prefix,
      full.zip_size_bytes,
      full.created_at,
      full.completed_at,
    ],
  })

  return full
}

export async function getJobById(id: string): Promise<JobRecord | null> {
  const db = getDb()
  const rs = await db.execute({
    sql: `SELECT * FROM jobs WHERE id = ? LIMIT 1`,
    args: [id],
  })

  if (rs.rows.length === 0) return null
  return rs.rows[0] as unknown as JobRecord
}

export async function updateJob(id: string, updates: Partial<JobRecord>): Promise<void> {
  const db = getDb()
  const keys = Object.keys(updates).filter((k) => k !== 'id')
  if (keys.length === 0) return

  const setClause = keys.map((k) => `${k} = ?`).join(', ')
  const args = keys.map((k) => (updates as any)[k]) as (string | number | null)[]
  args.push(id)

  await db.execute({
    sql: `UPDATE jobs SET ${setClause} WHERE id = ?`,
    args,
  })
}

export async function listCompletedJobs(limit = 50): Promise<JobRecord[]> {
  const db = getDb()
  const rs = await db.execute({
    sql: `SELECT * FROM jobs WHERE status = 'complete' ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  })

  return rs.rows as unknown as JobRecord[]
}
