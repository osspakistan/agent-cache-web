/**
 * Dual-Layer Error System for Agent Cache.
 *
 * 1. Machine Error: Exact, technical, stack trace, status codes (for stdout, evlog, agent).
 * 2. Human Error: Casual, witty, sarcastic, clear, actionable (for browser UI).
 *    NEVER generic cop-outs like "Something went wrong".
 */

export type ErrorCode =
  | 'INVALID_URL'
  | 'BOT_BLOCKED'
  | 'ZERO_PAGES'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'FETCH_FAILED'
  | 'PACKAGING_FAILED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'

export interface AppErrorOptions {
  code: ErrorCode
  machine: string
  human: string
  statusCode?: number
  details?: Record<string, unknown>
  cause?: unknown
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly machine: string
  public readonly human: string
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(opts: AppErrorOptions) {
    super(opts.machine)
    this.name = 'AppError'
    this.code = opts.code
    this.machine = opts.machine
    this.human = opts.human
    this.statusCode = opts.statusCode ?? 500
    this.details = opts.details
    if (opts.cause) {
      this.cause = opts.cause
    }
  }

  toJSON() {
    return {
      error: this.code,
      machine: this.machine,
      human: this.human,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

export const ErrorFactory = {
  invalidUrl(url: string, reason?: string): AppError {
    return new AppError({
      code: 'INVALID_URL',
      statusCode: 400,
      machine: `Invalid URL submitted: "${url}". Reason: ${reason ?? 'Failed URL parse'}`,
      human: `That doesn't look like a real URL. Even our eager crawler needs something like "https://example.com/docs" to sink its teeth into.`,
    })
  },

  botBlocked(url: string, status = 403, rayId?: string): AppError {
    return new AppError({
      code: 'BOT_BLOCKED',
      statusCode: 403,
      machine: `HTTP ${status} Forbidden/WAF block on ${url}. RayID: ${rayId ?? 'none'}`,
      human: `Cloudflare's bouncer took one look at our crawler and slammed the velvet rope. Try feeding us their direct docs subdomain instead of their marketing homepage.`,
      details: { url, status, rayId },
    })
  },

  zeroPages(url: string): AppError {
    return new AppError({
      code: 'ZERO_PAGES',
      statusCode: 422,
      machine: `Discovery failed: 0 documentation routes discovered across llms.txt, sitemaps, and navigation probing for ${url}`,
      human: `We checked the sitemap, peeked at llms.txt, and sniffed every link—this site is guarding its docs like state secrets. Double check if this URL actually hosts developer docs.`,
      details: { url },
    })
  },

  dnsFailure(domain: string, cause?: unknown): AppError {
    return new AppError({
      code: 'DNS_FAILURE',
      statusCode: 502,
      machine: `DNS resolution failed for ${domain}: ENOTFOUND or unreachable host`,
      human: `That domain seems as dead as dial-up internet. Check the spelling before our crawler hurts itself trying to find it.`,
      details: { domain },
      cause,
    })
  },

  timeout(url: string, durationMs: number): AppError {
    return new AppError({
      code: 'TIMEOUT',
      statusCode: 504,
      machine: `Request timed out after ${durationMs}ms while fetching ${url}`,
      human: `Their documentation server took forever to answer. It might be having an afternoon nap or running on a potato. Give it another spin in a moment.`,
      details: { url, durationMs },
    })
  },

  rateLimited(url: string, retryAfter?: string): AppError {
    return new AppError({
      code: 'RATE_LIMITED',
      statusCode: 429,
      machine: `HTTP 429 Rate Limited by remote origin: ${url}. Retry-After: ${retryAfter ?? 'unknown'}`,
      human: `Their server told us to slow our roll. We backed off politely, but they're still catching their breath. Give it a minute and hit retry.`,
      details: { url, retryAfter },
    })
  },

  notFound(id: string): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      statusCode: 404,
      machine: `Job record not found: ${id}`,
      human: `We searched high and low, but this documentation cache doesn't exist. Maybe it vanished into the digital void, or the link has a typo?`,
      details: { id },
    })
  },

  connectionDropped(url: string, rawReason?: string): AppError {
    const cleanReason = (rawReason ?? '')
      .replace(/For more information, pass `verbose: true`.*$/i, '')
      .trim()
    return new AppError({
      code: 'FETCH_FAILED',
      statusCode: 502,
      machine: `Connection closed abruptly by remote server (${url}): ${cleanReason || 'ECONNRESET'}`,
      human: `The remote documentation server abruptly closed the connection. It may be blocking automated requests or temporarily overloaded. Try feeding us a direct documentation subdomain instead.`,
      details: { url, rawReason },
    })
  },

  fromUnknown(err: unknown, url?: string): AppError {
    if (err instanceof AppError) return err
    const rawMsg = err instanceof Error ? err.message : String(err)

    if (/socket connection was closed|ECONNRESET|connection reset/i.test(rawMsg)) {
      return ErrorFactory.connectionDropped(url ?? 'target', rawMsg)
    }
    if (/timeout|timed out|AbortError/i.test(rawMsg)) {
      return ErrorFactory.timeout(url ?? 'target', 10000)
    }
    if (/ENOTFOUND|getaddrinfo/i.test(rawMsg)) {
      return ErrorFactory.dnsFailure(url ?? 'target', err)
    }
    if (/403|Cloudflare|Forbidden/i.test(rawMsg)) {
      return ErrorFactory.botBlocked(url ?? 'target')
    }

    const cleanMsg = rawMsg.replace(/For more information, pass `verbose: true`.*$/i, '').trim()

    return ErrorFactory.internal(cleanMsg, undefined, err)
  },

  internal(machineMessage: string, humanMessage?: string, cause?: unknown): AppError {
    const cleanMsg = machineMessage
      .replace(/For more information, pass `verbose: true`.*$/i, '')
      .trim()
    return new AppError({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      machine: cleanMsg,
      human:
        humanMessage ??
        `Our backend machinery threw a gear trying to process that. The log has been preserved for the nerds to inspect.`,
      cause,
    })
  },
}
