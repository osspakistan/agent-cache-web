import dns from 'node:dns/promises'
import { URL_RULES } from './rules'
import type { Rule, RuleResult, ValidationResult, ValidationState } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export function loadRules(): Rule[] {
  return URL_RULES
}

function formatMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '')
}

interface CheckContext {
  url: string
  host: string
  state: ValidationState
}

type CheckFn = (ctx: CheckContext, rule: Rule) => Promise<boolean>

const checks: Record<string, CheckFn> = {
  dns_lookup: async ({ host, state }) => {
    if (host === 'localhost' || host === '127.0.0.1') {
      state.dns_resolved = true
      return true
    }
    try {
      await dns.lookup(host)
      state.dns_resolved = true
      return true
    } catch (dnsErr: unknown) {
      const code = (dnsErr as { code?: string }).code
      if (code === 'ENOTFOUND' || code === 'NODATA') {
        state.dns_resolved = false
        return false
      }
      return false
    }
  },

  http_ping: async ({ url, state }) => {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
      })
      state.http_reachable = true
      state.http_status = res.status
      return true
    } catch {
      state.http_reachable = false
      return false
    }
  },

  parking_broker_redirect: async ({ url, state }, rule) => {
    const brokers = rule.broker_domains || []
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4000),
        redirect: 'manual',
      })

      const location = res.headers.get('location') || ''
      if (location) {
        try {
          const locParsed = new URL(location, url)
          const locHost = locParsed.hostname.toLowerCase()
          for (const broker of brokers) {
            if (locHost === broker || locHost.endsWith(`.${broker}`)) {
              state.is_parked = true
              state.parking_broker = broker.split('.')[0]
              return false
            }
          }
        } catch {}
      }
      return true
    } catch {
      return true
    }
  },

  parking_server_header: async ({ state }, _rule) => {
    try {
      const res = await fetch(state.final_url || '', {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3000),
      })
      const server = (res.headers.get('server') || '').toLowerCase()
      state.server_header = server
      if (server.includes('parking')) {
        state.is_parked = true
        return false
      }
      return true
    } catch {
      return true
    }
  },

  parking_html_signals: async ({ state, host }, rule) => {
    const signals = rule.signals || []
    const titleSignals = rule.title_signals || []
    try {
      const targetUrl = state.final_url || `https://${host}`
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4000),
        redirect: 'follow',
      })

      const text = await res.text()
      const lower = text.toLowerCase()

      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = (titleMatch?.[1] || '').toLowerCase()
      for (const signal of titleSignals) {
        if (title.includes(signal)) {
          state.is_parked = true
          state.parking_broker = detectBroker(lower)
          return false
        }
      }

      for (const signal of signals) {
        if (lower.includes(signal)) {
          state.is_parked = true
          state.parking_broker = detectBroker(lower)
          return false
        }
      }

      const jsRedirect = text.match(
        /window\.location\.(?:href|replace)\s*=\s*["']([^"']+)["']/i,
      )?.[1]
      if (jsRedirect) {
        try {
          const resolvedJs = new URL(jsRedirect, res.url).href
          const subRes = await fetch(resolvedJs, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(2500),
            redirect: 'follow',
          })
          const subText = (await subRes.text()).toLowerCase()
          if (
            subText.includes('godaddy') ||
            subText.includes('sedo') ||
            subText.includes('spaceship') ||
            subText.includes('dan.com') ||
            subText.includes('for sale')
          ) {
            state.is_parked = true
            return false
          }
        } catch {}
      }

      return true
    } catch {
      return true
    }
  },

  http_status_410: async ({ state }) => {
    return state.http_status !== 410
  },

  live_content: async ({ state, host }, rule) => {
    const minLength = rule.min_content_length || 200
    try {
      const targetUrl = state.final_url || `https://${host}`
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      })

      const text = await res.text()
      state.content_length = text.length
      state.final_url = res.url

      if (text.length < minLength) {
        state.has_live_content = false
        return false
      }

      state.has_live_content = true
      return true
    } catch {
      state.has_live_content = false
      return false
    }
  },

  bot_blocked: async ({ state }) => {
    const status = state.http_status
    if (status === 403 || status === 429) {
      return false
    }
    return true
  },
}

function detectBroker(text: string): string {
  if (text.includes('spaceship')) return 'Spaceship'
  if (text.includes('sedo')) return 'Sedo'
  if (text.includes('godaddy')) return 'GoDaddy'
  if (text.includes('dan.com')) return 'Dan.com'
  if (text.includes('afternic')) return 'Afternic'
  return 'domain squatter'
}

export async function validateUrl(rawUrl: string): Promise<ValidationResult> {
  const rules = loadRules()
  const parsed = new URL(rawUrl)
  const host = parsed.hostname.toLowerCase()

  const initialState: ValidationState = {
    dns_resolved: false,
    http_reachable: false,
    http_status: null,
    final_url: null,
    server_header: null,
    content_length: 0,
    is_parked: false,
    parking_broker: null,
    has_live_content: false,
  }

  const ctx: CheckContext = { url: rawUrl, host, state: initialState }
  const results: RuleResult[] = []
  const startTime = Date.now()
  let failedRule: RuleResult | undefined

  for (const rule of rules) {
    if (failedRule && failedRule.rule.severity === 'error') {
      results.push({
        rule,
        passed: false,
        duration_ms: 0,
        metadata: { skipped: true, reason: 'previous_error' },
      })
      continue
    }

    const ruleStart = Date.now()
    const checkFn = checks[rule.check]

    let passed: boolean
    try {
      passed = await checkFn(ctx, rule)
    } catch {
      passed = true
    }

    const duration_ms = Date.now() - ruleStart
    const result: RuleResult = {
      rule,
      passed,
      duration_ms,
    }

    if (!passed) {
      const vars: Record<string, string> = {
        host,
        broker: initialState.parking_broker || 'domain squatter',
      }
      result.metadata = {
        message: formatMessage(rule.on_fail.message, vars),
        code: rule.on_fail.code,
      }

      if (rule.severity === 'error') {
        failedRule = result
      }
    }

    results.push(result)
  }

  return {
    url: rawUrl,
    host,
    passed: !failedRule,
    results,
    failedRule,
    total_duration_ms: Date.now() - startTime,
    state: initialState,
  }
}
