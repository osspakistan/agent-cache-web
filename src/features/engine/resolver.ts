import { JSDOM } from 'jsdom'

export interface ResolveResult {
  originUrl: string
  docsUrl: string
  productName: string
  title: string
  description: string
  logoUrl: string | null
}

const COMMON_DOCS_SUBDOMAINS = ['docs', 'developer', 'developers', 'help', 'api']
const COMMON_DOCS_PATHS = ['/docs', '/documentation', '/api-reference', '/developers', '/guide']

export async function resolveTargetDocs(rawInput: string): Promise<ResolveResult> {
  let target = rawInput.trim()
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`
  }

  const parsed = new URL(target)
  const hostname = parsed.hostname.toLowerCase()
  const domainParts = hostname.replace(/^www\./, '').split('.')
  const defaultProductName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1)

  // 1. If user gave direct docs path/subdomain, probe it directly
  let docsUrl = target
  let title = `${defaultProductName} Documentation`
  let description = `Official documentation and API reference for ${defaultProductName}.`
  let logoUrl: string | null = null

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
    console.warn(`[Resolver] Initial probe failed on ${target}, using fallback defaults:`, err)
  }

  // Derive cleaner product name from Title if possible
  if (title?.includes('|')) {
    const part = title.split('|')[0].trim()
    if (part.length < 30) {
      // e.g. "Hono - Web Framework" -> "Hono"
    }
  }

  return {
    originUrl: target,
    docsUrl,
    productName: defaultProductName,
    title,
    description,
    logoUrl,
  }
}
