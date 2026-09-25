/**
 * App-wide Hono typing. Every route/fragment/module uses AppContext so
 * context variables (evlog's request logger) are typed end to end.
 */

import type { EvlogVariables } from 'evlog/hono'
import type { Context } from 'hono'
import type { Child } from 'hono/jsx'

export type AppEnv = EvlogVariables // { Variables: { log: AuditableLogger } }
export type AppContext = Context<AppEnv>
export type JSXNode = Child
export type AppHandler = (c: AppContext) => Promise<Response | JSXNode> | Response | JSXNode

export type JobStatus = 'pending' | 'probing' | 'crawling' | 'packaging' | 'complete' | 'failed'

export type StrategyType = 'llms-txt' | 'github-raw-markdown' | 'direct-raw-md' | 'html-purify'

export interface JobRecord {
  id: string
  input_url: string
  resolved_url: string | null
  product_name: string | null
  status: JobStatus
  strategy: StrategyType | null
  page_count: number
  error_machine: string | null
  error_human: string | null
  title: string | null
  description: string | null
  logo_url: string | null
  github_url: string | null
  doc_platform?: string | null
  r2_prefix: string
  zip_size_bytes: number
  created_at: number
  completed_at: number | null
}

export interface FeedbackRecord {
  id: string
  job_id: string
  kind: string
  email: string
  details: string
  created_at: number
}

export type AnalyticsEventType =
  | 'pageview'
  | 'click'
  | 'job_create'
  | 'zip_download'
  | 'feedback_submit'
export type AnalyticsClientType = 'human' | 'agent' | 'bot'

export interface AnalyticsEventRecord {
  id: number
  session_id: string
  user_id?: string
  codename?: string
  event_type: AnalyticsEventType
  client_type: AnalyticsClientType
  path: string
  action_label?: string
  referrer?: string
  country_code?: string
  country_name?: string
  city?: string
  os?: string
  browser?: string
  device_type?: string
  created_at: number
}

export interface LiveVisitor {
  session_id: string
  user_id?: string
  codename: string
  emoji: string
  client_type: AnalyticsClientType
  current_path: string
  last_action: string
  country_code?: string
  country_name?: string
  city?: string
  browser?: string
  os?: string
  last_active_at: number
}

export interface UserSessionJourney {
  session_id: string
  started_at: number
  last_active_at: number
  duration_seconds: number
  events: AnalyticsEventRecord[]
}

export interface UserDossier {
  user: {
    identifier: string
    codename: string
    emoji: string
    client_type: AnalyticsClientType
    country_code?: string
    country_name?: string
    city?: string
    browser?: string
    os?: string
    device_type?: string
    first_seen: number
    last_seen: number
    total_events: number
    total_sessions: number
  }
  sessions: UserSessionJourney[]
}

export interface AnalyticsSummary {
  live_count: number
  live_visitors: LiveVisitor[]
  total_events: number
  human_views: number
  agent_views: number
  bot_views: number
  top_paths: { path: string; count: number }[]
  top_actions: { action: string; count: number }[]
  top_referrers: { referrer: string; count: number }[]
  top_countries: { country: string; count: number }[]
  recent_events: AnalyticsEventRecord[]
}

export interface StreamEvent {
  type: 'phase' | 'log' | 'progress' | 'error' | 'complete'
  phase?: string
  level?: 'info' | 'warn' | 'error' | 'success'
  message?: string
  done?: number
  total?: number
  current_url?: string
  machine?: string
  human?: string
  docs_url?: string
  zip_url?: string
  product_name?: string
  timestamp: number
}

export interface NavItem {
  title: string
  /** page url; absent for pure grouping nodes (e.g. Frontend/Backend) */
  url?: string
  file?: string
  order?: number
  slug?: string
  items?: NavItem[]
}

export interface NavSection {
  title: string
  slug: string
  tab?: string
  order: number
  items: NavItem[]
}

export interface NavHierarchy {
  title: string
  tabs?: string[]
  sections: NavSection[]
}
