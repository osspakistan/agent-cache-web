import { getPublicR2Url, updateJob, uploadToR2 } from '../../lib/clients'
import { ErrorFactory } from '../../lib/utils/errors'
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

const activeJobs = new Map<string, Promise<void>>()
const jobSubscribers = new Map<string, Set<(event: StreamEvent) => void>>()

export function subscribeToJob(jobId: string, callback: (event: StreamEvent) => void): () => void {
  let subs = jobSubscribers.get(jobId)
  if (!subs) {
    subs = new Set()
    jobSubscribers.set(jobId, subs)
  }
  subs.add(callback)
  return () => {
    const s = jobSubscribers.get(jobId)
    if (s) {
      s.delete(callback)
      if (s.size === 0) jobSubscribers.delete(jobId)
    }
  }
}

export function startJobEngine(job: JobRecord): Promise<void> {
  const existing = activeJobs.get(job.id)
  if (existing) return existing

  const p = (async () => {
    try {
      await runConversionEngine({
        job,
        onEvent: (event) => {
          const subs = jobSubscribers.get(job.id)
          if (subs) {
            for (const cb of subs) {
              try {
                cb(event)
              } catch {}
            }
          }
        },
      })
    } finally {
      activeJobs.delete(job.id)
    }
  })()

  activeJobs.set(job.id, p)
  return p
}

export async function runConversionEngine(opts: RunEngineOptions): Promise<void> {
  const { job } = opts
  const allEvents: StreamEvent[] = []
  let lastFlush = Date.now()
  let isFlushing = false
  const flushEventsToR2 = async () => {
    if (allEvents.length === 0 || isFlushing) return
    isFlushing = true
    try {
      const jsonl = `${allEvents.map((e) => JSON.stringify(e)).join('\n')}\n`
      let logsText = ''
      for (const event of allEvents) {
        const time = new Date(event.timestamp).toISOString().split('T')[1].slice(0, 8)
        let logText = `[${time}] [${event.type.toUpperCase()}]`
        if (event.type === 'phase') logText += ` --- Phase: ${event.phase} (${event.message}) ---`
        else if (event.type === 'progress')
          logText += ` [${event.done}/${event.total}] ${event.current_url}`
        else if (event.type === 'log') logText += ` ${event.message}`
        else if (event.type === 'complete') logText += ` SUCCESS: ${event.message}`
        else if (event.type === 'error')
          logText += ` ERROR: machine=${event.machine} human=${event.human}`
        logsText += `${logText}\n`
      }
      await Promise.all([
        uploadToR2(
          `jobs/${job.id}/.dingdong/events.jsonl`,
          jsonl,
          'application/x-ndjson; charset=utf-8',
        ),
        uploadToR2(`jobs/${job.id}/logs.txt`, logsText, 'text/plain; charset=utf-8'),
      ])
      lastFlush = Date.now()
    } finally {
      isFlushing = false
    }
  }

  const emit = async (event: StreamEvent) => {
    allEvents.push(event)
    if (opts.onEvent) {
      try {
        await opts.onEvent(event)
      } catch {}
    }
    // Only block on phase/error/complete flushes; progress emits are instant and non-blocking
    if (event.type !== 'progress') {
      await flushEventsToR2().catch((err) => console.warn('[Engine] R2 ledger flush error:', err))
    } else if (Date.now() - lastFlush > 3000) {
      // Fire-and-forget debounced background sync
      flushEventsToR2().catch(() => {})
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
    if (resolved.resolvedVia === 'tavily') {
      await emit({
        type: 'log',
        level: 'info',
        message: `🧠 Target domain protected or ambiguous. Resolved canonical docs via Tavily: ${resolved.docsUrl}`,
        timestamp: Date.now(),
      })
    } else {
      await emit({
        type: 'log',
        level: 'info',
        message: `Resolved canonical docs endpoint: ${resolved.docsUrl} (${resolved.productName})`,
        timestamp: Date.now(),
      })
    }

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

    if (decision.hasLlmsFull) {
      await emit({
        type: 'log',
        level: 'info',
        message: `🎁 Discovered vendor llms-full.txt (${decision.llmsFullUrl}) — bundling as companion bonus`,
        timestamp: Date.now(),
      })
    }

    if (decision.hasLlmsTxt) {
      await emit({
        type: 'log',
        level: 'info',
        message: `🗺️ Discovered vendor llms.txt (${decision.llmsTxtUrl}) — mapping link topology`,
        timestamp: Date.now(),
      })
    }

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

    const hierarchy = await extractSiteTopology(resolved.docsUrl, {
      llmsTxtUrl: decision.llmsTxtUrl,
    })
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

    const pkgResult = await packageJobBundle({
      jobId: job.id,
      productName: resolved.productName,
      docsUrl: resolved.docsUrl,
      hierarchy,
      extractedFiles,
      companionLlmsFullUrl: decision.llmsFullUrl,
    })

    if (pkgResult.hasCompanionLlmsFull) {
      await emit({
        type: 'log',
        level: 'info',
        message: `Included vendor companion llms-full.txt in root archive and R2`,
        timestamp: Date.now(),
      })
    }

    // Mark Complete in Turso DB
    const now = Date.now()
    await updateJob(job.id, {
      status: 'complete',
      page_count: totalItems,
      zip_size_bytes: pkgResult.zipSizeBytes,
      completed_at: now,
    })

    const publicZipUrl = getPublicR2Url(`jobs/${job.id}/bundle.zip`) || `/docs/${job.id}/download`

    await emit({
      type: 'complete',
      docs_url: `/docs/${job.id}`,
      zip_url: publicZipUrl,
      product_name: resolved.productName,
      message: `Documentation mirrored successfully (${totalItems} files, ${(pkgResult.zipSizeBytes / 1024).toFixed(1)} KB)`,
      timestamp: now,
    })
  } catch (err: unknown) {
    console.error(`[Engine] Fatal error processing job ${job.id}:`, err)

    const appError = ErrorFactory.fromUnknown(err, job.resolved_url || job.input_url)

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
  } finally {
    await flushEventsToR2().catch(() => {})
  }
}
