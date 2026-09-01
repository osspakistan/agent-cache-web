const PRE_1 = `<span class="cm">$ agent-cache add https://docs.example.com</span>
<span class="cm"># this site serves clean markdown. nothing to scrape.</span>
<span class="ok">✓ 428 pages found</span>
<span class="ok">✓ 428 pages fetched</span>        <span class="cm">every page, in full</span>
<span class="ok">✓ bundle written</span>           <span class="path">openai-docs/</span> · <span class="num">3.1</span>s

<span class="path">openai-docs/</span>
├── <span class="path">README.md</span>
├── <span class="path">_map.json</span>
├── <span class="path">meta.yaml</span>
├── <span class="path">getting-started/</span>  <span class="cm">quickstart.md  install.md</span>
├── <span class="path">concepts/</span>          <span class="cm">auth.md  embeddings.md</span>
└── <span class="path">api/</span>               <span class="cm">responses.md  tools.md …</span>`

const PRE_2 = `<span class="cm">$ agent-cache add https://example.com/docs</span>
<span class="cm"># classic html site. we handle the mess so you don't.</span>
<span class="ok">✓ 212 pages found</span>
<span class="ok">✓ 209 pages fetched</span>        <span class="cm">3 failed. listed, not fatal.</span>
<span class="ok">✓ bundle written</span>           <span class="path">example-docs/</span> · <span class="num">41</span>s

<span class="cm"># cookie banners, sidebars, promo walls: gone.</span>
<span class="cm"># code examples: untouched.</span>
<span class="cm"># links between pages: still work offline.</span>`

const PRE_3 = `<span class="cm">$ agent-cache add https://hono.dev</span>
<span class="ok">✓ 86 pages found</span>
<span class="ok">✓ 86 pages fetched</span>
<span class="ok">✓ bundle written</span>           <span class="path">hono-docs/</span> · <span class="num">2.4</span>s

<span class="cm"># we cached hono's docs for our own repo with this.</span>
<span class="cm"># it's the same tool we use.</span>`

export function Demo() {
  return (
    <section aria-labelledby="s1">
      <h2 id="s1">One URL in. The whole docs site out.</h2>
      <p class="sec-note">Simulated output. Pick a source, see what your agent gets.</p>

      <input type="radio" name="demo" id="t1" checked />
      <input type="radio" name="demo" id="t2" />
      <input type="radio" name="demo" id="t3" />
      <div class="tabs">
        <label class="tab" for="t1">
          mintlify site
        </label>
        <label class="tab" for="t2">
          classic docs
        </label>
        <label class="tab" for="t3">
          subdomain docs
        </label>
      </div>

      <div class="panel" id="p1">
        <div class="panel-head">
          <span class="dot"></span>https://docs.example.com → agent-cache bundle
        </div>
        <pre dangerouslySetInnerHTML={{ __html: PRE_1 }} />
      </div>

      <div class="panel" id="p2">
        <div class="panel-head">
          <span class="dot"></span>https://example.com/docs → agent-cache bundle
        </div>
        <pre dangerouslySetInnerHTML={{ __html: PRE_2 }} />
      </div>

      <div class="panel" id="p3">
        <div class="panel-head">
          <span class="dot"></span>https://docs.hono.dev → agent-cache bundle
        </div>
        <pre dangerouslySetInnerHTML={{ __html: PRE_3 }} />
      </div>

      <p class="panel-note">
        You get a plain folder: markdown files, a map of every page, and a note about where it all
        came from.
      </p>
    </section>
  )
}
