# docsify, markdoc, and the problem with browser-rendered documentation

**meta title:** why browser-rendered docs break extraction (and what to do about it)
**meta description:** docsify renders markdown in the browser. markdoc requires custom parsing. here's why browser-rendered documentation is a trap for ai agents.
**slug:** /blog/browser-rendered-docs-extraction-problem
**target keywords:** browser rendered docs, docsify extraction problem, markdoc docs extraction, client side rendered documentation, docsify vs static docs

---

most documentation sites serve html. the content is in the response. you fetch the url, you get the text.

some don't. they serve a shell, a nearly empty html file with a javascript payload. the browser runs the javascript. the javascript fetches markdown. the markdown renders into the page.

this is browser-rendered documentation. and it's an extraction nightmare.

## how normal docs work

server-rendered docs (docusaurus, mintlify, vitepress):

```
GET /docs/getting-started
→ server sends complete html with all content
→ extraction: trivial (just read the html)
```

browser-rendered docs (docsify):

```
GET /docs/getting-started
→ server sends empty shell + javascript
→ javascript loads: "oh, this route means load `/getting-started.md`"
→ javascript fetches `/getting-started.md`
→ javascript renders markdown to html in the browser
→ extraction: impossible without a headless browser
```

## docsify: the textbook case

docsify is a popular choice because it's simple:

```html
<!-- index.html -->
<script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
<div id="app"></div>
```

that's it. one html file. the rest is markdown files served statically. docsify's javascript reads the url, finds the corresponding `.md` file, fetches it, and renders it.

for a human with a browser, this is fine. fast, simple, no build step.

for extraction, it's terrible.

### why extraction fails

when i fetch `https://docs.example.com/getting-started`:
- html response: `<div id="app"></div>` and a `<script>` tag. no content.
- the content is at `https://docs.example.com/getting-started.md`. but how do i know that? docsify's routing logic is in the javascript. i'd need to execute the javascript to know where to look.

i could try a heuristic: "if it's docsify, append `.md` to the path." this works for basic cases.

but docsify supports:
- custom route mappings (`/quickstart` → `/docs/start.md`)
- nested sidebar configurations that change routing
- plugins that modify content loading
- base path configurations
- relative paths that depend on the current route

each of these breaks the simple heuristic. without executing docsify's javascript, i can't know the actual content urls.

### running a browser costs more than fetching a page

the "solution" is a headless browser: puppeteer, playwright, selenium. a real browser that executes javascript and waits for content to appear.

this works. but:
- **10x slower.** launching a browser, executing js, waiting for render: seconds per page. vs milliseconds for static html.
- **10x heavier.** chromium is ~150mb. my extraction runs on a small vps. can't afford that.
- **unreliable.** javascript errors, infinite loops, network timeouts inside the browser. each is a failure mode.
- **rate limit trigger.** headless browsers are easy to detect. sites that block bots will block these faster than simple http requests.

for agent cache, headless browsers are tier 6. last resort. i avoid them.

## markdoc: custom parsing required

markdoc is different. it's not browser-rendered, it's processed server-side. but it extends markdown with custom syntax that requires a parser.

markdown with markdoc tags:

```markdown
# getting started

{% callout type="check" %}
make sure you have node.js 18+ installed.
{% /callout %}

{% tabs %}
{% tab label="npm" %}
```bash
npm install @stripe/stripe-js
```
{% /tab %}
{% tab label="yarn" %}
```bash
yarn add @stripe/stripe-js
```
{% /tab %}
{% /tabs %}

{% card title="next steps" href="/docs/authentication" %}
learn how to authenticate your requests.
{% /card %}
```

this isn't standard markdown. `{% callout %}`, `{% tabs %}`, `{% card %}`. these are markdoc-specific tags. they compile to react (or vue, or svelte) components.

if i extract the raw markdown, an agent sees:
- `{% callout type="check" %}` instead of a formatted callout
- `{% tabs %}` instead of tabbed content
- component references instead of rendered output

the agent can still read the text content. but it loses structure, formatting, and component semantics.

### markdoc's extraction complexity

to properly extract markdoc content, i'd need to:
1. identify that the site uses markdoc (difficult, no standard marker)
2. understand the site's markdoc schema (each site defines different tags)
3. parse the custom syntax
4. convert tags to meaningful markdown equivalents

markdoc is open-source. stripe published it. but every markdoc site has a different schema. there is no universal markdoc extractor.

for agent cache, markdoc sites fall into "custom framework" territory. site-specific extraction. expensive to maintain.

## other browser-rendered docs tools

**notion public pages:** notion serves a shell with heavy javascript. content loads via api calls. extraction requires reverse-engineering notion's private api. i skip notion entirely.

**some next.js apps with client-side data fetching:** a poorly configured next.js docs site might fetch content in `useEffect` instead of server components. same problem as docsify, empty shell on initial load.

**swagger ui / redoc:** these render openapi specs in the browser. the spec file is downloadable (usually `/openapi.json`), but the rendered html is generated client-side.

## easy for readers, expensive for crawlers

for end users, browser rendering is fine. the page loads, content appears. maybe a flicker. acceptable.

for extraction, it's catastrophic:

| approach | speed | reliability | cost | agent-readable output |
|---|---|---|---|---|
| static html (docusaurus, vitepress) | fast | reliable | $0 | excellent |
| server-rendered (next.js ssr, mintlify) | fast | reliable | $0 | excellent |
| browser-rendered (docsify, notion) | slow | unreliable | $$$ | requires headless browser |
| custom syntax (markdoc) | moderate | moderate | $0 | needs custom parser |

## what i do about it

for docsify sites, i try a heuristic: detect the framework, guess the markdown url pattern, probe for `.md` files. works for simple sites. fails for complex configurations.

for markdoc, i extract the raw markdown and accept that custom tags come through as-is. agents can still read the text. structure is degraded but not destroyed.

for notion, i skip. too complex.

for sites that truly require headless browsers: i mark as failed. agent cache doesn't do headless rendering. that's a different product.

## advice for docs authors

if you're choosing a docs tool and care about agent accessibility:

**do:** mintlify, fumadocs, docusaurus, vitepress, starlight. these render content server-side. extraction is easy.

**think twice about:** docsify. simple for you, hard for machines.

**avoid:** notion as public docs. it's a collaboration tool, not a docs platform.

**if you must use markdoc:** publish the raw markdown alongside the rendered site. or include a `/llms.txt` or `/llms-full.txt` file with clean content.

## factor extraction into your framework choice

browser-rendered documentation is a convenience for authors that becomes a tax on extraction.

every docs framework makes tradeoffs. docsify trades extractability for simplicity. markdoc trades universal parsing for component flexibility. these are legitimate choices.

but in 2026, with ai agents reading docs, extractability is no longer a niche concern. it's a core accessibility feature.

the frameworks that understand this, mintlify, fumadocs, starlight, are winning.

---

**related:**
- [framework extractor rankings](/blog/docs-framework-agent-readability)
- [how stripe's custom framework broke me](/blog/stripe-docs-crawler-challenges)
