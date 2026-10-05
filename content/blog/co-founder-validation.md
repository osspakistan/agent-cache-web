# why i built agent cache, why i never implemented the llm crawler, and what it takes for us to build this together

**meta title:** why i built agent cache, why i never implemented the llm crawler, and what it takes for us to build this together
**meta description:** the unvarnished reality of agent cache for a prospective co-founder: live database stats, why the llm extractor was never built, reddit validation signals, and what we do next.
**slug:** /blog/co-founder-validation
**target keywords:** agent cache cofounder, agent cache validation, llm crawler, documentation extraction, coding agents
**date:** 2026-10-05

---

to anyone reading this as a prospective co-founder: i am writing this because i don't want to sell you a fantasy. 

most founders write pitch decks full of hockey-stick charts, total addressable market projections, and promises that their ai wrapper is going to redefine software engineering. i have zero interest in doing that. if you and i are going to team up, you deserve to see the ground reality: what is working, what broke, what the database actually says, why i never implemented the llm extractor, and why i will shut this whole thing down if we do not find real pull from developers.

here is the unvarnished truth of agent cache.

## 1. what is live and what the database says

the core product is live right now at [agentcache.run](https://agentcache.run). 

the pitch is simple: coding agents like cursor, claude code, windsurf, and codex are brilliant at writing functions, but clumsy at reading live documentation. when you point them at an external url, they scrape fragmented html, get blocked by cloudflare, or burn half their context window parsing useless navigation bars and cookie banners. 

agent cache is a documentation caching engine. you paste any documentation url, and our backend pipeline crawls the site, cleans up the ast, strips out the junk, organizes the files into a clean hierarchy, and packages everything into a downloadable zip file with a `meta.yaml` and a `_map.json` index. you unzip it into your repository, and your local agent has instant, offline, deterministic access to the entire docs tree. zero network calls, zero api cost.

i pulled the latest live numbers directly from our turso database:

- **129 total crawl jobs** logged across developer runs.
- **94 completed crawls** that generated clean, downloadable documentation bundles.
- **18 failed crawls** where our deterministic parser hit a wall (unreachable domains, bot blocks, or dynamic layouts with zero discoverable routes).
- **17 jobs** currently in crawling, pending, or probing states.
- **23,904 total documentation pages** extracted and formatted into clean markdown.
- **70.6 megabytes** of compressed markdown archives delivered to developers.
- **4,047 unique visitor sessions** and 4,733 logged interaction events since launch.

you can verify these numbers yourself directly on our live analytics dashboard: [https://agentcache.run/cockpit/analytics](https://agentcache.run/cockpit/analytics). i will send you the admin password separately over reddit dm so you can inspect the live traffic, recent crawl runs, and visitor journeys yourself.

developers have already used it to crawl heavy, real-world documentation suites:
- **stripe**: 3,644 pages packed into a 9.2 mb zip.
- **supabase**: 864 pages (4.2 mb).
- **paddle**: 610 pages (2.6 mb).
- **drizzle orm**: 439 pages (1.4 mb).
- **convex**: 428 pages (1.4 mb).
- **resend**: 392 pages (1.0 mb).

on the surface, those numbers look great for an early project. but if you look closer, you see the real engineering challenge.

## 2. the accuracy trap: a "successful" crawl is not an accurate crawl

here is the first dirty secret of our current pipeline: **our system only catches crashes, not bad extractions.**

if a crawler hits a dns failure or gets a 403 forbidden, it marks the job as `failed`. but if a documentation site has 200 pages, and our crawler only finds 25 of them because the rest are hidden behind dynamic client-side javascript routing, the crawler finishes those 25 pages, exits cleanly, and marks the job as `complete`.

the system tells the user "successful!" 
in reality, 85% of the documentation is missing. 

that completed count of 94 jobs in our database is partially a vanity metric. an exit code of 200 is not a measurement of accuracy. real accuracy means verifiable completeness: comparing our extracted tree against the source site's actual sitemap and sidebar navigation depth. until we automate that audit, calling a crawl "successful" is just guessing.

## 3. why i considered an llm extractor, and why i never implemented it

when you realize that deterministic parsers miss dynamic pages, the immediate temptation is to say: "let's use an llm."

the concept i considered was an autonomous extraction harness: spin up a headless browser sandbox, take dom snapshots, and let an agent click open collapsed navigation trees, switch code tabs between typescript and python, and format the markdown. 

i stopped before writing a single line of implementation code. i never implemented it, and for good reason:

### 1. the cost and latency explosion
right now, our deterministic pipeline runs on bun, hono, and raw http fetches. a crawl of 400 pages takes seconds and costs us virtually nothing. our inference bill is literally $0. 

the moment you introduce a sandboxed browser agent that calls an llm on every tricky page, your crawl duration jumps from 15 seconds to 4 minutes. your compute and api costs explode from pennies per month to several dollars per crawl. 

### 2. the premature paywall
if i implemented an llm crawler today, i would immediately have to build billing, stripe integration, usage limits, and credit meters. we would end up looking exactly like firecrawl (charging $19 to $99 a month for credits) or context7 (charging $10 per seat for metered queries). 

charging money is fine when you know customers cannot live without your tool. but charging money before you have proven that developers even return to use the product a second time is suicide. it creates friction where you need adoption.

so i made a strict rule: **free tier means zero-cost primitives only.** no paid inference, no heavy sandbox execution, until real demand justifies it.

## 4. how i am actually validating this

i refuse to validate an idea by looking at pageview counts. 4,000 visitors means developers clicked a link on reddit or twitter. it does not mean they have a burning problem they are desperate to solve.

instead of guessing, i ran an intentional 1:1 validation experiment on reddit. i searched for developers who actively post about using cursor, claude code, or codex, and reached out directly with a simple, respectful question:

> *"when you use coding agents, do you ever have to fetch or paste library docs yourself, or do they usually get the right docs? i'm researching this workflow before building anything and would value your take. no pitch."*

here is what the outreach tracker in our gtm folder shows:
- **21 targeted leads** identified.
- **18 developers contacted** via 1:1 direct messages.
- **9 replies received** (a 50% response rate).

### what the responses taught me

the replies gave me two completely different signals:

1. **the "no pain" signal:**
one developer responded clearly: they have never faced a challenge getting docs into their coding agents. their current workflow works fine. for common libraries like react, express, or tailwind, the models already have the knowledge baked into their weights. they don't feel the pain of missing docs, so they don't need agent cache.

2. **the "real friction" signal:**
other developers pointed out genuine frustrations: agents hallucinating outdated apis for fast-moving libraries, blowing through context limits when pasting documentation manually, or getting frustrated by metered cloud search apis that charge per query. they wanted something local, fast, and quiet.

this distinction is everything. if only 10% of developers feel acute pain, agent cache is a niche hobby project. if that pain is growing as agents become more autonomous and work with specialized, proprietary, or rapidly changing libraries, then agent cache is the foundation of a critical developer tool.

## 5. what we must do next to get real validation

if you join me, we are not going to jump into writing complex backend code or building an llm engine. we need to tighten our validation loop immediately. here are the 5 practical things we need to execute right now:

### 1. replace built-in analytics with real product analytics
right now, our stats come from our own custom sqlite/turso table. it counts raw page hits and sessions, but it cannot show us user retention, session replays, or real funnel drop-offs. we need to integrate a proper analytics tool (like posthog or plausible) so we know whether a developer who crawled stripe on monday ever comes back on thursday.

### 2. connect google search console for organic search data
we need to connect gsc to see the exact queries developers type into google when searching for docs. this will tell us which frameworks and libraries developers struggle to find documentation for, giving us real demand data instead of guesses.

### 3. post daily on social media (build in public)
distribution cannot be an afterthought. we need daily, consistent posting across x, reddit, linkedin, and daily.dev. share what broke, show live extraction demos, talk about the edge cases of docusaurus vs mintlify, and see which problems get developers talking in the comments.

### 4. move the feedback button to the top of the ui
right now, our feedback button is buried at line 458 in the docs page layout. developers download the zip or view the tree, and if pages are missing, they just close the tab. we need to put an unmissable feedback button right at the top header of every docs page: *"extraction look broken or missing pages? tell us here."* when things go wrong, we need that user feedback immediately.

### 5. fix the accuracy metric
stop relying on the "status = complete" flag. we need automated scripts that compare our extracted markdown trees against the target site's raw sitemap.xml and sidebar dom to score true accuracy percentage. a crawl is only good if it captures the full tree.

## 6. the bottom line: if we don't get enough signals, i will stop

this is the most important part of this post, especially if you are considering joining me:

**the future of the llm feature (and this entire startup) depends strictly on real user pull.**

i will not spend the next six months building complex browser sandboxes, training custom extraction models, or raising money on ai hype if developers do not demonstrate consistent, repeat usage of local docs. 

if our validation interviews, social posts, and retention tracking show that developers are happy enough with cursor's default web search and context7's cloud api, i will gladly pause this project, open-source the code, and move on. i value my time and yours too much to build a solution in search of a problem.

however, if the demand signals confirm that developers want local, offline, deterministic docs for their agents, here is the lean path we take:

1. **the local `.agentcache/` convention**: a standardized, gitignorable folder inside developer projects containing clean markdown and `meta.yaml`.
2. **the open-source cli (`agentcache`)**: a zero-cloud terminal tool (`agentcache add <url>`) that lets developers pull docs straight into their codebase without visiting a website.
3. **the local stdio mcp server**: a lightweight model context protocol server that runs on the developer's laptop. when claude code or cursor needs context, the mcp server reads local `meta.yaml` keywords and feeds only the relevant page into context on demand. zero network calls, zero monthly subscription fees.
4. **the paid llm extraction engine**: only built later, as an opt-in cloud service for developers and teams who explicitly want us to extract gnarly, javascript-heavy internal enterprise portals that standard crawlers cannot touch.

## 7. what i am looking for in a co-founder

if you are a builder who appreciates pragmatism over hype, here is what i am looking for:

- **technical alignment**: someone who knows backend systems, cli tooling, or mcp protocols, and who agrees that fast and deterministic beats slow and expensive every single time.
- **brutal honesty**: someone who will tell me when an idea is bad, look at user feedback without rose-colored glasses, and help me kill features that don't pull their weight.
- **customer curiosity**: someone willing to talk to real developers, read bug reports, and dig into why an extraction failed rather than hiding behind analytics dashboards.

the repository is clean, the web app is running, 23,000+ pages have already been cached, and the database has real users. now we have to prove that this is a venture worth dedicating our lives to.

if this way of building resonates with you, let's look at the numbers together, talk to our users, and decide our next move.
