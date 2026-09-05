import { BrandMark } from './brand-mark'

export function Footer() {
  return (
    <footer class="manifesto" style="margin-top: 64px;">
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
        <div class="markbig" style="padding: 40px 0 16px;">
          <BrandMark size="hq" px={80} mode="dark" />
        </div>
      </div>
    </footer>
  )
}
