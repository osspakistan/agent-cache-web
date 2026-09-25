import { mkdirSync } from 'node:fs'
import { type Client, createClient } from '@libsql/client'
import type {
  AnalyticsClientType,
  AnalyticsEventRecord,
  AnalyticsEventType,
  AnalyticsSummary,
  FeedbackRecord,
  JobRecord,
  LiveVisitor,
  UserDossier,
  UserSessionJourney,
} from '../utils/types'

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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      client_type TEXT NOT NULL,
      path TEXT NOT NULL,
      action_label TEXT,
      referrer TEXT,
      country_code TEXT,
      country_name TEXT,
      city TEXT,
      os TEXT,
      browser TEXT,
      device_type TEXT,
      created_at INTEGER NOT NULL
    );
  `)
  try {
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);`,
    )
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);`,
    )
  } catch {}
  try {
    await db.execute(`ALTER TABLE analytics_events ADD COLUMN user_id TEXT;`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE analytics_events ADD COLUMN codename TEXT;`)
  } catch {}
  try {
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_analytics_codename ON analytics_events(codename);`,
    )
  } catch {}
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

export async function trackEvent(event: {
  sessionId: string
  userId?: string
  codename?: string
  eventType: AnalyticsEventType
  clientType: AnalyticsClientType
  path: string
  actionLabel?: string
  referrer?: string
  countryCode?: string
  countryName?: string
  city?: string
  os?: string
  browser?: string
  deviceType?: string
}): Promise<void> {
  const db = getTursoClient()
  const now = Date.now()
  await db.execute({
    sql: 'INSERT INTO analytics_events (session_id, user_id, codename, event_type, client_type, path, action_label, referrer, country_code, country_name, city, os, browser, device_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [
      event.sessionId,
      event.userId || null,
      event.codename || null,
      event.eventType,
      event.clientType,
      event.path,
      event.actionLabel || null,
      event.referrer || null,
      event.countryCode || null,
      event.countryName || null,
      event.city || null,
      event.os || null,
      event.browser || null,
      event.deviceType || null,
      now,
    ],
  })
}

export async function getAnalyticsSummary(
  timeRangeMs = 24 * 60 * 60 * 1000,
): Promise<AnalyticsSummary> {
  const db = getTursoClient()
  const since = Date.now() - timeRangeMs
  const liveThreshold = Date.now() - 5 * 60 * 1000 // active in last 5 minutes

  // Live active visitors (group by user_id or session_id)
  const liveRes = await db.execute({
    sql: `SELECT 
            session_id, 
            user_id, 
            codename, 
            client_type, 
            path as current_path, 
            action_label as last_action, 
            country_code, 
            country_name, 
            city, 
            browser, 
            os, 
            MAX(created_at) as last_active_at 
          FROM analytics_events 
          WHERE created_at >= ? 
          GROUP BY COALESCE(user_id, session_id) 
          ORDER BY last_active_at DESC 
          LIMIT 30`,
    args: [liveThreshold],
  })

  const { generateCodename, getEmojiForCodename } = await import('../utils/codename')

  const live_visitors: LiveVisitor[] = liveRes.rows.map((r) => {
    const rawCodename = r.codename ? String(r.codename) : ''
    const fallbackId = String(r.user_id || r.session_id || '')
    const generated = generateCodename(fallbackId)
    const codename = rawCodename || generated.codename
    const emoji = getEmojiForCodename(codename)

    return {
      session_id: String(r.session_id || ''),
      user_id: r.user_id ? String(r.user_id) : undefined,
      codename,
      emoji,
      client_type: (r.client_type || 'human') as AnalyticsClientType,
      current_path: String(r.current_path || '/'),
      last_action: String(r.last_action || 'view'),
      country_code: r.country_code ? String(r.country_code) : undefined,
      country_name: r.country_name ? String(r.country_name) : undefined,
      city: r.city ? String(r.city) : undefined,
      browser: r.browser ? String(r.browser) : undefined,
      os: r.os ? String(r.os) : undefined,
      last_active_at: Number(r.last_active_at || 0),
    }
  })

  // Volume & Client breakdown
  const countsRes = await db.execute({
    sql: "SELECT COUNT(*) as total_events, SUM(CASE WHEN client_type = 'human' THEN 1 ELSE 0 END) as human_views, SUM(CASE WHEN client_type = 'agent' THEN 1 ELSE 0 END) as agent_views, SUM(CASE WHEN client_type = 'bot' THEN 1 ELSE 0 END) as bot_views FROM analytics_events WHERE created_at >= ?",
    args: [since],
  })
  const counts = countsRes.rows[0] as Record<string, unknown>

  // Top visited paths
  const pathsRes = await db.execute({
    sql: "SELECT path, COUNT(*) as count FROM analytics_events WHERE created_at >= ? AND event_type = 'pageview' GROUP BY path ORDER BY count DESC LIMIT 10",
    args: [since],
  })

  // Top user actions / button clicks
  const actionsRes = await db.execute({
    sql: 'SELECT action_label as action, COUNT(*) as count FROM analytics_events WHERE created_at >= ? AND action_label IS NOT NULL GROUP BY action_label ORDER BY count DESC LIMIT 10',
    args: [since],
  })

  // Top Referrers
  const referrersRes = await db.execute({
    sql: "SELECT referrer, COUNT(*) as count FROM analytics_events WHERE created_at >= ? AND referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 8",
    args: [since],
  })

  // Top Countries
  const countriesRes = await db.execute({
    sql: 'SELECT country_name as country, COUNT(*) as count FROM analytics_events WHERE created_at >= ? AND country_name IS NOT NULL GROUP BY country_name ORDER BY count DESC LIMIT 8',
    args: [since],
  })

  // Recent 30 raw events with codename
  const recentRes = await db.execute({
    sql: 'SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 30',
  })

  const recent_events: AnalyticsEventRecord[] = recentRes.rows.map((r) => {
    const rawCodename = r.codename ? String(r.codename) : ''
    const fallbackId = String(r.user_id || r.session_id || '')
    const generated = generateCodename(fallbackId)
    const codename = rawCodename || generated.codename

    return {
      ...(r as unknown as AnalyticsEventRecord),
      codename,
    }
  })

  return {
    live_count: live_visitors.length,
    live_visitors,
    total_events: Number(counts.total_events || 0),
    human_views: Number(counts.human_views || 0),
    agent_views: Number(counts.agent_views || 0),
    bot_views: Number(counts.bot_views || 0),
    top_paths: pathsRes.rows.map((r) => ({
      path: String(r.path || ''),
      count: Number(r.count || 0),
    })),
    top_actions: actionsRes.rows.map((r) => ({
      action: String(r.action || ''),
      count: Number(r.count || 0),
    })),
    top_referrers: referrersRes.rows.map((r) => ({
      referrer: String(r.referrer || ''),
      count: Number(r.count || 0),
    })),
    top_countries: countriesRes.rows.map((r) => ({
      country: String(r.country || ''),
      count: Number(r.count || 0),
    })),
    recent_events,
  }
}

/**
 * Detailed User Journey Dossier by codename, user_id, or session_id
 */
export async function getUserDossier(identifier: string): Promise<UserDossier | null> {
  const db = getTursoClient()
  const clean = identifier.trim()
  if (!clean) return null

  const { generateCodename, getEmojiForCodename } = await import('../utils/codename')

  // Find events matching codename, user_id, or session_id
  const eventsRes = await db.execute({
    sql: `SELECT * FROM analytics_events 
          WHERE codename = ? OR user_id = ? OR session_id = ? OR session_id LIKE ? 
          ORDER BY created_at ASC LIMIT 500`,
    args: [clean, clean, clean, `${clean}%`],
  })

  if (eventsRes.rows.length === 0) {
    return null
  }

  const rawEvents = eventsRes.rows as unknown as AnalyticsEventRecord[]

  // Deduce user attributes from first & latest events
  const firstEv = rawEvents[0]
  const latestEv = rawEvents[rawEvents.length - 1]

  const uid = firstEv.user_id || firstEv.session_id
  const codenameObj = generateCodename(uid)
  const codename = firstEv.codename || latestEv.codename || codenameObj.codename
  const emoji = getEmojiForCodename(codename)

  // Group events by session_id
  const sessionMap = new Map<string, AnalyticsEventRecord[]>()
  for (const ev of rawEvents) {
    const sId = ev.session_id || 'unknown_session'
    let list = sessionMap.get(sId)
    if (!list) {
      list = []
      sessionMap.set(sId, list)
    }
    list.push({
      ...ev,
      codename,
    })
  }

  const sessions: UserSessionJourney[] = []
  for (const [sId, sEvents] of sessionMap.entries()) {
    const start = sEvents[0].created_at
    const end = sEvents[sEvents.length - 1].created_at
    const duration = Math.max(0, Math.round((end - start) / 1000))
    sessions.push({
      session_id: sId,
      started_at: start,
      last_active_at: end,
      duration_seconds: duration,
      events: sEvents,
    })
  }

  // Order sessions newest first
  sessions.sort((a, b) => b.started_at - a.started_at)

  return {
    user: {
      identifier: clean,
      codename,
      emoji,
      client_type: latestEv.client_type,
      country_code: latestEv.country_code,
      country_name: latestEv.country_name,
      city: latestEv.city,
      browser: latestEv.browser,
      os: latestEv.os,
      device_type: latestEv.device_type,
      first_seen: firstEv.created_at,
      last_seen: latestEv.created_at,
      total_events: rawEvents.length,
      total_sessions: sessions.length,
    },
    sessions,
  }
}
