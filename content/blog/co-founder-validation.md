# why i built agent cache, why i never built the llm crawler, and what it takes for us to build this together

**meta title:** why i built agent cache, why i never built the llm crawler, and what it takes for us to build this together
**meta description:** raw facts on agent cache for a prospective co-founder: live database metrics, why the llm extractor was never built, reddit validation signals, and what we do next.
**slug:** /blog/co-founder-validation
**target keywords:** agent cache cofounder, agent cache validation, llm crawler, documentation extraction, coding agents
**date:** 2026-10-05

---

to anyone reading this as a prospective co-founder: i am not pitching you. no pitch deck, no tam charts, no hype.

if we team up, you need ground reality: what works, what broke, live database numbers, why i never implemented the llm extractor, and why i will drop this project if developers do not pull it from our hands.

here is the unvarnished brief.

## 1. live numbers

the tool is live at [agentcache.run](https://agentcache.run). paste a docs url, get a clean markdown zip with `meta.yaml` and `_map.json`. coding agents read local files offline instead of wasting context on live html.

live stats from our turso database:

- **129 crawl jobs** run.
- **94 completed**.
- **18 failed** (dns drops, bot protection, zero discoverable routes).
- **17 jobs** crawling, pending, or probing.
- **23,904 pages** extracted to markdown.
- **70.6 mb** of compressed archives generated.
- **4,047 unique visitor sessions** across 4,733 logged events.

top crawls:
- stripe: 3,644 pages (9.2 mb)
- supabase: 864 pages (4.2 mb)
- paddle: 610 pages (2.6 mb)
- drizzle orm: 439 pages (1.4 mb)
- convex: 428 pages (1.4 mb)
- resend: 392 pages (1.0 mb)

inspect the live dashboard yourself: [https://agentcache.run/cockpit/analytics](https://agentcache.run/cockpit/analytics). i will send you the admin password over reddit dm.

## 2. the accuracy flaw

our pipeline only catches fatal crashes.

if a crawler hits a 403 or dns error, it marks `failed`. but if a site has 200 pages and our crawler grabs only 25 because the rest sit behind dynamic client-side javascript tabs, it still exits clean.

the UI says "complete". 85% of the docs are missing.

a 200 status is an exit code, not an accuracy benchmark. true fidelity requires automated tree diffs against sitemaps and sidebar dom. until we build that audit, completed counts are partially vanity.

## 3. the llm extractor: why i never wrote a line of it

my first impulse to fix missing dynamic pages was an autonomous llm agent: spin up a headless sandbox, click tabs, expand menus, parse dom trees.

i stopped before writing any code. here is why:

1. **latency and cost**: our deterministic pipeline costs $0 in inference and runs in seconds. an agent sandbox calling multimodal models blows crawl time from 15 seconds to 4 minutes, and compute costs from pennies to dollars per run.
2. **premature paywall**: an llm crawler forces credit meters, stripe checkout, and paywalls immediately (like firecrawl at $19-$99/mo or context7 at $10/seat). charging money before validating repeat retention kills adoption.

rule: free tier uses zero-cost primitives only. no paid inference until retention is proven.

## 4. reddit validation

pageviews prove curiosity, not retention. to test real pain, i messaged developers using cursor, claude code, and codex on reddit:

> *"when you use coding agents, do you ever have to fetch or paste library docs yourself, or do they usually get the right docs? i'm researching this workflow before building anything and would value your take. no pitch."*

outreach numbers from our tracker:
- 21 leads identified
- 18 contacted 1:1
- 9 replies (50% response rate)

the split:
- **no pain**: one developer said they never struggle getting docs into agents. standard libraries (react, express) already live in model weights. they do not need this tool.
- **real friction**: other builders hit walls with fast-moving libraries, hallucinated methods, context limits, and metered cloud query fees. they want local, offline markdown.

if only a tiny fraction feels acute friction, this is a weekend hobby. if that friction grows as agents tackle niche libraries, it is a company.

## 5. our next 5 validation moves

we do not write heavy infra next. we tighten validation:

1. **real analytics**: replace our raw sqlite event logging with posthog or plausible to track repeat user retention.
2. **google search console**: read actual search queries to see which library docs developers search for.
3. **daily build-in-public posts**: share what breaks across x, reddit, linkedin, and daily.dev.
4. **move feedback button to the top**: it sits buried at line 458 in `src/app/docs/[id]/page.tsx`. put it in the top header so developers flag bad crawls immediately.
5. **sitemap accuracy benchmark**: compare extracted files against live sitemaps to score real tree completeness.

## 6. bottom line

the future of the llm feature and this startup depends on user pull.

if developers stay indifferent, i will stop the project, open-source the code, and move on. i refuse to build a solution looking for a problem.

if demand holds, we build the lean path first:
1. `.agentcache/` local project convention
2. open-source `agentcache` cli
3. zero-cloud stdio mcp server for cursor and claude code
4. paid llm extraction later, only for complex enterprise portals users cannot scrape themselves

## 7. the co-founder ask

i need a partner who values pragmatism over theater:
- technical alignment: fast and deterministic beats slow and expensive.
- brutal honesty: kill weak ideas early.
- customer curiosity: talk to users, inspect failed crawls, care about ground truth.

the repo is clean, the web app works, 23,000+ pages are cached, and real users are visiting. 

if this sounds like how you build, let's look at the database together and decide the next move.
