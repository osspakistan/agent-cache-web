# try raw markdown before paying to scrape docs

**meta title:** how i extract docs: 6 methods, free ones first
**meta description:** most docs sites expose raw markdown. i built a 6-tier acquisition ladder that tries free methods first. here's how to extract docs without scraping.
**slug:** /blog/acquisition-ladder
**target keywords:** documentation extraction ladder, extract docs without scraping, cheap docs extraction, docs acquisition strategy, markdown extraction

---

when you need a docs site in markdown, the obvious answer is "scrape the html." that's expensive, slow, and fragile.

here's the secret most people miss: **most modern documentation sites already expose raw markdown.** you just need to know where to look.

i built a 6-tier acquisition ladder for agent cache. tier 1 is instant and free. tier 6 is paid extraction that i almost never need. here's the full ladder.

## why i leave html scraping until later

scraping html costs compute. it costs bandwidth. it's slow. it breaks when sites redesign.

more importantly, scraping puts you in an adversarial relationship with the docs site. you vs. cloudflare. you vs. rate limits. you vs. javascript rendering.

html scraping is tier 5 of 6. i avoid it whenever possible.

## six places to look, cheapest first

### tier 1: llms.txt, instant, one request, free

if a site has `/llms.txt` or `/llms-full.txt`, the entire docs structure is available in a single text file. no crawling needed. no parsing. no html.

llms-full.txt (when available) contains the actual docs content, not just a table of contents.

 adoption: ~8% of sites. growing fast, especially on mintlify and fumadocs platforms.

cost: zero. time: under 1 second.

### tier 2: github tree + raw cdn, 20-30 seconds, free

if a docs site is open-source on github, i don't scrape it. i download it.

1. use the git tree api to list all files in the docs directory
2. filter for markdown files (.md, .mdx)
3. download each file via `raw.githubusercontent.com`

github raw cdn serves files without rate limits for public repos. no auth needed.

best result: 3,848 files from nango's docs in 87 seconds. posthog's docs: 1,915 files in 40 seconds. clerk's docs: 1,124 files in 28 seconds.

adoption: ~30% of developer tools have docs in open-source repos.

cost: zero. time: 20-60 seconds for typical sites.

### tier 3: direct .md endpoints, 1-2 seconds per page, free

modern docs frameworks (mintlify, fumadocs, gitbook, read.me) expose raw markdown by appending `.md` to any docs url.

- `hono.dev/docs/getting-started` → html version
- `hono.dev/docs/getting-started.md` → raw markdown

mintlify is the best at this. the markdown is clean, structured, and preserves the site hierarchy. fumadocs supports it too, though their url patterns vary.

other platforms with .md support: gitbook (partial), read.me (good), nextra (good), mdbook (native).

adoption: ~30% of sites i tested.

cost: zero. time: 1 second per page, concurrent.

### tier 4: content negotiation, 1 request, free

some sites serve markdown when you send the right http headers:

```
GET /docs/page
Accept: text/markdown
```

if the server supports content negotiation, it returns raw markdown instead of html. no url modification needed.

rare but worth probing. ~3% of sites support this. when they do, it's automatic and invisible to regular users.

cost: zero. time: under 1 second per page.

### tier 5: html purification, 10-50x slower, compute cost

when none of the above work, i fall back to html extraction.

my stack:
- jsdom for dom parsing
- turndown for html-to-markdown conversion
- custom cleaners per framework
- regex-based noise removal

this is the hard path. every framework needs its own extractor. mintlify puts nav in `<nav data-mintlify>` . docusaurus uses `<div class="theme-doc-main">`. custom sites are wildcards.

i strip:
- navigation menus
- breadcrumbs
- cookie banners
- "edit this page" links
- sidebar accordions
- footer content
- cta buttons

i keep:
- main content
- code blocks (with language tags)
- inline code
- headings and structure
- tables
- links (converted to relative markdown links)

quality: varies. mintlify html cleans up beautifully. custom spa sites often leave noise.

adoption: ~38% of sites need this path.

cost: cpu and bandwidth. time: 10-100x slower than direct .md.

### tier 6: paid extraction services, $$$, last resort

i don't use this tier. it's reserved for sites that actively block extraction.

the paid tier would use:
- firecrawl (paid scraping api)
- context.dev (paid extraction)
- headless browsers with residential proxies

this is the nuclear option. expensive, slow, and contrary to my philosophy. i only consider it when polite free methods fail.

## how i detect which tier to use

the detection logic is the secret sauce. for a given docs url, i probe:

1. **llms.txt probe:** `HEAD /llms.txt` and `HEAD /llms-full.txt`
2. **github association:** is there a github repo linked from the site? does the repo contain a docs/ or website/ directory?
3. **direct .md probe:** does `/docs/page.md` return 200 with `text/markdown` content-type?
4. **content negotiation:** does `Accept: text/markdown` return actual markdown?
5. **framework detection:** html meta tags, generator tags, known css classes
6. **fallback:** html purification with generic + framework-specific cleaners

probes 1-4 are parallel and lightweight. each is a single http request. together they cover 90%+ of sites.

## finding markdown is usually enough

88% of the time, i don't touch html.

- 8% use llms.txt
- 30% use github tree
- 30% use direct .md
- 3% use content negotiation
- 38% need html purification
- <2% need paid extraction

this is the key insight: **docs extraction is mostly a discovery problem, not a scraping problem.** find the right endpoint, and the docs are already there.

## implementing your own ladder

there's nothing proprietary here. you can build the same ladder. here's the recipe:

```
1. probe /llms.txt
2. check for github repo, get git tree
3. append .md to docs urls, probe content-type
4. try content negotiation with Accept: text/markdown
5. if all fail, use jsdom + turndown framework-specific extraction
```

the hard part is the framework-specific extractors. but frameworks are finite. mintlify, fumadocs, docusaurus, gitbook, nextra, mdbook. that's most of the market.

## check for raw docs before scraping html

most docs sites want to be programmatically accessible. the framework authors built in raw markdown endpoints. github serves raw files. llms.txt is an emerging standard.

the docs are already there. you just need to know where to look.

scraping html should be the last thing you try, not the first.

---

**related:**
- [100 sites extracted: what broke and why](/blog/100-docs-sites-what-broke)
- [from html to markdown: the hard path](/blog/html-to-markdown-extraction)
- [why i extract docs without an llm](/blog/why-no-llm-extraction)
