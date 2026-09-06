/**
 * Fullstack Unified Logger with evlog structured grouping & dual-layer machine/human errors.
 * - Server-side: Rich wide-event grouping via evlog request logger or root logger.
 * - Error Separation: Explicit machine diagnostics (stack, status, codes) vs human-friendly copy.
 * - Grouping: Groups domain contexts (e.g. resolver, crawler, packager, client) under clean keys.
 */

import type { AuditableLogger } from 'evlog'
import { log as evlogRoot, initLogger } from 'evlog'
import { AppError } from './errors'

// Initialize evlog once at boot
initLogger({
  env: { service: 'agent-cache-web' },
})

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntryOptions {
  group?: string
  topic?: string
  human?: string
  machine?: string
  error?: unknown
  meta?: Record<string, unknown>
  reqLog?: AuditableLogger
}

function cleanDiagnostics(raw: string): string {
  return raw.replace(/For more information, pass `verbose: true`.*$/i, '').trim()
}

export const Logger = {
  /**
   * Log an informational event, grouped into the wide event or stdout.
   */
  info(opts: {
    group?: string
    topic?: string
    message: string
    meta?: Record<string, unknown>
    reqLog?: AuditableLogger
  }) {
    const groupName = opts.group || 'general'
    const payload = {
      topic: opts.topic,
      message: opts.message,
      ...(opts.meta || {}),
    }

    if (opts.reqLog) {
      opts.reqLog.set({ [groupName]: payload })
      opts.reqLog.info(opts.message)
    } else {
      evlogRoot.info({
        group: groupName,
        topic: opts.topic,
        message: opts.message,
        ...(opts.meta || {}),
      })
    }
  },

  /**
   * Log a warning event with grouped context.
   */
  warn(opts: {
    group?: string
    topic?: string
    message: string
    meta?: Record<string, unknown>
    reqLog?: AuditableLogger
  }) {
    const groupName = opts.group || 'general'
    const payload = {
      topic: opts.topic,
      message: opts.message,
      ...(opts.meta || {}),
    }

    if (opts.reqLog) {
      opts.reqLog.set({ [groupName]: payload })
      opts.reqLog.warn(opts.message)
    } else {
      evlogRoot.warn({
        group: groupName,
        topic: opts.topic,
        message: opts.message,
        ...(opts.meta || {}),
      })
    }
  },

  /**
   * Log a debug event with grouped context.
   */
  debug(opts: {
    group?: string
    topic?: string
    message: string
    meta?: Record<string, unknown>
    reqLog?: AuditableLogger
  }) {
    const groupName = opts.group || 'debug'
    const payload = {
      topic: opts.topic,
      message: opts.message,
      ...(opts.meta || {}),
    }

    if (opts.reqLog) {
      opts.reqLog.set({ [groupName]: payload })
    } else {
      evlogRoot.debug({
        group: groupName,
        topic: opts.topic,
        message: opts.message,
        ...(opts.meta || {}),
      })
    }
  },

  /**
   * Group arbitrary structured domain data on the wide event.
   */
  group(groupName: string, data: Record<string, unknown>, reqLog?: AuditableLogger) {
    if (reqLog) {
      reqLog.set({ [groupName]: data })
    } else {
      evlogRoot.info({ group: groupName, ...data })
    }
  },

  /**
   * Dual-layer error logging:
   * - Keeps machine error strictly isolated (for terminal/logs/evlog).
   * - Keeps human explanation clean and friendly for end-users.
   */
  error(opts: LogEntryOptions) {
    const groupName = opts.group || 'errors'
    let machineMsg = opts.machine || ''
    let humanMsg = opts.human || ''
    let stack: string | undefined

    if (opts.error instanceof AppError) {
      machineMsg = opts.error.machine
      humanMsg = humanMsg || opts.error.human
      stack = opts.error.stack
    } else if (opts.error instanceof Error) {
      machineMsg = machineMsg || opts.error.message
      stack = opts.error.stack
    } else if (opts.error) {
      machineMsg = machineMsg || String(opts.error)
    }

    machineMsg = cleanDiagnostics(machineMsg)

    const errorPayload = {
      topic: opts.topic,
      human: humanMsg || 'A system error occurred.',
      machine: machineMsg,
      stack,
      ...(opts.meta || {}),
    }

    if (opts.reqLog) {
      opts.reqLog.setLevel('error')
      opts.reqLog.set({ [groupName]: errorPayload })
      opts.reqLog.error(machineMsg || humanMsg)
    } else {
      evlogRoot.error({ group: groupName, ...errorPayload })
    }
  },
}
