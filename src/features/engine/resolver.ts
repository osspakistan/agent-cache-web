import { JSDOM } from 'jsdom'
import { ErrorFactory } from '../../lib/utils/errors'
import { detectParkedDomain } from '../../lib/utils/parking'

export interface ResolveResult {
  originUrl: string
  docsUrl: string
  productName: string
  title: string
  description: string
  logoUrl: string | null
  githubUrl?: string | null
  resolvedVia?: 'direct' | 'tavily'
}

const COMMON_DOCS_SUBDOMAINS = [
  'docs',
  'doc',
  'developer',
  'developers',
  'api',
  'apis',
  'help',
  'guide',
  'guides',
  'learn',
  'reference',
  'manual',
]

function extractGitHubRepo(html?: string | null): string | null {
  if (!html) return null
  const matches = html.matchAll(
    /href=["'](https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/[^\s"'>]*)?)["']/gi,
  )
  for (const m of matches) {
    const owner = m[2]
    const repo = m[3].replace(/\.git$/, '')
    if (
      !['features', 'sponsors', 'about', 'pricing', 'site', 'topics'].includes(owner) &&
      !['sponsors', 'branding'].includes(repo)
    ) {
      return `https://github.com/${owner}/${repo}`
    }
  }
  return null
}

const GENERIC_WORDS = new Set([
  'docs',
  'documentation',
  'doc',
  'guide',
  'guides',
  'api',
  'apis',
  'api reference',
  'reference',
  'developer',
  'developers',
  'help',
  'home',
  'overview',
  'introduction',
  'getting started',
  'get started',
  'index',
  'welcome',
])

const TAVILY_API_KEY =
  process.env.TAVILY_API_KEY || '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'

export function getRootWebsiteUrl(inputUrl: string): string {
  try {
    const parsed = new URL(inputUrl)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const parts = hostname.split('.')
    let apex = hostname

    if (parts.length > 2) {
      if (COMMON_DOCS_SUBDOMAINS.includes(parts[0])) {
        apex = parts.slice(1).join('.')
      } else {
        const secondTld = parts[parts.length - 2]
        const commonSecondTlds = ['co', 'com', 'org', 'net', 'edu', 'gov']
        if (commonSecondTlds.includes(secondTld) && parts.length > 3) {
          apex = parts.slice(-3).join('.')
        } else {
          apex = parts.slice(-2).join('.')
        }
      }
    }

    return `${parsed.protocol}//${apex}/`
  } catch {
    return inputUrl
  }
}

interface ExtractedHead {
  title?: string
  description?: string
  ogSiteName?: string
  appName?: string
  favicon?: string
}

function cleanCandidate(s: string | null | undefined): string | null {
  if (!s) return null
  let c = s.trim().replace(/^[\s\-–—|:•·]+|[\s\-–—|:•·]+$/g, '')
  c = c.replace(/\s+(docs|documentation|developer docs|api reference)$/i, '').trim()
  if (!c || GENERIC_WORDS.has(c.toLowerCase())) return null
  return c
}

function extractBrandFromTitle(title: string | undefined): string | null {
  if (!title) return null
  const parts = title
    .split(/\s+[-–—|:•·]\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 1) {
    const colParts = title.split(/\s*[:]\s*/)
    if (colParts.length > 1) {
      const b = cleanCandidate(colParts[0])
      if (b && b.length <= 30) return b
    }
    return cleanCandidate(parts[0])
  }

  // Scan right-to-left (e.g. "Introduction - Context.dev")
  for (let i = parts.length - 1; i >= 0; i--) {
    const cand = cleanCandidate(parts[i])
    if (
      cand &&
      !cand.toLowerCase().includes('web framework built on') &&
      !cand.toLowerCase().includes('your last next') &&
      !cand.toLowerCase().includes('getting started with')
    ) {
      if (cand.length <= 30 && !cand.includes(' ')) {
        return cand
      }
    }
  }

  for (const part of parts) {
    const cand = cleanCandidate(part)
    if (cand && cand.length <= 25) return cand
  }

  return cleanCandidate(parts[0])
}

