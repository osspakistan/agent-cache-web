/**
 * Docusaurus extractor
 *
 * Docusaurus sites (like docs.convex.dev, docs.litellm.ai, reactnative.dev)
 * organize documentation into top-level pillars (e.g. "Get Started", "Platform",
 * "Client Libraries", "API Reference") containing collapsible category folders.
 *
 * This extractor:
 *   1. Probes the server-rendered HTML for pillar headers and category names.
 *   2. Combines live sidebar structure with direct markdown index links to build
 *      a pristine, multi-level NavHierarchy matching the exact website UI.
 */

import { JSDOM } from 'jsdom'
import type { NavHierarchy, NavItem, NavSection } from '../../../lib/utils/types'
import type { DocExtractor, ScopeCheck } from './types'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function cleanTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Api\b/g, 'API')
    .replace(/Cli\b/g, 'CLI')
    .replace(/Ai\b/g, 'AI')
}

export const docusaurusExtractor: DocExtractor = {
  name: 'docusaurus',

  detect(html: string): boolean {
    return (
      html.includes('name="generator" content="Docusaurus') ||
      html.includes('name=generator content="Docusaurus') ||
      html.includes('data-has-hydrated=') ||
      html.includes('theme-doc-sidebar') ||
      html.includes('__docusaurus')
    )
  },

  async extract(
    url: string,
    html: string,
    isWithinScope?: ScopeCheck,
  ): Promise<NavHierarchy | null> {
    const origin = new URL(url).origin

    // 1. Fetch live subpage with rendered sidebar to extract true pillar headers
    let liveHtml = html
    if (!liveHtml.includes('theme-doc-sidebar-menu') && !liveHtml.includes('menu__list')) {
      const candidates = [
        `${origin}/home`,
        `${origin}/docs`,
        `${origin}/docs/overview`,
        `${origin}/overview`,
      ]
      for (const cand of candidates) {
        try {
          const res = await fetch(cand, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(5000),
          })
          if (res.ok) {
            const text = await res.text()
            if (text.includes('theme-doc-sidebar-menu') || text.includes('menu__list')) {
              liveHtml = text
              break
            }
          }
        } catch {}
      }
    }

    const dom = new JSDOM(liveHtml)
    const doc = dom.window.document
    const sidebarEl =
      doc.querySelector('.theme-doc-sidebar-menu') || doc.querySelector('nav.menu .menu__list')

    // Extract pillars and category mappings from live DOM
    const pillarToCategories = new Map<string, { label: string; href: string }[]>()
    const categoryToPillar = new Map<string, string>()
    let currentPillar = 'Overview'

    if (sidebarEl) {
      for (const child of Array.from(sidebarEl.children)) {
        const headerEl = child.querySelector(
          '[class*="menu-header"], [class*="category-header"], .menu__list-item-collapsible--group, strong',
        )
        const headerText = headerEl?.textContent?.trim()
        if (headerText && !child.querySelector('a.menu__link')) {
          currentPillar = cleanTitle(headerText)
          continue
        }

        const link = child.querySelector('.menu__link, a')
        const label = link?.textContent?.trim()
        const href = link?.getAttribute('href') || ''

        if (label && href) {
          const catSlug = href.replace(/^\//, '').split('/')[0]
          if (catSlug) {
            categoryToPillar.set(catSlug.toLowerCase(), currentPillar)
            categoryToPillar.set(label.toLowerCase(), currentPillar)
          }

          if (!pillarToCategories.has(currentPillar)) {
            pillarToCategories.set(currentPillar, [])
          }
          pillarToCategories.get(currentPillar)?.push({ label, href })
        }
      }
    }

    // 2. Combine with machine-readable llms.txt index if available for 100% complete page tree
    try {
      const llmsRes = await fetch(`${origin}/llms.txt`, {
        headers: { 'User-Agent': 'agent-cache/1.0' },
        signal: AbortSignal.timeout(5000),
      })

      if (llmsRes.ok) {
        const text = await llmsRes.text()
        const lines = text.split('\n')
        const catPages = new Map<string, NavItem[]>()
        let currentCatSlug = ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('## ')) {
            currentCatSlug = trimmed
              .replace(/^##\s+/, '')
              .trim()
              .toLowerCase()
            continue
          }

          const m = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/.exec(trimmed)
          if (m && currentCatSlug) {
            const pageTitle = m[1].trim()
            const rawHref = m[2].trim()

            if (rawHref.endsWith('llms-full.txt') || rawHref.includes('github.com')) continue

            try {
              const fullUrl = new URL(rawHref, origin).href
              if (!isWithinScope || isWithinScope(fullUrl)) {
                let list = catPages.get(currentCatSlug)
                if (!list) {
                  list = []
                  catPages.set(currentCatSlug, list)
                }

                if (!list.some((it) => it.url === fullUrl)) {
                  list.push({
                    title: pageTitle,
                    url: fullUrl,
                    slug: toSlug(pageTitle),
                    order: list.length + 1,
                  })
                }
              }
            } catch {}
          }
        }

        if (catPages.size > 0) {
          // Group categories under their respective pillars
          const sections: NavSection[] = []
          const pillarSectionsMap = new Map<string, NavItem[]>()

          for (const [catSlug, pages] of catPages.entries()) {
            const pillar = categoryToPillar.get(catSlug) || cleanTitle(catSlug)
            const catTitle = cleanTitle(catSlug)

            let pList = pillarSectionsMap.get(pillar)
            if (!pList) {
              pList = []
              pillarSectionsMap.set(pillar, pList)
            }

            // Create a nested category folder item
            pList.push({
              title: catTitle,
              url: pages[0]?.url || '',
              slug: toSlug(catTitle),
              order: pList.length + 1,
              items: pages,
            })
          }

          let sIdx = 1
          for (const [pillarTitle, catFolders] of pillarSectionsMap.entries()) {
            sections.push({
              title: pillarTitle,
              slug: toSlug(pillarTitle),
              order: sIdx++,
              items: catFolders,
            })
          }

          if (sections.length >= 2) {
            return {
              title: new URL(url).hostname,
              sections,
            }
          }
        }
      }
    } catch {}

    return null
  },
}
