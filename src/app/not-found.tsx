import type { AppContext } from '../lib/utils/types'

/**
 * 404 route handler - returns proper HTTP 404.
 * Agents requesting text/markdown get a markdown body with site map links.
 * Browsers get the standard HTML page.
 */
export const GET = (c: AppContext) => {
  const accept = c.req.header('Accept') || ''
  const isApi = c.req.path.startsWith('/api/') || c.req.path === '/api'
  const wantsJson =
    accept.includes('application/json') ||
    accept.includes('+json') ||
    (isApi && !accept.includes('text/html'))

  if (wantsJson) {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `The requested path '${c.req.path}' was not found.`,
          resolution_hints: [
            'Check the endpoint spelling against the OpenAPI spec at https://agentcache.run/openapi.json',
            'Refer to machine-readable site index at https://agentcache.run/llms.txt',
            'To probe a documentation site, send POST to https://agentcache.run/api/probe with { "url": "https://docs.example.com" }',
            'To submit a crawl job, send POST to https://agentcache.run/api/jobs with { "url": "https://docs.example.com" }',
            'Check system status at https://agentcache.run/health',
          ],
          links: {
            home: 'https://agentcache.run/',
            library: 'https://agentcache.run/docs',
            llms_txt: 'https://agentcache.run/llms.txt',
            openapi: 'https://agentcache.run/openapi.json',
            sitemap: 'https://agentcache.run/sitemap.xml',
            health: 'https://agentcache.run/health',
            api_catalog: 'https://agentcache.run/.well-known/api-catalog',
          },
        },
      },
      404,
      {
        Vary: 'Accept, Accept-Encoding',
      },
    )
  }

  const wantsMarkdown =
    accept.includes('text/markdown') &&
    (!accept.includes('text/html') || accept.indexOf('text/markdown') < accept.indexOf('text/html'))

  if (wantsMarkdown) {
    const md = `# 404 - Page Not Found

The path \`${c.req.path}\` does not exist on agentcache.run.

## Where to look next

- [Home](https://agentcache.run/) — Submit a docs URL for processing
- [Library](https://agentcache.run/docs) — Browse completed doc bundles
- [llms.txt](https://agentcache.run/llms.txt) — Agent-readable site index with all API endpoints
- [OpenAPI Spec](https://agentcache.run/openapi.json) — Full API specification (OpenAPI 3.0)
- [Sitemap](https://agentcache.run/sitemap.xml) — All indexable URLs
- [Health Check](https://agentcache.run/health) — Service status (JSON)

## API Quick Reference

- \`POST /api/jobs\` — Submit a documentation URL for crawling
- \`GET /api/jobs/{id}\` — Poll job status
- \`GET /api/jobs/{id}/tree\` — Get the navigation tree for a completed job
- \`POST /api/probe\` — Test a URL without starting a job
`
    return new Response(md, {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        Vary: 'Accept, Accept-Encoding',
      },
    })
  }

  return NotFoundPage(c)
}

/** 404 component - full page (wrapped in layout by the router). */
export default function NotFoundPage(_c?: AppContext) {
  return (
    <div class="wrap" style="padding:96px 20px;text-align:center">
      <h1>404 - not here.</h1>
      <p class="lede">
        This page doesn't exist. <a href="/">Back to the docs pile →</a>
      </p>
      <div style="margin-top:48px;text-align:left;max-width:600px;margin-left:auto;margin-right:auto;">
        <h2 style="font-size:18px;margin-bottom:16px;">Looking for something?</h2>
        <ul style="list-style:none;padding:0;margin:0;">
          <li style="margin-bottom:12px;">
            <a href="/">→ Landing page</a> - Submit a docs URL for processing
          </li>
          <li style="margin-bottom:12px;">
            <a href="/docs">→ Packaged Docs</a> - Browse completed doc bundles
          </li>
          <li style="margin-bottom:12px;">
            <a href="/health">→ Health Check</a> - Service status (JSON)
          </li>
          <li style="margin-bottom:12px;">
            <a href="/llms.txt">→ llms.txt</a> - Agent-readable site index
          </li>
          <li style="margin-bottom:12px;">
            <a href="/sitemap.xml">→ Sitemap</a> - XML sitemap
          </li>
          <li style="margin-bottom:12px;">
            <a href="/openapi.json">→ OpenAPI Spec</a> - API documentation (JSON)
          </li>
        </ul>
      </div>
    </div>
  )
}
