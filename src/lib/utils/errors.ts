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
      human: `That doesn't look like a valid link. Give me a full URL like https://example.com/docs to start.`,
    })
  },

  botBlocked(url: string, status = 403, rayId?: string): AppError {
    return new AppError({
      code: 'BOT_BLOCKED',
      statusCode: 403,
      machine: `HTTP ${status} Forbidden/WAF block on ${url}. RayID: ${rayId ?? 'none'}`,
      human: `Their site blocked my automated request. If you gave me the homepage, try pasting their direct docs URL or docs subdomain instead.`,
      details: { url, status, rayId },
    })
  },

  zeroPages(url: string): AppError {
    return new AppError({
      code: 'ZERO_PAGES',
      statusCode: 422,
      machine: `Discovery failed: 0 documentation routes discovered across llms.txt, sitemaps, and navigation probing for ${url}`,
      human: `I looked through the links, sitemaps, and navigation, but I couldn't find any documentation pages here. Double check if this site has developer docs.`,
      details: { url },
    })
  },

  dnsFailure(domain: string, cause?: unknown): AppError {
    return new AppError({
      code: 'DNS_FAILURE',
      statusCode: 502,
      machine: `DNS resolution failed for ${domain}: ENOTFOUND or unreachable host`,
      human: `I couldn't reach that address. Check the spelling or see if the site is offline right now.`,
      details: { domain },
      cause,
    })
  },

  timeout(url: string, durationMs: number): AppError {
    return new AppError({
      code: 'TIMEOUT',
      statusCode: 504,
      machine: `Request timed out after ${durationMs}ms while fetching ${url}`,
      human: `Their server took too long to answer. It might be running slow or down right now. Try again in a minute.`,
      details: { url, durationMs },
    })
  },

  rateLimited(url: string, retryAfter?: string): AppError {
    return new AppError({
      code: 'RATE_LIMITED',
      statusCode: 429,
      machine: `HTTP 429 Rate Limited by remote origin: ${url}. Retry-After: ${retryAfter ?? 'unknown'}`,
      human: `Their server asked me to slow down. Wait a minute and try again.`,
      details: { url, retryAfter },
    })
  },

  notFound(id: string): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      statusCode: 404,
      machine: `Job record not found: ${id}`,
      human: `I couldn't find this documentation bundle. The link might have a typo, or it expired.`,
      details: { id },
    })
  },

  siteGone(url: string, status = 410): AppError {
    return new AppError({
      code: 'FETCH_FAILED',
      statusCode: status,
      machine: `Target origin returned HTTP ${status} (Gone / Unreachable): ${url}`,
      human: `That website looks inactive or gone. Check if the address is right or if the project moved.`,
      details: { url, status },
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
      human: `Their server suddenly closed the connection while I was reading it. Try pasting their direct docs link instead.`,
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
    if (
      /ENOTFOUND|getaddrinfo|ConnectionRefused|FailedToOpenSocket|Unable to connect|Was there a typo in the url/i.test(
        rawMsg,
      )
    ) {
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
        humanMessage ?? `I ran into an unexpected problem processing this. Try again in a minute.`,
      cause,
    })
  },
}
