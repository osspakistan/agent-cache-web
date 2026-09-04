import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { uploadToR2 } from '../../lib/clients'
import type { NavHierarchy, StreamEvent } from '../../lib/utils/types'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// Custom rule to preserve pre/code styling
turndown.addRule('fencedCodeBlock', {
  filter: ['pre'],
  replacement: (_content, node) => {
    const codeEl = (node as HTMLElement).querySelector('code')
    const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || ''
    const text = codeEl ? codeEl.textContent || '' : node.textContent || ''
    return `\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n\n`
  },
})

export type CrawlProgressCallback = (event: StreamEvent) => Promise<void>

export async function crawlAndExtractPages(
  jobId: string,
  hierarchy: NavHierarchy,
  strategy: string,
  onProgress: CrawlProgressCallback,
): Promise<Map<string, Uint8Array>> {
  let doneCount = 0

  // Count total pages
  let totalPages = 0
  for (const sec of hierarchy.sections) {
    totalPages += sec.items.length
  }

  const concurrency = 8
  const queue: {
    secIndex: number
    secTitle: string
    secSlug: string
    itemIndex: number
    itemTitle: string
    url: string
  }[] = []

  hierarchy.sections.forEach((sec, sIdx) => {
    sec.items.forEach((item, iIdx) => {
      queue.push({
        secIndex: sIdx + 1,
        secTitle: sec.title,
        secSlug: sec.slug,
        itemIndex: iIdx + 1,
        itemTitle: item.title,
        url: item.url,
      })
    })
  })

  // In-flight bundle map for instant ZIP creation (avoids disk!)
  const filesMap = new Map<string, Uint8Array>()

  async function processItem(task: (typeof queue)[0]) {
    const secFolder = `${String(task.secIndex).padStart(2, '0')}-${task.secSlug}`
    const fileName = `${String(task.itemIndex).padStart(2, '0')}-${task.itemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
    const relativePath = `final/${secFolder}/${fileName}`
    const r2Key = `jobs/${jobId}/${relativePath}`

    let markdown = ''
    try {
      if (task.url.endsWith('.md') || task.url.endsWith('.mdx')) {
        const res = await fetch(task.url, {
          headers: { 'User-Agent': 'agent-cache/1.0' },
          signal: AbortSignal.timeout(6000),
        })
        if (res.ok) {
          markdown = await res.text()
        }
      } else if (strategy === 'direct-raw-md') {
        const mdUrl = `${task.url.replace(/\/$/, '')}.md`
        const res = await fetch(mdUrl, {
          headers: { 'User-Agent': 'agent-cache/1.0' },
          signal: AbortSignal.timeout(6000),
        })
        if (res.ok) {
          markdown = await res.text()
        }
      }

      if (!markdown) {
        // HTML fetch with Turndown purification
        const res = await fetch(task.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const contentType = res.headers.get('content-type') || ''
          const text = await res.text()

          if (contentType.includes('markdown') || contentType.includes('text/plain')) {
            markdown = text
          } else {
            const dom = new JSDOM(text)
            const doc = dom.window.document

            // Strip noise elements
            const elementsToRemove = doc.querySelectorAll(
              'script, style, nav, header, footer, aside, noscript, svg',
            )
            elementsToRemove.forEach((el) => {
              el.remove()
            })

            const mainContent =
              doc.querySelector('main, article, [role="main"], .content') || doc.body
            markdown = turndown.turndown(mainContent ? mainContent.innerHTML : text)
          }
        }
      }
    } catch (err) {
      console.warn(`[Crawler] Failed page ${task.url}:`, err)
      markdown = `> Failed to extract content from ${task.url}\n\n*Error encountered during crawl.*`
    }

    // Prepend metadata frontmatter
    const frontmatter = `---
title: "${task.itemTitle.replace(/"/g, '\\"')}"
url: "${task.url}"
section: "${task.secTitle.replace(/"/g, '\\"')}"
---

# ${task.itemTitle}

`
    const fullContent = frontmatter + markdown
    const fileBytes = Buffer.from(fullContent, 'utf8')

    // 1. Upload directly to R2 with error isolation
    try {
      await uploadToR2(r2Key, fileBytes, 'text/markdown; charset=utf-8')
    } catch (err) {
      console.warn(`[Crawler] Failed to upload page ${r2Key} to R2:`, err)
    }

    // 2. Track in bundle map
    filesMap.set(relativePath.replace(/^final\//, ''), fileBytes)

    doneCount++

    await onProgress({
      type: 'progress',
      done: doneCount,
      total: totalPages,
      current_url: task.url,
      timestamp: Date.now(),
    })
  }

  // Run with bounded concurrency pool
  for (let i = 0; i < queue.length; i += concurrency) {
    const batch = queue.slice(i, i + concurrency)
    await Promise.all(batch.map((t) => processItem(t)))
  }

  return filesMap
}
