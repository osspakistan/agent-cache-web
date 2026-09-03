import { runConversionEngine } from '../../../modules/engine'
import { getJobById } from '../../../modules/jobs'
import { readEventsFromR2 } from '../../../modules/storage/r2'
import type { AppContext, StreamEvent } from '../../../shared/types'

/**
 * GET /dingdong/:id/stream — SSE streaming endpoint.
 * Plays back existing events from R2 first, and if job is still pending, starts/streams the conversion engine.
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

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: StreamEvent) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // 1. Replay historical events from R2
      const pastEvents = await readEventsFromR2(id)
      for (const ev of pastEvents) {
        sendEvent(ev)
      }

      // 2. If already finished, close stream
      if (job.status === 'complete' || job.status === 'failed') {
        controller.close()
        return
      }

      // 3. If job is pending, trigger the foreground engine run attached to this stream
      if (job.status === 'pending') {
        try {
          await runConversionEngine({
            job,
            onEvent: (event) => {
              sendEvent(event)
            },
          })
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : 'Stream engine failure'
          sendEvent({
            type: 'error',
            machine: errMessage,
            human: 'An unexpected glitch interrupted the crawler stream.',
            timestamp: Date.now(),
          })
        } finally {
          controller.close()
        }
      }
    },
  })

  return c.body(stream)
}
