import { BrandMark } from '../../components/brand-mark'

export function Manifesto() {
  return (
    <footer class="manifesto">
      <div class="wrap">
        <p class="thesis">Your agent is only as good as its docs.</p>
        <p>
          Docs sites are built for humans who click. Agents read text and hit banners, nav, and
          cookie popups before they ever find the answer.
        </p>
        <p>
          I fetch the whole site, handle the Mintlify and Docusaurus and Sphinx quirks, and lay it
          out as plain markdown in folders that match the site.
        </p>
        <p>
          Pasting docs into agents by hand meant copying pages, dodging popups, and losing the code
          block that mattered.
        </p>
        <p>
          It is not perfect yet. The bet is simple. The clean version of the docs already exists. I
          just package it.
        </p>
        <div class="markbig">
          <BrandMark size="hq" px={88} mode="dark" />
        </div>
      </div>
    </footer>
  )
}
