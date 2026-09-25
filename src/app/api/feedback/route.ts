import { nanoid } from 'nanoid'
import { createFeedback, listFeedback } from '../../../lib/clients'
import type { AppContext } from '../../../lib/utils/types'

/**
 * POST /api/feedback - Submit issue/feedback on a docs bundle
 * Body: { job_id: string, kind?: string, email: string, details: string }
 */
export const POST = async (c: AppContext) => {
  let jobId = ''
  let kind = 'missing-page'
  let email = ''
  let details = ''

  const cType = c.req.header('content-type') || ''
  if (cType.includes('application/json')) {
    try {
      const body = (await c.req.json()) as {
        job_id?: string
        kind?: string
        email?: string
        details?: string
      }
      jobId = String(body.job_id || '').trim()
      kind = String(body.kind || 'missing-page').trim()
      email = String(body.email || '').trim()
      details = String(body.details || '').trim()
    } catch {}
  } else {
    try {
      const form = await c.req.parseBody()
      jobId = String(form.job_id || '').trim()
      kind = String(form.kind || 'missing-page').trim()
      email = String(form.email || '').trim()
      details = String(form.details || '').trim()
    } catch {}
  }

  if (!email || !details) {
    return c.json(
      {
        ok: false,
        error: 'Missing required fields: email and details are required',
        code: 'MISSING_FIELDS',
      },
      400,
    )
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailValid) {
    return c.json(
      {
        ok: false,
        error: 'Invalid email address provided',
        code: 'INVALID_EMAIL',
      },
      400,
    )
  }

  if (details.length < 8) {
    return c.json(
      {
        ok: false,
        error: 'Details must be at least 8 characters',
        code: 'DETAILS_TOO_SHORT',
      },
      400,
    )
  }

  try {
    const feedback = await createFeedback({
      id: nanoid(10),
      job_id: jobId,
      kind,
      email,
      details,
    })

    return c.json(
      {
        ok: true,
        feedback: {
          id: feedback.id,
          job_id: feedback.job_id,
          created_at: feedback.created_at,
        },
      },
      201,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error saving feedback'
    return c.json({ ok: false, error: message, code: 'SERVER_ERROR' }, 500)
  }
}

/**
 * GET /api/feedback - Retrieve list of feedback submissions
 */
export const GET = async (c: AppContext) => {
  try {
    const feedbackList = await listFeedback(100)
    return c.json({
      ok: true,
      feedback: feedbackList,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error fetching feedback'
    return c.json({ ok: false, error: message, code: 'SERVER_ERROR' }, 500)
  }
}
