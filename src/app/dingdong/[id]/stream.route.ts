import { startJobEngine, subscribeToJob } from '../../../features/engine'
import { getJobById } from '../../../features/jobs'
import { readEventsFromR2 } from '../../../lib/clients'
import type { AppContext, StreamEvent } from '../../../lib/utils/types'

/**
 * GET /dingdong/:id/stream — SSE streaming endpoint.
 * Plays back existing events from R2 first, subscribes to the decoupled background runner,
 * and handles client disconnections cleanly without stopping the crawl.
 */
export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const job = await getJobById(id)

  if (!job) {
    return c.text('Job not found', 404)
  }

  // Set SSE response headers
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  let unsubscribe: (() => void) | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: StreamEvent) => {
        if (isClosed) return
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch {
          isClosed = true
        }
      }

      // Heartbeat ping every 5 seconds to prevent idle timeout
      pingTimer = setInterval(() => {
        if (isClosed) {
          if (pingTimer) clearInterval(pingTimer)
          return
        }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          isClosed = true
          if (pingTimer) clearInterval(pingTimer)
        }
      }, 5000)

      // 1. Replay historical events from R2
      const pastEvents = await readEventsFromR2(id)
      for (const ev of pastEvents) {
        sendEvent(ev)
      }

      // 2. If already finished, close stream
      if (job.status === 'complete' || job.status === 'failed') {
        if (pingTimer) clearInterval(pingTimer)
        if (!isClosed) {
          try {
            controller.close()
          } catch {}
          isClosed = true
        }
        return
      }

      // 3. Subscribe to live events from the background runner
      unsubscribe = subscribeToJob(id, (ev) => {
        sendEvent(ev)
        if (ev.type === 'complete' || ev.type === 'error') {
          if (pingTimer) clearInterval(pingTimer)
          if (!isClosed) {
            try {
              controller.close()
            } catch {}
            isClosed = true
          }
        }
      })

      // Ensure the engine is running in the background
      startJobEngine(job).catch((err) => {
        console.error(`[Stream] Job engine background error for ${id}:`, err)
      })
    },
    cancel() {
      isClosed = true
      if (pingTimer) clearInterval(pingTimer)
      if (unsubscribe) unsubscribe()
    },
  })

  return c.body(stream)
}
