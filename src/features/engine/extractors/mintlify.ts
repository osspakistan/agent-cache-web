/**
 * Mintlify extractor
 *
 * Mintlify embeds the full navigation tree as `{"scopedNav": ...}` in its
 * Next.js App Router RSC streaming payload (`self.__next_f.push` chunks).
 * Each tab may be unhydrated on the initial page load; we probe their entry
 * URLs to fetch the full tab nav.
 *
 * Supported doc stacks: Mintlify, any custom stack built on the same pattern.
 * Known sites: docs.context.dev, many SaaS docs.
 */

import type { NavHierarchy, NavItem, NavSection } from '../../../lib/utils/types'
import type { DocExtractor } from './types'

// ---------------------------------------------------------------------------
// Mintlify type definitions (internal nav shape)
// ---------------------------------------------------------------------------

interface MintlifyPage {
  title?: string
  sidebarTitle?: string
  href?: string
  group?: string
  pages?: (MintlifyPage | string)[]
}

interface MintlifyGroup {
  group?: string
  pages?: (MintlifyPage | string)[]
}

interface MintlifyTab {
  tab?: string
  groups?: MintlifyGroup[]
  pages?: (MintlifyPage | string)[]
  href?: string
}

interface MintlifyNav {
  tabs?: MintlifyTab[]
}

// ---------------------------------------------------------------------------
// RSC payload parser
// ---------------------------------------------------------------------------

function parseScopedNavFromHtml(html: string): MintlifyNav | null {
  // 1. Try Next.js App Router streaming RSC chunks (self.__next_f)
  const nextFPushes = [
    ...html.matchAll(/self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g),
  ].map((m) => {
    try {
      return JSON.parse(m[1])
    } catch {
      return ''
    }
  })
  const combined = nextFPushes.length > 0 ? nextFPushes.join('') : html

  const searchKey = '{"scopedNav":'
  const startIdx = combined.indexOf(searchKey)
  if (startIdx !== -1) {
    let depth = 0
    let inString = false
    let end = -1
    for (let i = startIdx; i < combined.length; i++) {
      const ch = combined[i]
      const prev = combined[i - 1]
      if (ch === '"' && prev === '\\') {
        let b = i - 1
        let count = 0
        while (b >= 0 && combined[b] === '\\') {
          count++
          b--
        }
        if (count % 2 === 1) inString = !inString
      }
      if (!inString) {
        if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            end = i + 1
            break
          }
        }
      }
    }
    if (end !== -1) {
      try {
        const rawSnippet = combined.slice(startIdx, end)
        return JSON.parse(rawSnippet)?.scopedNav as MintlifyNav
      } catch {}
    }
  }

  // 2. Fallback for raw escaped snippet in HTML string
  const key = '{\\"scopedNav\\":'
  const idx = html.indexOf(key)
  if (idx === -1) return null
  let depth = 0
  let inString = false
  let end = -1
  for (let i = idx; i < html.length; i++) {
    const ch = html[i]
    const prev = html[i - 1]
    if (ch === '"' && prev === '\\') {
      let b = i - 1
      let count = 0
      while (b >= 0 && html[b] === '\\') {
        count++
        b--
      }
      if (count % 2 === 1) inString = !inString
    }
    if (!inString) {
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
  }
  if (end === -1) return null
  try {
    const rawSnippet = html.slice(idx, end)
    const cleanJson = rawSnippet.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    return JSON.parse(cleanJson)?.scopedNav as MintlifyNav
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Nav tree builder
// ---------------------------------------------------------------------------

function resolveMintlifyUrl(href: string, docsUrl: string): string {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href
    }
    const docsObj = new URL(docsUrl)
    if (href.startsWith('/')) {
      const pathSegments = docsObj.pathname.split('/').filter(Boolean)
      const commonDocPrefixes = ['docs', 'doc', 'documentation', 'guide', 'guides', 'api']
      const hasDocSubpath =
        pathSegments.length > 0 && commonDocPrefixes.includes(pathSegments[0].toLowerCase())
      if (hasDocSubpath && !href.startsWith(`/${pathSegments[0]}`)) {
        return new URL(`/${pathSegments[0]}${href}`, docsObj.origin).href
      }
      return new URL(href, docsObj.origin).href
    }
    return new URL(href, docsUrl).href
  } catch {
    return new URL(href, docsUrl).href
  }
}

