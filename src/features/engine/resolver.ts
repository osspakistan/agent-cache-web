import { JSDOM } from 'jsdom'

export interface ResolveResult {
  originUrl: string
  docsUrl: string
  productName: string
  title: string
  description: string
  logoUrl: string | null
  resolvedVia?: 'direct' | 'tavily'
}

const COMMON_DOCS_SUBDOMAINS = ['docs', 'developer', 'developers', 'help', 'api']
const COMMON_DOCS_PATHS = ['/docs', '/documentation', '/api-reference', '/developers', '/guide']
const TAVILY_API_KEY =
  process.env.TAVILY_API_KEY || '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'

export async function resolveViaTavily(siteUrl: string): Promise<string | null> {
  const prompt = `Find the official developer or API documentation for ${siteUrl}. Return only the documentation URL.`
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
    // 1. Extract URLs explicitly mentioned in Tavily's concise answer
    const rawAnswerMatches =
      (data.answer || '').match(
        /(https?:\/\/[^\s)\],]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)\],]*)?)/gi,
      ) || []
    for (let u of rawAnswerMatches) {
      u = u.replace(/[.,);]+$/, '')
      if (!/^https?:\/\//i.test(u)) u = `https://${u}`
      if (/docs|developer|guide|api/i.test(u)) return u
    }

    // 2. Filter search result candidates
    const resultUrls = (data.results || [])
      .filter(
        (r) =>
          !/github\.com|apidog\.com|youtube|reddit|medium|stackoverflow|linkedin|twitter|facebook/i.test(
            r.url,
          ),
      )
      .map((r) => r.url.replace(/[.,);]+$/, ''))

    if (resultUrls.length > 0) return resultUrls[0]
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
  const domainParts = hostname.replace(/^www\./, '').split('.')
  const defaultProductName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1)

  let docsUrl = target
  let title = `${defaultProductName} Documentation`
  let description = `Official documentation and API reference for ${defaultProductName}.`
  let logoUrl: string | null = null
  let resolvedVia: 'direct' | 'tavily' = 'direct'
  let directProbeSuccess = false

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      directProbeSuccess = true
      const html = await res.text()
      const dom = new JSDOM(html)
      const doc = dom.window.document

      // Extract metadata
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
      const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
      const docTitle = doc.querySelector('title')?.textContent
      const favicon = doc.querySelector('link[rel*="icon"]')?.getAttribute('href')

      if (ogTitle) title = ogTitle
      else if (docTitle) title = docTitle.trim()

      if (ogDesc) description = ogDesc

      if (favicon) {
        logoUrl = new URL(favicon, target).href
      }

      // Check if current page is already docs or if it links to /docs
      const isAlreadyDocs =
        /docs|documentation|api-reference|developers|guide/i.test(parsed.pathname) ||
        COMMON_DOCS_SUBDOMAINS.some((sub) => hostname.startsWith(`${sub}.`))

      if (!isAlreadyDocs) {
        // Look for outbound documentation link in HTML
        const links = Array.from(doc.querySelectorAll('a[href]'))
        for (const link of links) {
          const href = link.getAttribute('href') || ''
          const text = (link.textContent || '').trim().toLowerCase()

          if (
            text === 'docs' ||
            text === 'documentation' ||
            text === 'api reference' ||
            text === 'developers' ||
            text === 'guides' ||
            COMMON_DOCS_PATHS.some((p) => href.startsWith(p)) ||
            (href.includes('docs.') && href.includes(domainParts.slice(-2).join('.')))
          ) {
            try {
              const candidate = new URL(href, target).href
              docsUrl = candidate
              break
            } catch {
              // Ignore invalid link
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Resolver] Initial probe failed on ${target}:`, err)
  }

  // Fallback to Tavily if direct probe failed, returned non-200, or didn't find docs path
  const isGenericRoot = !/docs|documentation|api|developer|guide/i.test(docsUrl)
  if (!directProbeSuccess || isGenericRoot) {
    const tavilyTarget = await resolveViaTavily(target)
    if (tavilyTarget && tavilyTarget !== target) {
      docsUrl = tavilyTarget
      resolvedVia = 'tavily'
      try {
        const tavilyUrl = new URL(tavilyTarget)
        const tavilyHost = tavilyUrl.hostname.replace(/^www\./, '')
        const tParts = tavilyHost.split('.')
        title = `${tParts[0].charAt(0).toUpperCase() + tParts[0].slice(1)} Documentation`
      } catch {}
    }
  }

  return {
    originUrl: target,
    docsUrl,
    productName: defaultProductName,
    title,
    description,
    logoUrl,
    resolvedVia,
  }
}
