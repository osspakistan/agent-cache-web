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
  r2_prefix: string
  zip_size_bytes: number
  created_at: number
  completed_at: number | null
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
  url: string
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
