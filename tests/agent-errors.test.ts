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

  it('serves valid A2A Agent Card with required fields at /.well-known/agent-card.json', async () => {
    const res = await app.request('/.well-known/agent-card.json')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const card = (await res.json()) as {
      name: string
      version: string
      description: string
      supportedInterfaces: Array<{ url: string; protocolBinding: string; protocolVersion: string }>
      capabilities: Record<string, unknown>
      skills: Array<{ id: string; name: string; description: string }>
    }
    expect(card.name).toBe('Agent Cache')
    expect(card.version).toBe('1.0.0')
    expect(card.description).toBeTruthy()
    expect(Array.isArray(card.supportedInterfaces)).toBe(true)
    expect(card.supportedInterfaces.length).toBeGreaterThan(0)
    expect(card.supportedInterfaces[0].url).toBeTruthy()
    expect(card.supportedInterfaces[0].protocolBinding).toBeTruthy()
    expect(typeof card.capabilities).toBe('object')
    expect(Array.isArray(card.skills)).toBe(true)
    expect(card.skills.length).toBeGreaterThan(0)
    expect(card.skills[0].id).toBeTruthy()
    expect(card.skills[0].name).toBeTruthy()
    expect(card.skills[0].description).toBeTruthy()
  })

  it('serves valid /auth.md as Markdown and OAuth discovery documents as JSON', async () => {
    const resAuthMd = await app.request('/auth.md')
    expect(resAuthMd.status).toBe(200)
    expect(resAuthMd.headers.get('content-type')).toContain('text/markdown')
    const authText = await resAuthMd.text()
    expect(authText.startsWith('# auth.md')).toBe(true)

    const resProtected = await app.request('/.well-known/oauth-protected-resource')
    expect(resProtected.status).toBe(200)
    expect(resProtected.headers.get('content-type')).toContain('application/json')
    const protectedJson = (await resProtected.json()) as { resource: string; authorization_servers: string[] }
    expect(protectedJson.resource).toBe('https://agentcache.run')
    expect(protectedJson.authorization_servers).toContain('https://agentcache.run')

    const resAuthServer = await app.request('/.well-known/oauth-authorization-server')
    expect(resAuthServer.status).toBe(200)
    expect(resAuthServer.headers.get('content-type')).toContain('application/json')
    const authServerJson = (await resAuthServer.json()) as { issuer: string; agent_auth: { skill: string } }
    expect(authServerJson.issuer).toBe('https://agentcache.run')
    expect(authServerJson.agent_auth.skill).toBe('https://agentcache.run/auth.md')
  })
})
