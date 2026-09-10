# agent cache vs firecrawl: docs-specific tool vs general-purpose scraper

**meta title:** agent cache vs firecrawl: free docs extraction vs $83/month scraper
**meta description:** firecrawl is a web scraping api. agent cache is a docs extraction tool. same extraction, completely different use cases. here's the honest breakdown.
**slug:** /compare/firecrawl
**target keywords:** agent cache vs firecrawl, firecrawl alternative, firecrawl vs agent cache, docs extraction tool, documentation crawler

---

firecrawl is everywhere. 100,000+ github stars. used by apple, canva, lovable. the "context api to search, scrape, and interact with the web at scale."

agent cache is a tool that turns documentation sites into clean markdown. that's it.

both extract content from websites. that's where the similarity ends. firecrawl is a bulldozer. agent cache is a garden trowel. this article explains why you don't need a bulldozer to plant flowers.

## firecrawl scrapes, searches, and interacts with pages

firecrawl is a general-purpose web scraping api. you give it a url. it scrapes the page. returns clean markdown or structured json. can handle javascript rendering, dynamic content, login flows, multi-step interactions.

it's powerful. 96% web coverage. p95 latency of 3.4 seconds. handles js-heavy pages. crawls entire sites. extracts structured data with schemas. searches the web. interacts with pages (click, scroll, fill forms).

they have an mcp server. 400,000+ installations. integrates with cursor, claude, windsurf.

it's also open source. 100,000+ stars on github. you can self-host if you want.

**but it's not free.** despite being open source.

## firecrawl pricing

free tier: 1,000 credits/month. one credit = one page. so 1,000 pages per month free.

hobby: $16/month. 5,000 pages. standard: $83/month. 100,000 pages. growth: $333/month. 500,000 pages. scale: $599/month. 1,000,000 pages.

pay-as-you-go kicks in when you run out. $5 buys you extra credits. increments vary by plan.

if you exceed your plan, the meter runs. set a monthly cap or it keeps charging.

## agent cache packages documentation, not arbitrary web data

agent cache doesn't scrape the web. agent cache turns documentation sites into agent-ready markdown bundles.

paste a docs url. agent cache crawls the whole site. converts to clean markdown. structures it with `meta.yaml`, `_map.json`, and `INDEX.md`. gives you a zip file.

it's not a general-purpose scraper. it doesn't click buttons. it doesn't fill forms. it doesn't search the live web. it extracts documentation and nothing else.

**and it's free.** no credits. no tiers. no meter. just free.

## scraped pages still need a docs pipeline

firecrawl is infrastructure. it's a building block for applications that need web data. r&d agents, lead enrichment, competitive intelligence, price monitoring, content generation. any app that needs to read the live web.

agent cache is a product. it's a finished tool for one job: getting docs into your agent's context.

firecrawl gives you raw material. you still need to build the pipeline that turns scraped pages into structured documentation. figure out navigation. handle version tabs. strip banners and cookie notices. organize by hierarchy. none of that is automatic.

agent cache gives you the finished bundle. structured, indexed, ready to drop into your agent's context.

## reach for firecrawl beyond public docs

firecrawl is genuinely impressive. it's good at what it does.

**general-purpose scraping.** if you need to scrape e-commerce sites, news sites, social media, job boards, whatever. agent cache can't do any of that. firecrawl handles it.

**live web search.** firecrawl has a search api. ask it "what's the latest on react server components" and it searches the web, scrapes results, returns markdown. agent cache doesn't search. it only extracts what you already know the url for.

**interactions.** click buttons, fill forms, navigate pagination, handle logins. if the docs you need are behind a login wall, firecrawl can probably reach them. agent cache can't.

**structured extraction.** pass a json schema and firecrawl returns structured data matching that schema. product listings, pricing tables, contact info. agent cache returns markdown files. that's it.

**scale.** if you need to scrape millions of pages across hundreds of sites, firecrawl has enterprise plans and dedicated infrastructure. agent cache doesn't scale that way.

if your project involves scraping arbitrary websites, not just docs, firecrawl is the right choice. no question.

## docs bundles need framework-aware cleaning and indexes

but if your need is specifically documentation, agent cache is better. and it's not close.

**purpose-built for docs.** firecrawl treats a docs site like any other website. agent cache knows it's a docs site. it has framework-specific extractors for mintlify, docusaurus, gitbook, fumadocs, nextra, mdbook. it understands sidebar navigation, version tabs, api reference structures. firecrawl just scrapes html and converts to markdown.

**zero pipeline work.** firecrawl gives you raw pages. you still need to figure out which pages to scrape, how to structure them, what to keep, what to strip. agent cache handles all of that. paste url → get structured bundle. done.

**framework-aware cleaning.** firecrawl strips html and converts to markdown. but docs sites have specific patterns. cookie banners, navigation bars, "was this page helpful?" buttons, newsletter signup boxes. agent cache knows how to strip these per framework. firecrawl strips generically.

**structured output.** agent cache gives you `meta.yaml` with keywords, intent triggers, ecosystem links. `_map.json` navigation hierarchy. `INDEX.md` table of contents. firecrawl gives you pages of markdown. you build the structure.

**free.** firecrawl costs $83/month for standard usage. agent cache is free. both are open source. but only one is actually free to use.

## firecrawl is also my last-resort extraction tier

here's the thing most people don't know: **agent cache uses firecrawl.**

firecrawl is tier 6 of agent cache's acquisition ladder. when a docs site can't be extracted via llms.txt, github tree, direct .md apis, content negotiation, or html purification, agent cache falls back to firecrawl as a last resort.

so they're not really competitors. they're collaborators at different layers of the stack.

firecrawl is the brute-force fallback. agent cache is the smart, purpose-built tool.

if agent cache can extract your docs via direct .md endpoint, it takes 20 seconds and costs nothing. if not, it tries html purification. if that fails, it calls firecrawl, which costs credits, and bills you for the scrape.

firecrawl is necessary for the edge cases. agent cache is optimal for the common case.

## organizing the scraped pages is still work

some people say "just use firecrawl" when i tell them about agent cache. they think it's the same thing.

try using firecrawl to extract stripe docs and see what happens. you'll get hundreds of raw markdown pages. then you'll spend an hour organizing them. figuring out the hierarchy. stripping navigation. handling version tabs. structuring the api reference sections.

i've done this. it's tedious. it costs more in developer time than firecrawl credits.

with agent cache, i paste `docs.stripe.com`. ten minutes later i have a structured bundle with `meta.yaml`, `_map.json`, clean markdown files organized by category, and an `INDEX.md`.

the difference is not the extraction. it's what comes after.

## firecrawl for the wider web, agent cache for docs bundles

firecrawl is a web scraping api. it's great at scraping. it's not great at documentation.

agent cache is a documentation extraction tool. it's good at one thing and one thing only: turning docs sites into agent-ready markdown bundles.

if you need general-purpose web scraping, use firecrawl. it's the best tool in that category.

if you need documentation extraction, use agent cache. purpose-built beats general-purpose every time. and it's free.

use firecrawl for the 12% of docs sites that resist all other extraction methods (bot protection, custom frameworks, weird js rendering). that's what it's for.

use agent cache for the 88% of docs sites that have exposed .md endpoints, github repos, or clean html structures. that's what it's for.

---

**related:**
- [agent cache vs context7](/compare/context7)
- [how agent cache extracts docs before trying firecrawl](/blog/acquisition-ladder)
- [i extracted 100 docs sites. here's what broke](/blog/100-docs-sites-what-broke)
