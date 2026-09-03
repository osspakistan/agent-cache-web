import { JSDOM } from 'jsdom'
import type { NavHierarchy, NavItem, NavSection } from '../../lib/utils/types'

export async function extractSiteTopology(docsUrl: string): Promise<NavHierarchy> {
  const url = new URL(docsUrl)
  const sections: NavSection[] = []

  try {
    const res = await fetch(docsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      const html = await res.text()
      const dom = new JSDOM(html)
      const doc = dom.window.document

      // Look for standard sidebar elements
      const navEl =
        doc.querySelector('nav[data-left-nav]') ||
        doc.querySelector('aside nav') ||
        doc.querySelector('nav[aria-label*="sidebar"]') ||
        doc.querySelector('nav[aria-label*="Documentation"]') ||
        doc.querySelector('aside') ||
        doc.querySelector('nav')

      if (navEl) {
        // Look for groups (sections)
        const _groupElements = navEl.querySelectorAll('div, section, ul')
        let sectionIndex = 1

        // Extract headings within the nav
        const headings = navEl.querySelectorAll(
          'h3, h4, h5, [class*="title"], [class*="group-header"]',
        )
        if (headings.length > 0) {
          for (const heading of Array.from(headings)) {
            const title = (heading.textContent || '').trim()
            if (!title) continue

            const parent = heading.closest('div, section') || heading.parentElement
            const links = parent ? Array.from(parent.querySelectorAll('a[href]')) : []

            const items: NavItem[] = []
            let itemIndex = 1
            for (const a of links) {
              const itemTitle = (a.textContent || '').trim()
              const href = a.getAttribute('href') || ''
              if (!itemTitle || !href || href.startsWith('#')) continue

              try {
                const fullUrl = new URL(href, docsUrl).href
                if (fullUrl.startsWith(url.origin)) {
                  items.push({
                    title: itemTitle,
                    url: fullUrl,
                    order: itemIndex++,
                  })
                }
              } catch {}
            }

            if (items.length > 0) {
              sections.push({
                title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                order: sectionIndex++,
                items,
              })
            }
          }
        }

        // Fallback: If no distinct grouped headings found, extract flat links from nav
        if (sections.length === 0) {
          const links = Array.from(navEl.querySelectorAll('a[href]'))
          const items: NavItem[] = []
          let itemIndex = 1
          for (const a of links) {
            const itemTitle = (a.textContent || '').trim()
            const href = a.getAttribute('href') || ''
            if (!itemTitle || !href || href.startsWith('#')) continue

            try {
              const fullUrl = new URL(href, docsUrl).href
              if (fullUrl.startsWith(url.origin) && !items.some((it) => it.url === fullUrl)) {
                items.push({
                  title: itemTitle,
                  url: fullUrl,
                  order: itemIndex++,
                })
              }
            } catch {}
          }

          if (items.length > 0) {
            sections.push({
              title: 'Documentation',
              slug: 'documentation',
              order: 1,
              items,
            })
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Topology] DOM extraction failed for ${docsUrl}:`, err)
  }

  // Fallback: Default single section with root URL if empty
  if (sections.length === 0) {
    sections.push({
      title: 'Overview',
      slug: 'overview',
      order: 1,
      items: [
        {
          title: 'Introduction',
          url: docsUrl,
          order: 1,
        },
      ],
    })
  }

  return {
    title: url.hostname,
    sections,
  }
}
