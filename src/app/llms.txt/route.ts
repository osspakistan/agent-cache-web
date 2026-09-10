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

## How It Works

1. Submit a docs URL via \`POST /api/jobs\` with \`{"url": "https://docs.example.com"}\`
2. Poll \`GET /api/jobs/{id}\` until status is "complete"
3. Download the ZIP via \`GET /api/jobs/{id}/download\` or browse at \`/docs/{id}\`
4. Extract \`.agentcache/docs/{name}/docs/\` in your repo and reference the files in agent conversations

No LLM in the pipeline. Structure comes from URL topology. Output is deterministic: same input, same output.

## API Endpoints

- \`POST /api/jobs\` - Submit a new crawl job
- \`GET /api/jobs\` - List jobs
- \`GET /api/jobs/{id}\` - Get job details
- \`GET /api/jobs/{id}/tree\` - Get job navigation tree
- \`POST /api/probe\` - Probe a URL without starting a job
- \`GET /openapi.json\` - OpenAPI 3.0 specification

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
- [Health](${BASE}/health): Service status (JSON)
- [Sitemap](${BASE}/sitemap.xml): XML sitemap
- [Full index](${BASE}/llms-full.txt): This site's writing, full text in one file
`

  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
