# the economics of documentation extraction: 1x to 10x cost

**meta title:** docs extraction cost breakdown: 1x (free) to 10x (expensive)
**meta description:** extracting documentation costs anywhere from free (direct markdown) to $$$ (paid services). here's the full cost breakdown across 100 extracted sites.
**slug:** /blog/economics-docs-extraction
**target keywords:** documentation extraction cost, docs extraction pricing, cost to extract documentation, cheap docs extraction, extraction cost comparison

---

not all documentation extraction costs the same. some sites expose raw markdown for free. others require headless browsers and paid proxies.

the cost difference is 10x from cheapest to most expensive. here's the full economics.

## the cost spectrum

| tier | method | cost | time | success rate |
|---|---|---|---|---|
| tier 1 | llms.txt | $0 | <1s | 8% |
| tier 2 | github tree | $0 | 20-60s | 30% |
| tier 3 | direct .md | $0 | 1-2s/page | 30% |
| tier 4 | content negotiation | $0 | 1s/page | 3% |
| tier 5 | html purification | cpu | 5-10s/page | 38% |
| tier 6 | paid extraction | $$$ | 5-10s/page | remaining |

## tier 1: llms.txt — free, instant

when a site has `/llms.txt` or `/llms-full.txt`, extraction costs nothing.

one http request. one text file. done.

llms-full.txt includes the full docs content. `llms.txt` includes a table of contents.

adoption is growing but still low (~8%). cost: $0.

## tier 2: github tree — free, fast

if docs are open-source on github:
- one free api call for the git tree
- raw cdn downloads (free, no rate limits for public repos)

cost: $0.
time: 20-60 seconds for typical sites.

## tier 3: direct .md — free, fast

mintlify, fumadocs, gitbook, and others expose `.md` endpoints.

cost: $0.
time: 1-2 seconds per page, concurrent.

## tier 4: content negotiation — free, rare

sites that serve markdown via `Accept: text/markdown`.

cost: $0.
rarity: ~3%. but worth probing.

## tier 5: html purification — cpu cost

when free methods don't work, we fall back to html extraction.

stack: jsdom + turndown + custom cleaners.

cost: cpu cycles. bandwidth. no api fees.
time: 5-10 seconds per page (slower than direct .md).

price estimate: on a $6/month vps with shared cpu, 100 pages costs maybe $0.02 in compute time. negligible.

## tier 6: paid extraction — $$$, last resort

firecrawl, context.dev, and similar services.

pricing:
- firecrawl: $83/month standard, 100,000 pages
- ~$0.001 per page

for our scale, we'd only use this for sites that actively block free extraction.

## the acquisition ladder saves money

the ladder tries free methods first. 88% of sites succeed with free methods.

so the average cost per site is close to zero. only the 12% that need paid services cost money.

if we extracted 100 sites/month:
- 88 sites: $0
- 12 sites: maybe $0.50 in compute (html purification)
- total: ~$6/month

the only actual cost is the vps: $6/month. everything else is free.

## what happens at scale

if agent cache processes 10,000 extractions/month:

| cost | amount |
|---|---|
| vps (bigger) | $20/month |
| bandwidth | negligible (most extraction is from docs sites to us) |
| r2 storage | ~$10/month for 500 GB |
| total | ~$30/month |

at that scale, the economics are incredibly favorable. docs extraction doesn't cost much when you use the free paths.

## free vs paid

the "expensive" extraction tools (firecrawl, context7) charge because they do more than just extract. they:
- index for search
- provide apis for runtime retrieval
- handle edge cases (javascript rendering, login flows)
- maintain infrastructure

agent cache doesn't do those things. it extracts once. stores locally. gives you a zip.

that's why it can be free. the scope is smaller.

## bottom line

61% of extraction is completely free.
38% costs negligible cpu.
1% might need paid services.

the secret to cheap docs extraction: try the free paths first. most sites already expose their markdown.

docs extraction is a discovery problem, not a cost problem.

---

**related:**
- [the acquisition ladder](/blog/acquisition-ladder)
- [100 sites extracted](/blog/100-docs-sites-what-broke)
