import { BrandMark } from '../../components/brand-mark'

export function Manifesto() {
  return (
    <footer class="manifesto">
      <div class="wrap">
        <p class="thesis">Your agent is only as good as its docs.</p>
        <p>
          Documentation sites are built for humans who click. Agents read raw text, and they drown
          in banners, menus, and cookie popups before they ever reach the answer.
        </p>
        <p>
          Agent Cache fetches the entire site, strips it down to content, and organizes it the way
          agents read: plain markdown, in folders that match the site structure.{' '}
          <span class="dim">No summaries. No lost pages.</span>
        </p>
        <p>
          We kept pasting docs into agents by hand.{' '}
          <span class="dim">Copying pages, dodging popups, losing code examples on the way.</span>{' '}
          Nobody should have to do that twice.
        </p>
        <p>
          It's not perfect yet. But the bet is simple:{' '}
          <span class="dim">
            the clean version of the docs already exists. Someone just had to package it.
          </span>
        </p>
        <div class="markbig">
          <BrandMark size="hq" px={88} mode="dark" />
        </div>
      </div>
    </footer>
  )
}
