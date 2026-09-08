export type RuleSeverity = 'error' | 'warning' | 'info'

export type RuleCategory = 'registration' | 'connectivity' | 'parking' | 'content'

export type CheckType =
  | 'dns_lookup'
  | 'http_ping'
  | 'parking_broker_redirect'
  | 'parking_server_header'
  | 'parking_html_signals'
  | 'http_status_410'
  | 'live_content'
  | 'bot_blocked'

export interface RuleFailure {
  code: string
  message: string
}

export interface Rule {
  name: string
  description: string
  severity: RuleSeverity
  category: RuleCategory
  check: CheckType
  timeout_ms?: number
  broker_domains?: string[]
  signals?: string[]
  title_signals?: string[]
  min_content_length?: number
  on_fail: RuleFailure
}

export interface RulesConfig {
  rules: Rule[]
}

export interface RuleResult {
  rule: Rule
  passed: boolean
  duration_ms: number
  metadata?: Record<string, unknown>
}

export interface ValidationResult {
  url: string
  host: string
  passed: boolean
  results: RuleResult[]
  failedRule?: RuleResult
  total_duration_ms: number
  state: ValidationState
}

export interface ValidationState {
  dns_resolved: boolean
  http_reachable: boolean
  http_status: number | null
  final_url: string | null
  server_header: string | null
  content_length: number
  is_parked: boolean
  parking_broker: string | null
  has_live_content: boolean
}
