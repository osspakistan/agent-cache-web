import type { Context } from 'hono'
import { Nav } from '../components/nav'
import { Batteries } from './_sections/batteries'
import { Demo } from './_sections/demo'
import { GetStarted } from './_sections/get-started'
import { Hero } from './_sections/hero'
import { Integration } from './_sections/integration'
import { Manifesto } from './_sections/manifesto'

/**
 * GET / — the landing page. Composes its private sections; manifesto sits outside .wrap.
 * ?captured=<url> is the no-JS fallback feedback from POST /jobs/create (303 here).
 */
export const GET = (c: Context) => {
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
