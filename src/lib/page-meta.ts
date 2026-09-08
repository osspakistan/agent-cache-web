// Per-page meta store — set by each route before rendering, read by layout.
// Replaces the hardcoded title/description so every page is not a duplicate.

export interface PageMeta {
  title: string
  description: string
  image?: string
  canonical?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

let current: PageMeta | null = null

export function setPageMeta(meta: PageMeta) {
  current = meta
}

export function getPageMeta(): PageMeta | null {
  return current
}

export function consumePageMeta(): PageMeta {
  const m = current
  current = null
  return (
    m ?? {
      title: 'Agent Cache',
      description:
        'Paste a docs URL. Get the whole site back as clean markdown your agent can read.',
    }
  )
}