function extractBrandFromHostname(hostname: string): string {
  const clean = hostname.toLowerCase().replace(/^www\./, '')
  const parts = clean.split('.')
  const filtered = parts.filter(
    (p) =>
      !COMMON_DOCS_SUBDOMAINS.includes(p) &&
      !['com', 'dev', 'org', 'io', 'net', 'co', 'ai', 'app', 'sh'].includes(p),
  )
  const candidate = filtered[0] || parts[0]
  return candidate.charAt(0).toUpperCase() + candidate.slice(1)
}

function extractHeadFromHtml(html: string, baseUrl: string): ExtractedHead {
  try {
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
    const headHtml = headMatch ? `<head>${headMatch[1]}</head>` : html.slice(0, 100000)
    const dom = new JSDOM(headHtml)
    const doc = dom.window.document

    const rawTitle = doc.querySelector('title')?.textContent?.trim()
    const ogTitle = doc
      .querySelector('meta[property="og:title"], meta[content][property="og:title"]')
      ?.getAttribute('content')
      ?.trim()
    const twitterTitle = doc
      .querySelector('meta[name="twitter:title"], meta[content][name="twitter:title"]')
      ?.getAttribute('content')
      ?.trim()

    const rawDesc = doc
      .querySelector('meta[name="description"], meta[content][name="description"]')
      ?.getAttribute('content')
      ?.trim()
    const ogDesc = doc
      .querySelector('meta[property="og:description"], meta[content][property="og:description"]')
      ?.getAttribute('content')
      ?.trim()
    const twitterDesc = doc
      .querySelector('meta[name="twitter:description"], meta[content][name="twitter:description"]')
      ?.getAttribute('content')
      ?.trim()

    const ogSiteName = doc
      .querySelector('meta[property="og:site_name"], meta[content][property="og:site_name"]')
      ?.getAttribute('content')
      ?.trim()
    const appName =
      doc
        .querySelector('meta[name="application-name"], meta[content][name="application-name"]')
        ?.getAttribute('content')
        ?.trim() ||
      doc
        .querySelector(
          'meta[name="apple-mobile-web-app-title"], meta[content][name="apple-mobile-web-app-title"]',
        )
        ?.getAttribute('content')
        ?.trim()

    const faviconHref =
      doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
      doc.querySelector('link[rel*="icon"]')?.getAttribute('href')

    let favicon: string | undefined
    if (faviconHref) {
      try {
        favicon = new URL(faviconHref, baseUrl).href
      } catch {}
    }

    const decode = (s: string | null | undefined): string | undefined => {
      if (!s) return undefined
      return s
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    return {
      title: decode(ogTitle || twitterTitle || rawTitle),
      description: decode(ogDesc || rawDesc || twitterDesc),
      ogSiteName: decode(ogSiteName),
      appName: decode(appName),
      favicon,
    }
  } catch {
    return {}
  }
}

export function getApexDomain(inputUrl: string): string {
  try {
    const parsed = new URL(inputUrl)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const parts = hostname.split('.')
    if (parts.length > 2) {
      if (COMMON_DOCS_SUBDOMAINS.includes(parts[0])) {
        return parts.slice(1).join('.')
      }
      const secondTld = parts[parts.length - 2]
      const commonSecondTlds = ['co', 'com', 'org', 'net', 'edu', 'gov']
      if (commonSecondTlds.includes(secondTld) && parts.length > 3) {
        return parts.slice(-3).join('.')
      }
      return parts.slice(-2).join('.')
    }
    return hostname
  } catch {
    return inputUrl
  }
}

export async function resolveViaTavily(siteUrl: string): Promise<string | null> {
  const prompt = `Find the official developer or API documentation for ${siteUrl}. Return only the documentation URL.`
  const targetApex = getApexDomain(siteUrl)

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: prompt,
        include_answer: 'basic',
        search_depth: 'advanced',
      }),
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) return null

    interface TavilyResponse {
      answer?: string
      results?: Array<{ url: string }>
    }
    const data = (await res.json()) as TavilyResponse

    // Helper to verify if candidate belongs to target domain or trusted hosted docs
    const isAffiliatedDomain = (candUrl: string): boolean => {
      try {
        const u = new URL(candUrl)
        const h = u.hostname.toLowerCase()
        if (targetApex && (h === targetApex || h.endsWith(`.${targetApex}`))) {
          return true
        }
        // Also allow recognized doc platforms if path contains the target brand
        const brand = targetApex.split('.')[0]
        if (brand && brand.length >= 3) {
          if (
            (h.endsWith('gitbook.io') ||
              h.endsWith('readme.io') ||
              h.endsWith('mintlify.app') ||
              h.endsWith('github.io')) &&
            (h.includes(brand) || u.pathname.includes(brand))
          ) {
            return true
          }
        }
        return false
      } catch {
        return false
      }
    }

    const rawAnswerMatches =
      (data.answer || '').match(
        /(https?:\/\/[^\s)\],]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)\],]*)?)/gi,
      ) || []
    for (let u of rawAnswerMatches) {
      u = u.replace(/[.,);]+$/, '')
      if (!/^https?:\/\//i.test(u)) u = `https://${u}`
      if (/docs|developer|guide|api/i.test(u) && isAffiliatedDomain(u)) {
        return u
      }
    }

    const resultUrls = (data.results || [])
      .filter(
        (r) =>
          !/github\.com|apidog\.com|youtube|reddit|medium|stackoverflow|linkedin|twitter|facebook/i.test(
            r.url,
          ),
      )
      .map((r) => r.url.replace(/[.,);]+$/, ''))

    for (const cand of resultUrls) {
      if (isAffiliatedDomain(cand)) {
        return cand
      }
    }
  } catch {
    return null
  }
  return null
}

