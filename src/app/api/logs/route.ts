import { log as evlogRoot } from 'evlog'
import type { AppContext } from '../../../lib/utils/types'

/**
 * POST /api/logs
 * Ingestion endpoint for client-side events, errors, and diagnostics.
 * Groups incoming browser signals cleanly into server-side evlog wide event.
 */
export const POST = async (c: AppContext) => {
  try {
    const payload = (await c.req.json()) as {
      level?: 'info' | 'warn' | 'error' | 'debug'
      group?: string
      topic?: string
      human?: string
      machine?: string
      message?: string
      url?: string
      userAgent?: string
      meta?: Record<string, unknown>
      timestamp?: number
    }

    const reqLog = c.get('log')
    const groupName = payload.group || 'client'
    const level = payload.level || 'info'

    const entry = {
      topic: payload.topic,
      human: payload.human || payload.message,
      machine: payload.machine,
      url: payload.url,
      timestamp: payload.timestamp || Date.now(),
      ...(payload.meta || {}),
    }

    if (reqLog) {
      reqLog.set({
        [groupName]: entry,
      })
      if (level === 'error') {
        reqLog.setLevel('error')
        if (payload.machine || payload.human) {
          reqLog.error(payload.machine || payload.human || 'Client Error')
        }
      } else if (level === 'warn') {
        reqLog.setLevel('warn')
      }
    } else {
      if (level === 'error') {
        evlogRoot.error({
          group: groupName,
          ...entry,
          clientMessage: payload.machine || payload.human || 'Client error',
        })
      } else if (level === 'warn') {
        evlogRoot.warn({
          group: groupName,
          ...entry,
          clientMessage: payload.human || payload.message,
        })
      } else if (level === 'debug') {
        evlogRoot.debug({
          group: groupName,
          ...entry,
          clientMessage: payload.human || payload.message,
        })
      } else {
        evlogRoot.info({
          group: groupName,
          ...entry,
          clientMessage: payload.human || payload.message,
        })
      }
    }

    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false, error: 'Failed to ingest log' }, 400)
  }
}
