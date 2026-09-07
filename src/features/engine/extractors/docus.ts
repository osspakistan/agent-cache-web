/**
 * Docus / Nuxt Content extractor
 *
 * Sites built on Docus / Nuxt Content (like evlog.dev) expose structured
 * documentation indexes via /llms.txt with raw markdown endpoints (/raw/...).
 * When Docus / Nuxt Content is detected, we can parse the complete official
 * taxonomy from its structured markdown index directly.
 */

import type { NavHierarchy, NavItem, NavSection } from '../../../lib/utils/types'
import type { DocExtractor } from './types'

export const docusExtractor: DocExtractor = {
  name: 'docus',

  detect(html: string): boolean {
    return (
      html.includes('__docus__') || html.includes('__NUXT__') || html.includes('data-nuxt-data')
    )
  },

  async extract(url: string, _html: string): Promise<NavHierarchy | null> {
    try {
      const origin = new URL(url).origin
      const llmsUrl = `${origin}/llms.txt`

      const res = await fetch(llmsUrl, {
        headers: { 'User-Agent': 'agent-cache/1.0' },
        signal: AbortSignal.timeout(6000),
      })

      if (!res.ok) return null
      const text = await res.text()
      const lines = text.split('\n')

      const sectionsMap = new Map<string, NavItem[]>()
      let currentSection = 'Overview'

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('## ')) {
          currentSection = trimmed.replace(/^##\s+/, '').trim()
          continue
        }

        const m = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/.exec(trimmed)
        if (m) {
          const rawTitle = m[1].trim()
          const rawHref = m[2].trim()

          // Filter out companion dumps or external repo/npm links
          if (
            rawHref.endsWith('llms-full.txt') ||
            rawHref.includes('github.com') ||
            rawHref.includes('npmjs.com') ||
            rawHref.endsWith('.xml') ||
            rawHref.endsWith('.json')
          ) {
            continue
          }

          try {
            const pageUrl = new URL(rawHref, origin).href
            let list = sectionsMap.get(currentSection)
            if (!list) {
              list = []
              sectionsMap.set(currentSection, list)
            }

            if (!list.some((it) => it.url === pageUrl)) {
              list.push({
                title: rawTitle,
                url: pageUrl,
                slug: rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                order: list.length + 1,
              })
            }
          } catch {}
        }
      }

      if (sectionsMap.size === 0) return null

      const sections: NavSection[] = []
      let sIdx = 1

      for (const [secTitle, items] of sectionsMap.entries()) {
        if (items.length > 0) {
          sections.push({
            title: secTitle,
            slug: secTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            order: sIdx++,
            items,
          })
        }
      }

      if (sections.length >= 2) {
        return {
          title: new URL(url).hostname,
          sections,
        }
      }

      return null
    } catch {
      return null
    }
  },
}