export async function resolveTargetDocs(rawInput: string): Promise<ResolveResult> {
  let target = rawInput.trim()
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`
  }

  const parsed = new URL(target)
  const hostname = parsed.hostname.toLowerCase()
  const rootUrl = getRootWebsiteUrl(target)

  let docsUrl = target
  let resolvedVia: 'direct' | 'tavily' = 'direct'
  let targetHtml = ''
  let rootHtml = ''

  const isAlreadyDocs =
    /docs|documentation|api-reference|developers|guide/i.test(parsed.pathname) ||
    COMMON_DOCS_SUBDOMAINS.some((sub) => hostname.startsWith(`${sub}.`))

  try {
    const [targetRes, rootRes] = await Promise.allSettled([
      fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }),
      target !== rootUrl
        ? fetch(rootUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(8000),
          })
        : Promise.resolve(null),
    ])

    if (targetRes.status === 'fulfilled') {
      if (targetRes.value.ok) {
        targetHtml = await targetRes.value.text()
        if (targetRes.value.url && targetRes.value.url !== target) {
          docsUrl = targetRes.value.url
        }

        // Fast detect parked / for-sale expired domains
        const parkingCheck = await detectParkedDomain(target)
        if (parkingCheck.isParked) {
          throw ErrorFactory.siteGone(target, 410)
        }
      } else if (targetRes.value.status === 410) {
        throw ErrorFactory.siteGone(target, 410)
      } else if (targetRes.value.status === 403) {
        // Also check if 403 was caused by a parking lander (like Sedo Cloudflare challenge)
        const parkingCheck = await detectParkedDomain(target)
        if (parkingCheck.isParked) {
          throw ErrorFactory.siteGone(target, 410)
        }
        // Only throw if target explicitly was a docs URL; if root, let fallback attempt docs subdomain
        if (isAlreadyDocs) {
          throw ErrorFactory.botBlocked(target, 403)
        }
      }
    } else {
      // Direct network rejection - inspect reason
      const reason = targetRes.reason
      const msg = reason instanceof Error ? reason.message : String(reason)
      if (
        /ENOTFOUND|getaddrinfo|EAI_AGAIN|unreachable|ConnectionRefused|FailedToOpenSocket|Unable to connect/i.test(
          msg,
        )
      ) {
        throw reason
      }
    }

    if (rootRes.status === 'fulfilled' && rootRes.value && rootRes.value.ok) {
      rootHtml = await rootRes.value.text()
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') {
      throw err
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (
      /ENOTFOUND|getaddrinfo|EAI_AGAIN|unreachable|ConnectionRefused|FailedToOpenSocket|Unable to connect/i.test(
        msg,
      )
    ) {
      // Re-throw DNS / network failures immediately so caller surfaces DNS_FAILURE
      throw err
    }
    console.warn(`[Resolver] Initial probe warning on ${target}:`, err)
  }

  // If target wasn't docs, search for outbound documentation link in targetHtml
  if (!isAlreadyDocs && targetHtml) {
    const candidates: { url: string; score: number }[] = []

    // 1. DOM-based link extraction with crash resilience
    try {
      const dom = new JSDOM(targetHtml)
      const doc = dom.window.document
      const links = Array.from(doc.querySelectorAll('a[href]'))

      for (const link of links) {
        const href = link.getAttribute('href') || ''
        const text = (link.textContent || '').trim().toLowerCase()
        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:')
        )
          continue

        let fullUrl: string
        try {
          fullUrl = new URL(href, target).href
        } catch {
          continue
        }

        let score = 0
        const parsedLink = new URL(fullUrl)
        const linkHost = parsedLink.hostname.toLowerCase()
        const linkPath = parsedLink.pathname.toLowerCase().replace(/\/$/, '')

        // Subdomain docs (e.g. docs.stripe.com) is the gold standard
        if (COMMON_DOCS_SUBDOMAINS.some((sub) => linkHost.startsWith(`${sub}.`))) {
          score += 100
        }

        // Exact link anchor text
        if (text === 'documentation' || text === 'docs') score += 90
        else if (text === 'api reference' || text === 'developers' || text === 'developer docs')
          score += 60
        else if (text.includes('doc') || text.includes('developer')) score += 40

        // Path matches (exact /docs or /documentation takes top priority over deep guides)
        if (linkPath === '/docs' || linkPath === '/documentation' || linkPath === '/api-reference')
          score += 95
        else if (linkPath.startsWith('/docs/') || linkPath.startsWith('/documentation/'))
          score += 30
        else if (linkPath === '/guides' || linkPath === '/guide') score += 20
        else if (linkPath.startsWith('/guides/') || linkPath.startsWith('/guide/')) score += 10

        if (score > 0) {
          candidates.push({ url: fullUrl, score })
        }
      }
    } catch {}

    // 2. Resilient Regex-based Link Scanner (immune to JSDOM CSS/DOM parser crashes)
    if (candidates.length === 0) {
      try {
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
        const linkMatches = targetHtml.matchAll(linkRegex)
        for (const match of linkMatches) {
          const href = match[1].trim()
          const text = match[2]
            .replace(/<[^>]+>/g, '')
            .trim()
            .toLowerCase()
          if (
            !href ||
            href.startsWith('#') ||
            href.startsWith('javascript:') ||
            href.startsWith('mailto:')
          )
            continue

          let fullUrl: string
          try {
            fullUrl = new URL(href, target).href
          } catch {
            continue
          }

          let score = 0
          const parsedLink = new URL(fullUrl)
          const linkHost = parsedLink.hostname.toLowerCase()
          const linkPath = parsedLink.pathname.toLowerCase().replace(/\/$/, '')

          if (COMMON_DOCS_SUBDOMAINS.some((sub) => linkHost.startsWith(`${sub}.`))) score += 100
          if (
            linkPath === '/docs' ||
            linkPath === '/documentation' ||
            linkPath === '/api-reference'
          )
            score += 95
          if (text === 'documentation' || text === 'docs') score += 90
          else if (text === 'api reference' || text === 'developers' || text === 'developer docs')
            score += 60
          else if (text.includes('doc') || text.includes('developer')) score += 40
          if (linkPath.startsWith('/docs/') || linkPath.startsWith('/documentation/')) score += 30

          if (score > 0) {
            candidates.push({ url: fullUrl, score })
          }
        }
      } catch {}
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score)
      docsUrl = candidates[0].url
    }
  }

  // Fallback to Tavily if direct probe failed, or didn't find docs path
  const isGenericRoot = !/docs|documentation|api|developer|guide/i.test(docsUrl)
  if (!targetHtml || isGenericRoot) {
    const tavilyTarget = await resolveViaTavily(target)
    if (tavilyTarget && tavilyTarget !== target) {
      docsUrl = tavilyTarget
      resolvedVia = 'tavily'
    }
  }

  // Canonical Parent Root Elevation:
  // If resolution returned a deep leaf page (e.g. /docs/reference/api/introduction),
  // check if the parent documentation hub (e.g. /docs or /documentation) exists and returns 200 OK.
  try {
    const pUrl = new URL(docsUrl)
    const m = pUrl.pathname.match(/^(\/(?:docs|documentation|guides?|manual|api))\b/i)
    if (m && pUrl.pathname !== m[1] && pUrl.pathname !== `${m[1]}/`) {
      const candidateRoot = `${pUrl.origin}${m[1]}/`
      try {
        const rootCheck = await fetch(candidateRoot, {
          method: 'HEAD',
          headers: { 'User-Agent': 'agent-cache/1.0' },
          signal: AbortSignal.timeout(4000),
        })
        if (rootCheck.ok && rootCheck.status < 400) {
          docsUrl = candidateRoot
        }
      } catch {}
    }
  } catch {}

  // Ensure trailing slash for directory documentation paths (e.g. /docs -> /docs/)
  // and strip ephemeral tracking parameters (e.g. ?ref=nav, ?utm_source=...)
  try {
    const parsedDocs = new URL(docsUrl)
    const trackingParams = [
      'ref',
      'ref_src',
      'source',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
    ]
    for (const p of trackingParams) {
      parsedDocs.searchParams.delete(p)
    }
    if (
      !parsedDocs.pathname.endsWith('/') &&
      !/\.[a-z0-9]+$/i.test(parsedDocs.pathname) &&
      (parsedDocs.pathname.includes('/docs') ||
        parsedDocs.pathname.includes('/documentation') ||
        parsedDocs.pathname.includes('/guide'))
    ) {
      parsedDocs.pathname = `${parsedDocs.pathname}/`
    }
    docsUrl = parsedDocs.href
  } catch {}

  // If docsUrl resolved to a different endpoint, fetch its HTML for accurate page title/metadata
  let finalDocsHtml = targetHtml
  if (docsUrl !== target) {
    try {
      const dRes = await fetch(docsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(6000),
      })
      if (dRes.ok) {
        finalDocsHtml = await dRes.text()
      }
    } catch {}
  }

  // Extract <head> metadata from docs HTML and root HTML
  const docsHead = finalDocsHtml ? extractHeadFromHtml(finalDocsHtml, docsUrl) : {}
  const rootHead = rootHtml ? extractHeadFromHtml(rootHtml, rootUrl) : {}

  // 1. Resolve clean brand / product name from root website first
  let productName: string | null = null
  for (const candidate of [
    rootHead.ogSiteName,
    rootHead.appName,
    docsHead.ogSiteName,
    docsHead.appName,
  ]) {
    const c = cleanCandidate(candidate)
    if (c) {
      productName = c
      break
    }
  }

  if (!productName) {
    for (const t of [rootHead.title, docsHead.title]) {
      const b = extractBrandFromTitle(t)
      if (b) {
        productName = b
        break
      }
    }
  }

  if (!productName) {
    productName = extractBrandFromHostname(new URL(rootUrl).hostname)
  }

  // 2. Resolve original title from ROOT website first (never generic "Docs" from docs subdomain)
  let title = rootHead.title
  if (!title || GENERIC_WORDS.has(title.toLowerCase())) {
    title = docsHead.title
  }
  if (!title || GENERIC_WORDS.has(title.toLowerCase())) {
    title = `${productName} Documentation`
  }

  // 3. Resolve original meta description from ROOT website first
  let description = rootHead.description || docsHead.description
  if (!description) {
    description = `Official documentation and API reference for ${productName}.`
  }

  // 4. Resolve logo URL from ROOT website first
  const logoUrl = rootHead.favicon || docsHead.favicon || null

  // 5. Unconditionally extract official GitHub repository from root website and docs HTML
  const githubUrl =
    extractGitHubRepo(rootHtml) ||
    extractGitHubRepo(targetHtml) ||
    extractGitHubRepo(finalDocsHtml) ||
    null

  return {
    originUrl: target,
    docsUrl,
    productName,
    title,
    description,
    logoUrl,
    githubUrl,
    resolvedVia,
  }
}
