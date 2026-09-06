import { getLlmClient } from '../../lib/clients/llm'
import { Logger } from '../../lib/utils/logger'
import type { NavHierarchy } from '../../lib/utils/types'

export interface DocMetadataResult {
  keywords: string[]
  intent_triggers: string[]
  ecosystem: string[]
  source: 'llm' | 'fallback'
}

/**
 * Instant, deterministic fallback using product name, section topology, and title words.
 */
export function buildFallbackMetadata(
  productName: string,
  title: string,
  sections: string[],
): DocMetadataResult {
  const tokenSet = new Set<string>()
  tokenSet.add(productName.toLowerCase())

  for (const s of sections) {
    tokenSet.add(s.toLowerCase())
  }

  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !['with', 'from', 'your', 'about', 'guide', 'docs', 'documentation'].includes(w),
    )

  for (const w of titleWords) {
    tokenSet.add(w)
  }

  return {
    keywords: Array.from(tokenSet).slice(0, 12),
    intent_triggers: [
      `How to use ${productName}`,
      `Getting started with ${productName}`,
      `${productName} API configuration`,
      `${productName} core features`,
    ],
    ecosystem: [],
    source: 'fallback',
  }
}

/**
 * Generates rich semantic metadata using the centralized LlmService client,
 * with model fallback routing, provider preferences, and deterministic local fallback.
 */
export async function generateDocMetadata(opts: {
  productName: string
  url: string
  title?: string
  description?: string
  hierarchy: NavHierarchy
}): Promise<DocMetadataResult> {
  const { productName, url, title = '', description = '', hierarchy } = opts

  const sampleSections: string[] = []
  if (hierarchy?.sections) {
    for (const sec of hierarchy.sections.slice(0, 10)) {
      if (sec.title) sampleSections.push(sec.title)
    }
  }

  const fallback = buildFallbackMetadata(productName, title, sampleSections)

  const systemPrompt = `You are an AI indexing documentation for coding agents. Coding agents need to know WHAT this tool is, WHEN to consult it, and what ecosystems it touches.
Generate:
- "keywords": 8-12 specific, high-intent technical search tokens (product name, aliases, core mechanisms).
- "intent_triggers": 4-6 natural user questions or task intents (e.g. "how to handle sse streaming in hono", "configure stripe webhook").
- "ecosystem": 4-8 related tools, languages, runtimes, or frameworks.
Never output markdown explanation or conversational preamble. Output ONLY valid JSON in this shape:
{
  "keywords": ["..."],
  "intent_triggers": ["..."],
  "ecosystem": ["..."]
}`

  const userPrompt = JSON.stringify({
    product: productName,
    url,
    title,
    description,
    sections: sampleSections,
  })

  const llm = getLlmClient()

  const { data, source, elapsedMs } = await llm.json<DocMetadataResult>(
    {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      timeoutMs: 8000,
    },
    fallback,
  )

  Logger.info({
    group: 'meta_extraction',
    topic: 'metadata_generated',
    message: `Generated doc metadata for ${productName} (source: ${source}, ${elapsedMs}ms)`,
    meta: {
      productName,
      keywordsCount: data.keywords.length,
      intentsCount: data.intent_triggers.length,
      source,
    },
  })

  return {
    keywords: data.keywords && data.keywords.length > 0 ? data.keywords : fallback.keywords,
    intent_triggers:
      data.intent_triggers && data.intent_triggers.length > 0
        ? data.intent_triggers
        : fallback.intent_triggers,
    ecosystem: data.ecosystem && data.ecosystem.length > 0 ? data.ecosystem : fallback.ecosystem,
    source,
  }
}
