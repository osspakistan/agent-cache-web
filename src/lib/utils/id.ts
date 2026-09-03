import { customAlphabet } from 'nanoid'

/**
 * 4-character random suffix using lowercase alphanumeric characters.
 */
const generateHexSuffix = customAlphabet('0123456789abcdef', 4)

/**
 * Extract clean hostname (e.g. "htmx.org" or "hono.dev") from any URL input.
 */
export function extractDomainSlug(inputUrl: string): string {
  try {
    let urlStr = inputUrl.trim()
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = `https://${urlStr}`
    }
    const parsed = new URL(urlStr)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
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
