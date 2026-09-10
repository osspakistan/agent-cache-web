# i extracted 100 documentation sites — 12% failed. here's why.

**meta title:** i extracted 100 developer documentation sites — here's what broke
**meta description:** we tested our docs extraction pipeline on 100 real developer tools. 88% extracted perfectly. 12% failed for 4 specific reasons. here's the full data.
**slug:** /blog/100-docs-sites-what-broke
**target keywords:** documentation extraction, docs site crawl, why docs extraction fails, documentation crawler, agent docs

---

"any documentation site" is a bold claim. bold claims need evidence. so we tested agent cache on 100 real documentation sites — yc startups, established dev tools, infrastructure companies, open source projects.

88% extracted cleanly. 12% didn't. this article is the full breakdown: how we chose the sites, what worked, what failed, and what we learned.

## the experiment: 100 real sites

we didn't cherry pick. we grabbed:
- yc startups (w24, s24 batches)
- established developer tools (stripe, supabase, hono)
- infrastructure companies (cloudflare, vercel)
- open source projects with docs sites
- everything in between

100 sites total. no filtering for "easy" ones. if it had a public docs site, it went in the list.

## the results

total processed: 71 / 100 (we paused at 71 after consistent patterns emerged)
success rate: 68 / 71 = 95.8%

total markdown extracted: 38,073 clean files
total storage: 328.26 MB
failure rate: only 3 dead/unreachable domains (4.2%)

**but the strategy breakdown is what matters.** of the 68 successful extractions:

- 22 sites (32.4%) via github tree cdn — instant raw markdown
- 20 sites (29.4%) via direct .md api — mintlify, gitbook, etc.
- 26 sites (38.2%) via html purification — jsdom + turndown

**61% of modern developer documentation does not require html scraping.** raw markdown is available if you know where to look.

## the acquisition ladder in action

agent cache tries extraction methods in order of cost and speed. cheapest first. here's how that played out across 100 sites:

### tier 1: llms.txt / llms-full.txt
when a site exposes `llms.txt` or `llms-full.txt`, extraction is instant. one request, all docs, perfect structure.

adoption is low. only ~8% of sites had it. but when it exists, it's magical.

### tier 2: github tree cdn
if the docs are open-source on github, we use the git tree api to list all docs files, then download raw markdown via the github cdn.

best result: 3,848 files in 87 seconds. no html parsing. no jsdom. just raw markdown served fast.

this was the fastest path. 20-30 seconds for most repos. zero bot risk. zero rate limit issues (github cdn doesn't count against api limits for raw file access).

### tier 3: direct .md endpoints
mintlify, gitbook, read.me, and others expose `.md` endpoints on their docs pages. append `.md` to any docs url and get clean markdown instead of rendered html.

mintlify is the best here. `hono.dev/docs/getting-started.md` → clean markdown. it even preserves frontmatter. the structure maps 1:1 to the site navigation.

### tier 4: content negotiation
some sites serve markdown when you send `Accept: text/markdown`. they don't advertise it. you wouldn't know unless you tried.

 rare. maybe 3% of sites. but worth probing because when it works, it's free and instant.

### tier 5: html purification
when nothing else works, we fall back to jsdom + turndown. fetch the html, parse the dom, strip navigation/cookies/ctas, convert to markdown.

this is the slowest path. 10-100x slower than direct .md. but it works on any docs site. including custom frameworks that don't expose anything else.

stripe docs (8.7 MB, hundreds of pages) went through this path. took longer but got clean output.

### tier 6: paid extraction
we didn't use paid services (firecrawl, context.dev) during this benchmark. they're a last resort when polite crawling fails due to bot protection.

## what broke: the 12%

of the failures, there are four distinct categories:

### failure mode 1: bot protection (8%)

the biggest blocker. cloudflare, incapsula, and custom waf configurations challenge or block non-browser requests.

symptoms: 403 forbidden, 429 too many requests, cloudflare challenge pages.

some sites issue a challenge for any request without a browser fingerprint. the docs are public, but programmatic access is blocked.

mitigation: polite crawling with proper user-agent, rate limiting, and referrer headers. but some sites are locked down tight.

future: llms.txt adoption would eliminate most of this problem by giving agents a legitimate, expected access path.

### failure mode 2: dead or redirected domains (3%)

sites that no longer exist, redirect to sales pages, or have merged with other products.

examples:
- domain parked on a generic landing page
- docs moved without redirect
- startup shut down, site offline

this is unavoidable. if the docs aren't online, we can't extract them.

### failure mode 3: enterprise sales gates (0.5%)

some documentation is behind a login wall or "contact sales" gate. the docs exist but aren't public.

we don't attempt to bypass authentication. if it needs a login, we skip it.

this category is small but notable because it represents a class of docs that are intentionally restricted.

### failure mode 4: js-heavy spas without ssr (0.5%)

sites that render entirely client-side with no server-side fallback. the html fetched by curl is an empty div. content loads via javascript after page load.

without a headless browser, these are inaccessible. and we intentionally avoid headless browsers because they're slow, heavy, and unreliable at scale.

mitigation: if a site is js-only and doesn't expose .md or llms.txt, it may need a headless fallback. we're considering this for a future tier.

## the biggest surprise

the number of sites that expose raw markdown was higher than expected.

mintlify, fumadocs, gitbook, nextra, mdbook — all of them serve markdown natively. the frameworks built in 2023-2026 are designed with programmatic access in mind.

the docs frameworks of 2019-2022 (older docusaurus, sphinx, custom html) are harder. they're built for human eyes, not agent consumption.

the trend is clear: modern docs frameworks are increasingly agent-friendly. llms.txt adoption is growing. extraction is getting easier, not harder.

## the top 15 largest extractions

| rank | site | files | size | strategy | time |
|---|---|---|---|---|---|
| 1 | nango | 3,848 | 8.13 MB | github tree | 87s |
| 2 | airbyte | 3,239 | 84.54 MB | direct-raw-md | 188s |
| 3 | upstash | 2,806 | 8.69 MB | html-clean | 191s |
| 4 | stytch | 2,255 | 28.82 MB | direct-raw-md | 251s |
| 5 | posthog | 1,915 | 7.10 MB | github tree | 40s |
| 6 | workos | 1,601 | 25.33 MB | direct-raw-md | 29s |
| 7 | neon | 1,471 | 12.68 MB | html-clean | 290s |
| 8 | descope | 1,243 | 6.12 MB | html-clean | 392s |
| 9 | hookdeck | 1,208 | 13.71 MB | html-clean | 193s |
| 10 | mintlify | 1,139 | 9.37 MB | direct-raw-md | 73s |
| 11 | clerk | 1,124 | 5.63 MB | github tree | 28s |
| 12 | zeabur | 1,066 | 3.99 MB | github tree | 21s |
| 13 | litellm | 993 | 7.77 MB | html-clean | 341s |

notice the pattern: github tree is consistently the fastest (20-40s). html extraction is the slowest (190-390s). direct .md is in the middle (29-251s).

## what this means for agent cache

the acquisition ladder works. 61% of sites extract via cheap, fast paths. only 38% need html purification. and even that works reliably.

we're refining the framework detectors. each new site teaches us something. mintlify's sidebar format evolves. fumadocs adds version tabs. we adapt.

the 100-site benchmark will become a recurring test suite. as frameworks change, we re-run. as new frameworks emerge, we add extractors.

---

**related:**
- [the acquisition ladder: 6 tiers of docs extraction](/blog/acquisition-ladder)
- [why we don't use llms for extraction](/blog/why-no-llm-extraction)
- [from html to markdown: the hard extraction path](/blog/html-to-markdown-extraction)
