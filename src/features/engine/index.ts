import { appendEventToR2, getPublicR2Url, updateJob, uploadToR2 } from '../../lib/clients'
import { AppError, ErrorFactory } from '../../lib/utils/errors'
import type { JobRecord, StreamEvent } from '../../lib/utils/types'
import { crawlAndExtractPages } from './crawler'
import { probeAcquisitionLadder } from './ladder'
import { packageJobBundle } from './packager'
import { resolveTargetDocs } from './resolver'
import { extractSiteTopology } from './topology'

export interface RunEngineOptions {
  job: JobRecord
  onEvent?: (event: StreamEvent) => void | Promise<void>
}

export async function runConversionEngine(opts: RunEngineOptions): Promise<void> {
  const { job } = opts

  const emit = async (event: StreamEvent) => {
    // Record to R2 append-only ledger
    await appendEventToR2(job.id, event)
    if (opts.onEvent) {
      await opts.onEvent(event)
    }
  }

  try {
    // Phase 1: Target Docs Origin Resolver
    await emit({
      type: 'phase',
      phase: 'probing',
      message: `Analyzing target URL: ${job.input_url}`,
      timestamp: Date.now(),
    })

    const resolved = await resolveTargetDocs(job.input_url)
    await emit({
      type: 'log',
      level: 'info',
      message: `Resolved canonical docs endpoint: ${resolved.docsUrl} (${resolved.productName})`,
      timestamp: Date.now(),
    })

    await updateJob(job.id, {
      resolved_url: resolved.docsUrl,
      product_name: resolved.productName,
      title: resolved.title,
      description: resolved.description,
      logo_url: resolved.logoUrl,
      status: 'probing',
    })

    // Phase 2: Probe Acquisition Ladder
    const decision = await probeAcquisitionLadder(resolved.docsUrl)
    await emit({
      type: 'log',
      level: 'info',
      message: `Acquisition strategy selected: ${decision.strategy}`,
      timestamp: Date.now(),
    })

    await uploadToR2(
      `jobs/${job.id}/.dingdong/01-probe.json`,
      JSON.stringify(decision, null, 2),
      'application/json; charset=utf-8',
    )

    // Phase 3: Structural Topology Mapping
    await emit({
      type: 'log',
      level: 'info',
      message: `Mapping site topology and sidebar hierarchy...`,
      timestamp: Date.now(),
    })

    const hierarchy = await extractSiteTopology(resolved.docsUrl)
    await uploadToR2(
      `jobs/${job.id}/.dingdong/03-nav-tree.json`,
      JSON.stringify(hierarchy, null, 2),
      'application/json; charset=utf-8',
    )

    let totalItems = 0
    for (const s of hierarchy.sections) {
      totalItems += s.items.length
    }

    if (totalItems === 0) {
      throw ErrorFactory.zeroPages(resolved.docsUrl)
    }

    await emit({
      type: 'log',
      level: 'info',
      message: `Discovered ${totalItems} documentation pages across ${hierarchy.sections.length} sections`,
      timestamp: Date.now(),
    })

    // Phase 4: Crawling & Extraction Pool directly into R2
    await updateJob(job.id, {
      status: 'crawling',
      strategy: decision.strategy,
      page_count: totalItems,
    })

    await emit({
      type: 'phase',
      phase: 'crawling',
      message: `Extracting pages to agent-ready markdown...`,
      timestamp: Date.now(),
    })

    const extractedFiles = await crawlAndExtractPages(
      job.id,
      hierarchy,
      decision.strategy,
      async (prog) => {
        await emit(prog)
      },
    )

    // Phase 5: Packaging & ZIP upload to R2
    await updateJob(job.id, { status: 'packaging' })
    await emit({
      type: 'phase',
      phase: 'packaging',
      message: `Assembling numeric tree, INDEX.md, and bundle.zip in Cloudflare R2...`,
      timestamp: Date.now(),
    })

    const zipSizeBytes = await packageJobBundle(
      job.id,
      resolved.productName,
      resolved.docsUrl,
      hierarchy,
      extractedFiles,
    )

    // Mark Complete in Turso DB
    const now = Date.now()
    await updateJob(job.id, {
      status: 'complete',
      page_count: totalItems,
      zip_size_bytes: zipSizeBytes,
      completed_at: now,
    })

    const publicZipUrl = getPublicR2Url(`jobs/${job.id}/bundle.zip`) || `/docs/${job.id}/download`

    await emit({
      type: 'complete',
      docs_url: `/docs/${job.id}`,
      zip_url: publicZipUrl,
      product_name: resolved.productName,
      message: `Documentation mirrored successfully (${totalItems} files, ${(zipSizeBytes / 1024).toFixed(1)} KB)`,
      timestamp: now,
    })
  } catch (err: unknown) {
    console.error(`[Engine] Fatal error processing job ${job.id}:`, err)

    let appError: AppError
    if (err instanceof AppError) {
      appError = err
    } else {
      const msg = err instanceof Error ? err.message : 'Unknown crawler engine error'
      appError = ErrorFactory.internal(msg, undefined, err)
    }

    await updateJob(job.id, {
      status: 'failed',
      error_machine: appError.machine,
      error_human: appError.human,
    })

    await emit({
      type: 'error',
      machine: appError.machine,
      human: appError.human,
      timestamp: Date.now(),
    })
  }
}