function processMintlifyPages(pages: (MintlifyPage | string)[], docsUrl: string): NavItem[] {
  const items: NavItem[] = []
  let idx = 1
  for (const p of pages || []) {
    if (!p) continue
    if (typeof p === 'object' && p.group && Array.isArray(p.pages) && p.pages.length > 0) {
      const subItems = processMintlifyPages(p.pages, docsUrl)
      if (subItems.length > 0) {
        items.push({
          title: p.group,
          url: subItems[0].url,
          slug: p.group.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          order: idx++,
          items: subItems,
        })
      }
    } else {
      const href = typeof p === 'string' ? p : p.href || ''
      if (!href) continue
      const fullUrl = resolveMintlifyUrl(href, docsUrl)
      const title =
        (typeof p === 'object' ? p.title || p.sidebarTitle : undefined) ||
        (href.split('/').pop() || 'Untitled').replace(/[-_]+/g, ' ')
      const slug =
        (typeof p === 'object' && p.href ? p.href.split('/').filter(Boolean).pop() : undefined) ||
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      items.push({
        title,
        url: fullUrl,
        slug,
        order: idx++,
      })
    }
  }
  return items
}

// ---------------------------------------------------------------------------
// Extractor implementation
// ---------------------------------------------------------------------------

export const mintlifyExtractor: DocExtractor = {
  name: 'mintlify',

  detect(html: string): boolean {
    return html.includes('"scopedNav":') || html.includes('\\"scopedNav\\":')
  },

  async extract(url: string, html: string): Promise<NavHierarchy | null> {
    try {
      const docsUrl = url
      const urlObj = new URL(docsUrl)
      const origin = urlObj.origin
      const initialNav = parseScopedNavFromHtml(html)
      if (!initialNav?.tabs) return null

      const sections: NavSection[] = []
      const processedTabs = new Set<string>()
      let sIdx = 1

      function processHydratedTabs(nav: MintlifyNav) {
        for (const tab of nav.tabs || []) {
          if (!tab.tab || processedTabs.has(tab.tab)) continue
          if (!tab.groups || tab.groups.length === 0) continue

          processedTabs.add(tab.tab)

          for (const grp of tab.groups) {
            const grpTitle = grp.group || tab.tab || 'General'
            const items = processMintlifyPages(grp.pages || [], docsUrl)
            if (items.length > 0) {
              sections.push({
                title: grpTitle,
                slug: grpTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                tab: tab.tab,
                order: sIdx++,
                items,
              })
            }
          }
        }
      }

      // 1. Process initially hydrated tabs
      processHydratedTabs(initialNav)

      // 2. Probe unhydrated tabs
      const basePath = urlObj.pathname.replace(/\/$/, '')
      for (const tab of initialNav.tabs || []) {
        if (tab.tab && !processedTabs.has(tab.tab)) {
          const candidateUrls: string[] = []
          const firstPage = tab.pages?.[0]
          const firstHref = typeof firstPage === 'string' ? firstPage : firstPage?.href
          if (firstHref) {
            candidateUrls.push(resolveMintlifyUrl(firstHref, docsUrl))
          }
          if (tab.href) {
            candidateUrls.push(resolveMintlifyUrl(tab.href, docsUrl))
          }
          const tabSlug = tab.tab.toLowerCase().replace(/\s+/g, '-')
          candidateUrls.push(`${origin}/${tabSlug}`)
          candidateUrls.push(`${origin}/api-reference`)
          if (basePath && basePath !== '') {
            candidateUrls.unshift(`${origin}${basePath}/${tabSlug}`)
            candidateUrls.push(`${origin}${basePath}/api-reference`)
          }

          for (const cand of candidateUrls) {
            try {
              const res = await fetch(cand, {
                headers: { 'User-Agent': 'agent-cache/1.0' },
              })
              if (res.ok) {
                const candHtml = await res.text()
                const candNav = parseScopedNavFromHtml(candHtml)
                if (candNav) {
                  processHydratedTabs(candNav)
                  if (processedTabs.has(tab.tab)) break
                }
              }
            } catch {}
          }
        }
      }

      // 3. Final pass: single-page or non-grouped tabs (e.g. Changelog)
      for (const tab of initialNav.tabs || []) {
        if (tab.tab && !processedTabs.has(tab.tab)) {
          if (tab.pages && tab.pages.length > 0) {
            processedTabs.add(tab.tab)
            const items = processMintlifyPages(tab.pages, docsUrl)
            if (items.length > 0) {
              sections.push({
                title: tab.tab,
                slug: tab.tab.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                tab: tab.tab,
                order: sIdx++,
                items,
              })
            }
          }
        }
      }

      if (sections.length > 0) {
        const tabs = Array.from(
          new Set(sections.map((s) => s.tab).filter((t): t is string => Boolean(t))),
        )
        return {
          title: urlObj.hostname,
          tabs: tabs.length > 0 ? tabs : undefined,
          sections,
        }
      }
      return null
    } catch {
      return null
    }
  },
}
