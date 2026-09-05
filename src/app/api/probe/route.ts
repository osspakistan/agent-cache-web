import { probeAcquisitionLadder } from '../../../features/engine/ladder'
import { resolveTargetDocs } from '../../../features/engine/resolver'
import type { AppContext } from '../../../lib/utils/types'

/**
 * POST /api/probe — Probes a documentation URL and tests the acquisition ladder
 * Body: { url: string }
 */
export const POST = async (c: AppContext) => {
  let targetUrl = ''

  const cType = c.req.header('content-type') || ''
  if (cType.includes('application/json')) {
    try {
      const body = (await c.req.json()) as { url?: string; docs?: string }
      targetUrl = String(body.url || body.docs || '').trim()
    } catch {}
  } else {
    try {
      const form = await c.req.parseBody()
      targetUrl = String(form.url || form.docs || '').trim()
    } catch {}
  }

  if (!targetUrl) {
    return c.json(
      {
        ok: false,
        error: 'Missing required field "url" in request body',
      },
      400,
    )
  }

  try {
    const resolved = await resolveTargetDocs(targetUrl)
    const decision = await probeAcquisitionLadder(resolved.docsUrl)

    return c.json({
      ok: true,
      input_url: targetUrl,
      canonical_url: resolved.docsUrl,
      product_name: resolved.productName,
      title: resolved.title,
      description: resolved.description,
      logo_url: resolved.logoUrl,
      strategy: decision.strategy,
      has_llms_txt: decision.hasLlmsTxt,
      llms_txt_url: decision.llmsTxtUrl ?? null,
      has_llms_full: decision.hasLlmsFull,
      llms_full_url: decision.llmsFullUrl ?? null,
      direct_md_sample_url: decision.directMdSampleUrl ?? null,
      git_repo: decision.gitRepo ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during probe'
    return c.json(
      {
        ok: false,
        error: message,
      },
      500,
    )
  }
}
