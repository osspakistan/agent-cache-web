import { getContent } from '../../lib/content'
import type { AppContext } from '../../lib/utils/types'

const BASE = 'https://agentcache.run'

/**
 * GET /llms.txt - agent-readable site index, generated from the content
 * registry at request time so it can never go stale (unlike the old static
 * file). Follows the llms.txt convention: overview first, then grouped links
 * to markdown-friendly pages.
 */
export const GET = async (_c: AppContext) => {
  const [blog, compare] = await Promise.all([getContent('blog'), getContent('compare')])

  const blogList = blog.map((p) => `- [${p.title}](${BASE}${p.route}): ${p.description}`).join('\n')
  const compareList = compare
    .map((p) => `- [${p.title}](${BASE}${p.route}): ${p.description}`)
    .join('\n')

  const md = `# Agent Cache

> Turn any documentation site into clean, agent-ready markdown docs. Paste a docs URL, get the whole site back as plain markdown files a coding agent can read.

## When to Use Agent Cache

Use Agent Cache when:

- You need offline, complete documentation for an unfamiliar library or API to include in an agent conversation or repository.
- You are integrating a library and want the full docs in plain markdown, not just snippets or search results.
- You want a deterministic, reproducible documentation artifact — same URL always produces the same output.
- You need docs for a library that Context7 doesn't index, or for a specific pinned version of docs.

**Do NOT use** Agent Cache for:
- Real-time web search (use a search tool instead).
- Pages behind authentication (the crawler cannot log in).
- General web scraping (this is purpose-built for documentation sites).

## How to Call the API

1. Submit a docs URL: \`POST /api/jobs\` with body \`{"url": "https://docs.example.com"}\`
2. Receive a job ID in the response: \`{"ok": true, "job": {"id": "ac-xxxx"}, "links": {...}}\`
3. Poll for completion: \`GET /api/jobs/{id}\` until \`status === "complete"\`
4. Browse online at \`/docs/{id}\` or download the ZIP at \`/docs/{id}/download\`
5. Extract the ZIP's \`.agentcache/docs/{name}/docs/\` folder into your repo

Full API spec: https://agentcache.run/openapi.json

## How It Works

1. Submit a docs URL via \`POST /api/jobs\` with \`{"url": "https://docs.example.com"}\`
2. Poll \`GET /api/jobs/{id}\` until status is "complete"
3. Download the ZIP via \`GET /api/jobs/{id}/download\` or browse at \`/docs/{id}\`
4. Extract \`.agentcache/docs/{name}/docs/\` in your repo and reference the files in agent conversations

No LLM in the pipeline. Structure comes from URL topology. Output is deterministic: same input, same output.

## API Endpoints (v1 & unversioned)

All endpoints support both \`/api/v1\` (versioned) and \`/api\`:

- \`POST /api/v1/jobs\` (or \`POST /api/jobs\`) - Submit a new crawl job
- \`GET /api/v1/jobs\` (or \`GET /api/jobs\`) - List jobs
- \`GET /api/v1/jobs/{id}\` (or \`GET /api/jobs/{id}\`) - Get job details
- \`GET /api/v1/jobs/{id}/tree\` (or \`GET /api/jobs/{id}/tree\`) - Get job navigation tree
- \`POST /api/v1/probe\` (or \`POST /api/probe\`) - Probe a URL without starting a job
- \`GET /openapi.json\` - OpenAPI 3.0 specification

## Developer Resources

- [OpenAPI Specification](https://agentcache.run/openapi.json) - Full API documentation in OpenAPI 3.0 format
- [llms.txt](https://agentcache.run/llms.txt) - This file: agent-readable site index
- [llms-full.txt](https://agentcache.run/llms-full.txt) - Full text of all content on this site
- [Health Check](https://agentcache.run/health) - Service status as JSON

## Blog

Field notes on docs extraction, frameworks, and agent-readable documentation.

${blogList}

## Comparisons

Honest comparisons against other docs tooling.

${compareList}

## Feeds

- [Site feed](${BASE}/feed.xml): RSS for everything
- [Blog feed](${BASE}/blog/feed.xml): RSS for blog posts
- [Comparisons feed](${BASE}/compare/feed.xml): RSS for comparisons

## Pages

- [Add docs](${BASE}/): Submit a docs URL for processing
- [Library](${BASE}/docs): Browse completed doc bundles
- [Blog](${BASE}/blog): All writing
- [Comparisons](${BASE}/compare): All comparisons
- [About](${BASE}/about): About Agent Cache
- [Contact](${BASE}/contact): Get in touch
- [Privacy](${BASE}/privacy): Privacy policy
- [Health](${BASE}/health): Service status (JSON)
- [Sitemap](${BASE}/sitemap.xml): XML sitemap
- [Full index](${BASE}/llms-full.txt): This site's writing, full text in one file
`

  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
