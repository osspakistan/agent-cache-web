import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'
import type { NavHierarchy, NavItem, NavSection } from '../../lib/utils/types'

const execAsync = promisify(exec)

const NON_DOCS_FILTER =
  /blog|changelog|news|pricing|legal|careers|jobs|podcast|contact|privacy|terms|cookie|press|status|login|signup|assets?|_next|_astro|_nuxt|cdn-cgi|\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot|json|map|zip|tar|gz)(\?.*)?$/i

interface DiscoveredPage {
  title: string
  url: string
  sectionName?: string
}

export interface TopologyOptions {
  llmsTxtUrl?: string
}

export async function extractSiteTopology(
  docsUrl: string,
  options?: TopologyOptions,
): Promise<NavHierarchy> {
  const url = new URL(docsUrl)
  const origin = url.origin
  const pathPrefix = url.pathname.replace(/\/$/, '')
  const sections: NavSection[] = []

  // Normalized URL map to avoid duplicate crawls
  const discoveredMap = new Map<string, DiscoveredPage>()

  function normalizeUrl(u: string): string {
    return u.replace(/\/$/, '').replace(/\.(html|mdx?)$/i, '')
  }

  // 1. Tier 1: Live DOM Sidebar Extraction
  try {
    const res = await fetch(docsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      const html = await res.text()
      const dom = new JSDOM(html)
      const doc = dom.window.document

      const navEl =
        doc.querySelector('nav[data-left-nav]') ||
        doc.querySelector('aside nav') ||
        doc.querySelector('nav[aria-label*="sidebar"]') ||
        doc.querySelector('nav[aria-label*="Documentation"]') ||
        doc.querySelector('aside') ||
        doc.querySelector('nav')

      if (navEl) {
        const headings = navEl.querySelectorAll(
          'h3, h4, h5, [class*="title"], [class*="group-header"], [class*="section-header"]',
        )

        if (headings.length > 0) {
          let sIdx = 1
          for (const heading of Array.from(headings)) {
            const title = (heading.textContent || '').trim()
            if (!title) continue

            const parent = heading.closest('div, section, ul') || heading.parentElement
            const links = parent ? Array.from(parent.querySelectorAll('a[href]')) : []

            const items: NavItem[] = []
            let iIdx = 1
            for (const a of links) {
              const itemTitle = (a.textContent || '').trim()
              const href = a.getAttribute('href') || ''
              if (!itemTitle || !href || href.startsWith('#') || href.startsWith('javascript:'))
                continue

              try {
                const fullUrl = new URL(href, docsUrl).href
                if (fullUrl.startsWith(origin) && !NON_DOCS_FILTER.test(fullUrl)) {
                  const norm = normalizeUrl(fullUrl)
                  if (!items.some((it) => normalizeUrl(it.url) === norm)) {
                    items.push({
                      title: itemTitle,
                      url: fullUrl,
                      order: iIdx++,
                    })
                    discoveredMap.set(norm, { title: itemTitle, url: fullUrl, sectionName: title })
                  }
                }
              } catch {}
            }

            if (items.length > 0) {
              sections.push({
                title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                order: sIdx++,
                items,
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Topology] DOM sidebar probe failed for ${docsUrl}:`, err)
  }

  // If DOM sidebar yielded rich structure (>= 2 sections and >= 4 items), return it directly!
  let domItemCount = 0
  for (const s of sections) domItemCount += s.items.length
  if (sections.length >= 2 && domItemCount >= 4) {
    return {
      title: url.hostname,
      sections,
    }
  }

  // 2. Tier 2: Probe llms.txt (for clean structured link discovery)
  const llmsCandidates = [
    options?.llmsTxtUrl,
    `${origin}/llms.txt`,
    `${origin}${pathPrefix}/llms.txt`,
  ].filter(Boolean) as string[]

  for (const candidate of llmsCandidates) {
    try {
      const res = await fetch(candidate, {
        headers: { 'User-Agent': 'agent-cache-probe/1.0' },
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const text = await res.text()
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g
        let m: RegExpExecArray | null = linkRegex.exec(text)
        while (m !== null) {
          try {
            const rawHref = m[2].trim()
            const linkTitle = m[1].trim()
            const fullUrl = new URL(rawHref, docsUrl).href
            if (
              fullUrl.startsWith(origin) &&
              !fullUrl.endsWith('.txt') &&
              !NON_DOCS_FILTER.test(fullUrl)
            ) {
              const norm = normalizeUrl(fullUrl)
              if (!discoveredMap.has(norm)) {
                discoveredMap.set(norm, { title: linkTitle, url: fullUrl })
              }
            }
          } catch {}
          m = linkRegex.exec(text)
        }
        if (discoveredMap.size >= 4) break
      }
    } catch {}
  }

  // 3. Tier 3: Probe Sitemaps
  for (const sPath of ['/sitemap.xml', `${pathPrefix}/sitemap.xml`, '/sitemap-0.xml']) {
    try {
      const res = await fetch(`${origin}${sPath}`, {
        headers: { 'User-Agent': 'agent-cache-probe/1.0' },
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const xml = await res.text()
        const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g
        let m: RegExpExecArray | null = locRegex.exec(xml)
        while (m !== null) {
          const loc = m[1].trim()
          if (loc.startsWith(origin) && !NON_DOCS_FILTER.test(loc)) {
            const norm = normalizeUrl(loc)
            if (!discoveredMap.has(norm)) {
              discoveredMap.set(norm, { title: '', url: loc })
            }
          }
          m = locRegex.exec(xml)
        }
      }
    } catch {}
  }

  // 4. Tier 4: Katana Crawler Fallback (if fewer than 4 pages found)
  if (discoveredMap.size < 4) {
    try {
      const cmd = `katana -u "${docsUrl}" -fs fqdn -d 2 -c 8 -silent`
      const { stdout } = await execAsync(cmd, { timeout: 12000 })
      const lines = stdout
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      for (const line of lines) {
        if (line.startsWith(origin) && !NON_DOCS_FILTER.test(line)) {
          const norm = normalizeUrl(line)
          if (!discoveredMap.has(norm)) {
            discoveredMap.set(norm, { title: '', url: line })
          }
        }
      }
    } catch {}
  }

  // If still empty, add docsUrl as single root page
  if (discoveredMap.size === 0) {
    discoveredMap.set(normalizeUrl(docsUrl), {
      title: 'Documentation Overview',
      url: docsUrl,
      sectionName: 'Overview',
    })
  }

  // 5. Smart Grouping by URL segments into ordered sections
  const groupMap = new Map<string, NavItem[]>()

  for (const [_norm, page] of discoveredMap.entries()) {
    const pageUrl = new URL(page.url)
    const cleanPath = pageUrl.pathname
      .replace(/^\/docs\/?|^\/documentation\/?|^\/guide\/?|^\/api\/?/, '')
      .replace(/^\//, '')
    const segments = cleanPath.split('/').filter(Boolean)

    let secName = page.sectionName || 'Overview'
    let itemTitle = page.title

    if (!page.sectionName) {
      if (segments.length <= 1) {
        secName = 'Getting Started'
      } else {
        secName = segments[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      }
    }

    if (!itemTitle) {
      const lastSeg = segments[segments.length - 1] || 'Overview'
      itemTitle = lastSeg.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    let groupList = groupMap.get(secName)
    if (!groupList) {
      groupList = []
      groupMap.set(secName, groupList)
    }
    if (!groupList.some((it) => it.url === page.url)) {
      groupList.push({
        title: itemTitle,
        url: page.url,
        order: groupList.length + 1,
      })
    }
  }

  // Sort sections logically: Overview / Getting Started first, Guides second, Reference third
  const sectionRank = (title: string): number => {
    const lower = title.toLowerCase()
    if (lower.includes('start') || lower.includes('intro') || lower.includes('overview')) return 1
    if (lower.includes('guide') || lower.includes('tutorial') || lower.includes('concept')) return 2
    if (lower.includes('core') || lower.includes('feature')) return 3
    if (lower.includes('api') || lower.includes('reference') || lower.includes('sdk')) return 4
    if (lower.includes('config') || lower.includes('deploy') || lower.includes('advanced')) return 5
    return 6
  }

  const sortedSecNames = Array.from(groupMap.keys()).sort((a, b) => {
    const rankDiff = sectionRank(a) - sectionRank(b)
    if (rankDiff !== 0) return rankDiff
    return a.localeCompare(b)
  })

  const finalSections: NavSection[] = sortedSecNames.map((secName, sIdx) => {
    const items = groupMap.get(secName) || []
    return {
      title: secName,
      slug: secName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: sIdx + 1,
      items: items.map((it, iIdx) => ({
        ...it,
        order: iIdx + 1,
      })),
    }
  })

  return {
    title: url.hostname,
    sections: finalSections,
  }
}
