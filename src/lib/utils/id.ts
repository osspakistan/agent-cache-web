import { customAlphabet } from 'nanoid'

/**
 * 4-character random suffix using lowercase alphanumeric characters.
 */
const generateHexSuffix = customAlphabet('0123456789abcdef', 4)

const COMMON_DOCS_PREFIXES = [
  'docs.',
  'doc.',
  'developer.',
  'developers.',
  'api.',
  'apis.',
  'help.',
  'guide.',
  'guides.',
  'learn.',
  'reference.',
  'manual.',
]

/**
 * Extract clean root domain (e.g. "stripe.com", "htmx.org" or "hono.dev") from any URL input,
 * always stripping docs/developer/api subdomains so IDs are always generated from root.
 */
export function extractDomainSlug(inputUrl: string): string {
  try {
    let urlStr = inputUrl.trim()
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = `https://${urlStr}`
    }
    const parsed = new URL(urlStr)
    let host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    for (const prefix of COMMON_DOCS_PREFIXES) {
      if (host.startsWith(prefix) && host.length > prefix.length) {
        host = host.slice(prefix.length)
        break
      }
    }
    // Ensure only valid URL-safe characters
    const clean = host.replace(/[^a-z0-9.-]/g, '')
    return clean || 'docs'
  } catch {
    return 'docs'
  }
}

/**
 * Generate real-domain ID: {domain.ext}-{4-hex-chars}
 * Examples: "htmx.org-4f8a", "hono.dev-9c2b"
 */
export function generateJobId(inputUrl?: string): string {
  const domain = inputUrl ? extractDomainSlug(inputUrl) : 'docs'
  const suffix = generateHexSuffix()
  return `${domain}-${suffix}`
}

export function isValidJobId(id: string): boolean {
  // Matches {domain.ext}-{4chars} or legacy ac-[a-z0-9]{8}
  return /^[a-z0-9.-]+-[a-z0-9]{4,8}$/i.test(id)
}
