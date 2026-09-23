import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { buildApp } from '../src/router/build'

const app = await buildApp(join(import.meta.dir, '../src/app'))

describe('Agent Readiness: 404 & Content Negotiation', () => {
  it('returns Markdown 404 with Accept: text/markdown', async () => {
    const res = await app.request('/__ora-404-probe-test', {
      headers: { Accept: 'text/markdown' },
    })
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    const body = await res.text()
    expect(body.length).toBeGreaterThan(20)
    expect(body).toContain('404')
    expect(body).toContain('agentcache.run')
    expect(body).toContain('llms.txt')
  })

  it('returns JSON 404 with Accept: application/json', async () => {
    const res = await app.request('/__ora-404-probe-test', {
      headers: { Accept: 'application/json' },
    })
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    const json = (await res.json()) as { error: { code: string; message: string; resolution_hints: string[] } }
    expect(json.error.code).toBe('NOT_FOUND')
    expect(json.error.message).toBeTruthy()
    expect(Array.isArray(json.error.resolution_hints)).toBe(true)
    expect(json.error.resolution_hints.length).toBeGreaterThan(0)
  })

  it('returns JSON 404 on nonexistent /api/* paths automatically', async () => {
    const res = await app.request('/api/nonexistent-route')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    const json = (await res.json()) as { error: { code: string; message: string } }
    expect(json.error.code).toBe('NOT_FOUND')
  })

  it('returns HTML 404 for standard browser requests', async () => {
    const res = await app.request('/nonexistent-page', {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    })
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('404')
  })

  it('supports versioned /api/v1 endpoints with identical routing to /api', async () => {
    const resV1 = await app.request('/api/v1/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', message: 'test' }),
    })
    expect(resV1.status).toBe(200)
    expect(resV1.headers.get('content-type')).toContain('application/json')

    const res404 = await app.request('/api/v1/nonexistent')
    expect(res404.status).toBe(404)
    expect(res404.headers.get('content-type')).toContain('application/json')
    const json = (await res404.json()) as { error: { code: string } }
    expect(json.error.code).toBe('NOT_FOUND')
  })
})
