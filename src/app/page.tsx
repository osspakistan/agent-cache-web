import type { Context } from 'hono'
import { Nav } from '../components/nav'
import { setPageMeta } from '../lib/page-meta'
import { contentNegotiationVary, prefersMarkdown } from '../lib/utils/markdown-negotiation'
import { Batteries } from './_sections/batteries'
import { Demo } from './_sections/demo'
import { GetStarted } from './_sections/get-started'
import { Hero } from './_sections/hero'
import { Integration } from './_sections/integration'
import { Manifesto } from './_sections/manifesto'

/**
 * GET / - the landing page. Composes its private sections; manifesto sits outside .wrap.
 * ?captured=<url> is the no-JS fallback feedback from POST /jobs/create (303 here).
 * Supports markdown content negotiation via Accept header.
 */
export const GET = (c: Context) => {
  setPageMeta({
    title: 'Agent Cache - Turn Any Docs Site Into Agent-Ready Markdown',
    description:
      'Paste a docs URL. The whole site comes back as clean markdown your agent can read. Banners, nav and cookie popups stripped, every page intact. ZIP + browsable docs.',
    image: '/og?title=Agent+Cache&subtitle=Give+your+agents+the+docs',
    canonical: 'https://agentcache.run',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Agent Cache',
      applicationCategory: 'DeveloperApplication',
      description:
        'Paste a docs URL. The whole site comes back as clean markdown your agent can read. Banners, nav and cookie popups stripped, every page intact. ZIP + browsable docs.',
      url: 'https://agentcache.run',
      operatingSystem: 'Linux, macOS, Windows',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  })

  // Markdown content negotiation
  if (prefersMarkdown(c)) {
    const md = `# Agent Cache

Turn any documentation site into clean, agent-ready markdown docs.

## How it works

1. Paste a docs URL
2. We crawl the site and convert to clean markdown
3. Download the ZIP or browse online

## API

- \`POST /api/jobs\` - Submit a docs URL for processing
- \`GET /api/jobs\` - List completed jobs
- \`GET /api/jobs/{id}\` - Get job details
- \`POST /api/probe\` - Probe a URL without starting a job

## Links

- [Packaged Docs](/docs) - Browse completed bundles
- [Health Check](/health) - Service status
- [OpenAPI Spec](/openapi.json) - API documentation
- [llms.txt](/llms.txt) - Agent-readable site index
`
    return c.text(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: contentNegotiationVary(),
    })
  }

  const captured = c.req.query('captured')
  return (
    <>
      <Nav active="home" />
      <div class="wrap">
        <main>
          <Hero captured={captured} />
          <Demo />
          <Batteries />
          <Integration />
          <GetStarted />
        </main>
      </div>
      <Manifesto />
    </>
  )
}
