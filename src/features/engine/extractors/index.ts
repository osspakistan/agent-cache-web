/**
 * Extractor registry
 *
 * Lists all framework-specific doc extractors in priority order.
 * `runExtractors()` tries each in sequence, returning the first non-null result.
 *
 * To add a new framework:
 *   1. Create `extractors/<framework>.ts` implementing `DocExtractor`
 *   2. Import and add it to `EXTRACTORS` below
 *   3. No other changes needed
 */

import type { NavHierarchy } from '../../../lib/utils/types'
import { docusExtractor } from './docus'
import { docusaurusExtractor } from './docusaurus'
import { fumadocsExtractor } from './fumadocs'
import { llmsTxtExtractor } from './llms-txt'
import { mintlifyExtractor } from './mintlify'
import type { DocExtractor, ScopeCheck } from './types'

// Priority order matters — put faster/cheaper detections first.
// RSC-payload extractors (no DOM) come before DOM-based ones.
const EXTRACTORS: DocExtractor[] = [
  mintlifyExtractor, // Mintlify scopedNav RSC
  fumadocsExtractor, // Fumadocs pageTree RSC
  llmsTxtExtractor, // Structured hierarchical llms.txt extractor
  docusExtractor, // Docus / Nuxt Content llms.txt structured extractor
  docusaurusExtractor, // Docusaurus sidebar DOM & pillar extractor
]

export type { DocExtractor, ScopeCheck }

/**
 * Run all registered extractors against the given page HTML.
 * Returns the first successful NavHierarchy, or null if none matched.
 *
 * @param url      - The canonical URL of the docs page fetched
 * @param html     - Raw HTML response body
 * @param scope    - Optional scope-check callback for DOM extractors
 * @param onMatch  - Optional callback invoked with the winning extractor name
 */
export async function runExtractors(
  url: string,
  html: string,
  scope?: ScopeCheck,
  onMatch?: (name: string) => void,
): Promise<NavHierarchy | null> {
  for (const extractor of EXTRACTORS) {
    if (!extractor.detect(html)) continue
    const result = await extractor.extract(url, html, scope)
    if (result && result.sections.length >= 1) {
      onMatch?.(extractor.name)
      return result
    }
  }
  return null
}

/**
 * Detect the documentation platform/framework from HTML content and URL.
 */
export function detectDocPlatform(html: string, urlStr?: string): string {
  if (
    html.includes('pageTreesByVersion') ||
    html.includes('"pageTree"') ||
    html.includes('fd-sidebar')
  ) {
    return 'Fumadocs'
  }
  if (html.includes('scopedNav') || html.includes('mintlify')) {
    return 'Mintlify'
  }
  if (html.includes('VPNav') || html.includes('vitepress')) {
    return 'VitePress'
  }
  if (html.includes('docusaurus') || html.includes('__docusaurus')) {
    return 'Docusaurus'
  }
  if (html.includes('nextra') || html.includes('nextra-content')) {
    return 'Nextra'
  }
  if (
    html.includes('sidebar-scrollbox') ||
    html.includes('ol class="chapter"') ||
    html.includes("ol class='chapter'")
  ) {
    return 'mdBook'
  }
  if (html.includes('gitbook') || html.includes('__GITBOOK__')) {
    return 'GitBook'
  }
  if (
    html.includes('wy-menu-vertical') ||
    html.includes('sphinxsidebar') ||
    urlStr?.includes('readthedocs.io')
  ) {
    return 'Sphinx / ReadTheDocs'
  }
  if (html.includes('__INITIAL_STATE__') && html.includes('navigation')) {
    return 'Stripe Custom'
  }
  if (
    html.includes('ActionList') &&
    (html.includes('Primer') || urlStr?.includes('docs.npmjs.com'))
  ) {
    return 'GitHub Primer'
  }
  if (html.includes('wp-content')) {
    return 'WordPress'
  }
  if (
    html.includes('__docus__') ||
    (html.includes('__NUXT__') && html.includes('data-nuxt-data'))
  ) {
    return 'Docus / Nuxt Content'
  }
  if (html.includes('__NEXT_DATA__') || html.includes('self.__next_f')) {
    return 'Next.js Custom'
  }
  return 'Custom / HTML'
}

/**
 * List all registered extractor names (for diagnostics / logging).
 */
export function listExtractors(): string[] {
  return EXTRACTORS.map((e) => e.name)
}
