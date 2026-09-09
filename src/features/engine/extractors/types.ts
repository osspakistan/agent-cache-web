import type { NavHierarchy } from '../../../lib/utils/types'

/**
 * Shared scope-checking callback passed into DOM-based extractors.
 * Returns true if the candidate URL belongs to the docs site being extracted.
 */
export type ScopeCheck = (candidateUrl: string) => boolean

/**
 * A DocExtractor recipe handles one specific doc-site framework.
 *
 * Lifecycle:
 *  1. `detect(html)` - fast pre-filter (no network, no heavy parsing).
 *     Returns false to skip this extractor entirely.
 *  2. `extract(url, html, scopeCheck?)` - full extraction.
 *     Returns NavHierarchy on success, null to fall through to the next extractor.
 *
 * Rules:
 * - Extractors must be domain-agnostic (no hard-coded hostnames).
 * - Extractors may make additional network requests (e.g. to probe unhydrated tabs).
 * - Extractors must never throw - catch internally and return null on failure.
 */
export interface DocExtractor {
  /** Machine-readable name shown in logs, e.g. 'mintlify', 'fumadocs'. */
  name: string
  /** Fast signal check - no async, no network. */
  detect(html: string): boolean
  /**
   * Full extraction. `scopeCheck` is provided for DOM-based extractors that
   * filter links by origin/path prefix. HTML-only extractors can ignore it.
   */
  extract(url: string, html: string, scopeCheck?: ScopeCheck): Promise<NavHierarchy | null>
}
