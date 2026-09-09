import type { Context } from 'hono'
import { Nav } from '../components/nav'
import { setPageMeta } from '../lib/page-meta'
import { Batteries } from './_sections/batteries'
import { Demo } from './_sections/demo'
import { GetStarted } from './_sections/get-started'
import { Hero } from './_sections/hero'
import { Integration } from './_sections/integration'
import { Manifesto } from './_sections/manifesto'

/**
 * GET / - the landing page. Composes its private sections; manifesto sits outside .wrap.
 * ?captured=<url> is the no-JS fallback feedback from POST /jobs/create (303 here).
 */
export const GET = (c: Context) => {
  setPageMeta({
    title: 'Agent Cache // give your agents the docs',
    description:
      'Paste a docs URL. The whole site comes back as clean markdown your agent can read.',
    image: '/og?title=Agent+Cache&subtitle=Give+your+agents+the+docs',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Agent Cache',
      applicationCategory: 'DeveloperApplication',
      description:
        'Paste a docs URL. The whole site comes back as clean markdown your agent can read.',
      url: 'https://agentcache.run',
      operatingSystem: 'Linux, macOS, Windows',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  })
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
