/**
 * Structured llms.txt extractor
 *
 * Many modern developer-focused platforms publish an official /llms.txt
 * containing a complete, curated, hierarchical documentation taxonomy with
 * headings (H2 tabs/sections) and multi-level nested bullet lists.
 *
 * Supported patterns:
 *   - Tabbed / Multi-section: `## TabName` or `## SectionName`
 *   - Nested groups: `- GroupName` followed by indented sub-bullets
 *   - Leaf items: `- [Title](url)` or `    - [Title](url)`
 *   - Machine-readable markdown paths: `/docs-markdown/...` -> `/docs/...`
 */

import type { NavHierarchy, NavItem, NavSection } from '../../../lib/utils/types'
import type { DocExtractor, ScopeCheck } from './types'

export function parseHierarchicalLlmsTxt(
  text: string,
  baseUrl: string,
  scopeCheck?: ScopeCheck,
): { tabs?: string[]; sections: NavSection[] } | null {
  const lines = text.split('\n')
  const origin = new URL(baseUrl).origin

  let currentTab = ''
  const sections: NavSection[] = []
  let currentSection: NavSection | null = null
  let itemStack: { level: number; item: NavItem }[] = []

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('# ') || trimmed.startsWith('>')) continue

    if (trimmed.startsWith('## ')) {
      currentTab = trimmed.replace(/^##\s+/, '').trim()
      currentSection = null
      itemStack = []
      continue
    }

    const bulletMatch = rawLine.match(/^(\s*)-\s*(.*)$/)
    if (!bulletMatch) continue

    const indent = bulletMatch[1].length
    const content = bulletMatch[2].trim()
    if (!content) continue

    const linkMatch = content.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    const title = linkMatch ? linkMatch[1].trim() : content
    let rawHref = linkMatch ? linkMatch[2].trim() : undefined

    let fullUrl: string | undefined
    if (rawHref) {
      // Fix rare concatenated base URL typos (e.g. Inngest /docs-markdownhttps://pkg.go.dev/...)
      if (rawHref.includes('docs-markdownhttps://')) {
        rawHref = rawHref.split('docs-markdownhttps://')[1]
        if (rawHref && !rawHref.startsWith('http')) rawHref = `https://${rawHref}`
      }
      try {
        const u = new URL(rawHref, origin)
        // Canonicalize machine-readable markdown route aliases back to standard docs URLs
        if (u.pathname.includes('/docs-markdown')) {
          u.pathname = u.pathname.replace(/\/docs-markdown(\/|$)/, '/docs$1')
        }
        fullUrl = u.href
      } catch {
        fullUrl = rawHref
      }
    }

    if (fullUrl) {
      // Exclude companion full dumps, blog indexes, or metadata manifests
      if (
        fullUrl.endsWith('/llms-full.txt') ||
        fullUrl.endsWith('/blog.txt') ||
        fullUrl.endsWith('/llm-context.md') ||
        fullUrl.endsWith('.xml') ||
        fullUrl.endsWith('.json')
      ) {
        continue
      }

      // Check scope if provided
      if (scopeCheck && !scopeCheck(fullUrl)) {
        continue
      }
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    if (indent === 0) {
      if (!linkMatch) {
        // Top-level bullet without link forms a section
        currentSection = {
          title,
          slug,
          tab: currentTab || undefined,
          order: sections.length + 1,
          items: [],
        }
        sections.push(currentSection)
        itemStack = []
      } else {
        // Top-level bullet WITH link forms its own distinct section in the taxonomy
        currentSection = {
          title,
          slug,
          tab: currentTab || undefined,
          order: sections.length + 1,
          items: [
            {
              title,
              url: fullUrl || '',
              slug,
              order: 1,
            },
          ],
        }
        sections.push(currentSection)
        itemStack = [{ level: indent, item: currentSection.items[0] }]
      }
      continue
    }

    // Indented bullet under the current section
    if (!currentSection) {
      const secTitle = currentTab || 'Overview'
      currentSection = {
        title: secTitle,
        slug: secTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tab: currentTab || undefined,
        order: sections.length + 1,
        items: [],
      }
      sections.push(currentSection)
    }

    const newItem: NavItem = {
      title,
      url: fullUrl || '',
      slug,
      order: 1,
    }

    while (itemStack.length > 0 && itemStack[itemStack.length - 1].level >= indent) {
      itemStack.pop()
    }

    if (itemStack.length === 0) {
      newItem.order = currentSection.items.length + 1
      currentSection.items.push(newItem)
    } else {
      const parent = itemStack[itemStack.length - 1].item
      if (!parent.items) parent.items = []
      newItem.order = parent.items.length + 1
      parent.items.push(newItem)
    }

    itemStack.push({ level: indent, item: newItem })
  }

  // Filter empty sections and ensure at least 2 valid sections
  const validSections = sections.filter((s) => s.items.length > 0)
  if (validSections.length < 2) return null

  // Re-order sections cleanly
  validSections.forEach((s, idx) => {
    s.order = idx + 1
  })

  const tabs = Array.from(
    new Set(validSections.map((s) => s.tab).filter((t): t is string => Boolean(t))),
  )

  return {
    tabs: tabs.length > 0 ? tabs : undefined,
    sections: validSections,
  }
}

export const llmsTxtExtractor: DocExtractor = {
  name: 'llms-txt',

  detect(html: string): boolean {
    return (
      html.includes('/llms.txt') ||
      /<(?:link|a)\s+[^>]*href=["'][^"']*llms\.txt/i.test(html) ||
      html.includes('__docus__') ||
      html.includes('__NUXT__')
    )
  },

  async extract(url: string, _html: string, scopeCheck?: ScopeCheck): Promise<NavHierarchy | null> {
    try {
      const origin = new URL(url).origin
      const candidates = [`${origin}/llms.txt`]

      try {
        const u = new URL(url)
        const pathPrefix = u.pathname.replace(/\/$/, '')
        if (pathPrefix && pathPrefix !== '/docs') {
          candidates.push(`${origin}${pathPrefix}/llms.txt`)
        }
      } catch {}

      for (const cand of candidates) {
        try {
          const res = await fetch(cand, {
            headers: { 'User-Agent': 'agent-cache/1.0' },
            signal: AbortSignal.timeout(6000),
          })
          if (!res.ok) continue
          const text = await res.text()
          if (!text || text.length < 50) continue

          const result = parseHierarchicalLlmsTxt(text, url, scopeCheck)
          if (result && result.sections.length >= 2) {
            return {
              title: new URL(url).hostname,
              tabs: result.tabs,
              sections: result.sections,
            }
          }
        } catch {}
      }

      return null
    } catch {
      return null
    }
  },
}
