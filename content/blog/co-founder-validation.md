# 11,974 Visitors, Zero Retention: Why I Am Retiring Agent Cache v1

**meta title:** 11,974 Visitors, Zero Retention: Why I Am Retiring Agent Cache v1
**meta description:** Real numbers from my Turso database, questions developers asked in private chats, and why manual ZIP downloads fail coding agents.
**slug:** /blog/co-founder-validation
**target keywords:** agent cache metrics, coding agent documentation, llm crawler retention, developer documentation offline
**date:** 2026-10-16

---

If you build tools for coding agents, you quickly learn that web traffic is cheap, but workflow retention is brutally expensive.

Over the past three weeks, 11,974 developers visited agentcache.run. They came looking for clean Markdown documentation to feed into Cursor, Claude Code, Windsurf, and custom agent harnesses. My crawler processed 134 documentation jobs and extracted 23,917 documentation pages into 67.4 MB of compressed archives.

Yet if someone asks me how many active users Agent Cache retains today, my answer is simple: essentially zero.

Out of nearly 12,000 unique visitor sessions tracked across 22 days, exactly six people ever returned on more than one distinct day. 99.95% of visitors arrived, tested a link or inspected an archive, and vanished permanently.

Here is an honest breakdown of what my live database reveals, what developers told me in private conversations, why my initial interface hypothesis failed, and why v1 is being retired.

## 1. Ground Truth from My Database

I track real usage through Turso SQLite, exposed live via JSON at [/api/stats/public](/api/stats/public). No vanity metrics, no marketing adjustments.

Live baseline over 22 active days:

- **11,974 unique visitor sessions** recorded across **13,012 pageviews** and **13,275 total events**.
- **Daily visitor mean:** 544 visitors per day.
- **Daily visitor median:** 413 visitors per day.
- **Daily traffic spread:** Ranges from a low of 251 to a peak of 1,658 visitors in a single 24-hour window.
- **134 documentation jobs run** (99 completed clean, 18 failed fatally, 17 probing or pending).
- **23,917 pages rendered into Markdown**, stored across 67.4 MB in Cloudflare R2.
- **Multi-day returning visitors:** Exactly 6 individuals out of 11,974.

Largest documentation bundles generated:
- Stripe: 3,644 pages (8.8 MB)
- Supabase: 864 pages (4.0 MB)
- Paddle: 610 pages (2.5 MB)
- Drizzle ORM: 439 pages (1.4 MB)
- Convex: 428 pages (1.4 MB)
- Resend: 392 pages (1.0 MB)

<script>
fetch("/api/stats/public")
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (!res.ok || !res.data) return;
    var d = res.data;
    var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
    el("stat-sessions", Number(d.total_sessions).toLocaleString());
    el("stat-views", Number(d.total_pageviews).toLocaleString());
    el("stat-mean", d.daily_metrics.average_visitors);
    el("stat-median", d.daily_metrics.median_visitors);
    el("stat-pages", Number(d.total_pages).toLocaleString());
    el("stat-returning", d.returning_visitors);
  })
  .catch(function() {});
</script>

Search volume is real. Developers want accurate documentation for coding agents. But search interest does not mean you have built a usable product.

## 2. Why Retention Was Zero

When founders talk about traffic, they often hide behind cumulative pageviews to mask retention failure. Let me be direct about why visitors never returned.

Agent Cache v1 was designed as a classic web downloader:
1. Developer opens agentcache.run in a browser.
2. Developer pastes a documentation URL.
3. Server runs a heuristic crawler across navigation trees.
4. Server bundles Markdown files into a ZIP archive with `meta.yaml` and `_map.json`.
5. Developer downloads the archive, unzips it locally, and drags the folder into their workspace.

This entire interaction model contains fatal delivery friction.

Developers work inside code editors. They do not want to switch windows, wait 90 seconds for a web crawler to finish parsing DOM nodes, download an archive file, extract it to disk, and manually configure file paths inside workspace rules.

Worse, static archives decay immediately. If Stripe or Drizzle ORM publishes an API patch tomorrow, that downloaded folder turns stale. The developer is left holding outdated context, which creates the exact hallucination problems they tried to prevent in the first place.

Because there was no recurring daemon, CLI utility, or background synchronization, each visit was a detached, one-off transaction. A web download button is a utility, not a retained product.

## 3. What Engineers Actually Told Me

Over the past two weeks, I spoke with dozens of engineers, users, and prospective technical peers on Reddit and developer forums. Because these respondents are practicing software engineers who build agent systems daily, their objections represent the unvarnished perspective of my target market.

Here are four core questions they raised repeatedly.

### "Why would I download ZIP archives manually in 2026?"

One engineer put it bluntly during a discussion on agent workflows:

> *"Your proposed product involves me going to your site, inputting a URL, getting a zip file, downloading it, and pasting it in my project folder manually. API docs get updated pretty quickly. In this scenario, I would have to constantly download updated zip files manually and place them in my folder, which is quite inconvenient."*

They were right. Asking a modern engineer to manage static ZIP files manually is an obsolete pattern. Unless updates arrive via automated commands or direct agent tool interfaces, developers will abandon the workflow after their first session.

### "Why not just let frontier models search live?"

Another engineer questioned why offline caching is even necessary when modern LLMs connect to web search tools:

> *"As a developer, when I task Claude or ChatGPT with something, I expect them to search relevant content on the fly. Their search always gives me surprisingly good results. Why pay for a middleman or store static files when agents have web browsing tools like Jina or Tavily?"*

This objection highlights a widespread assumption: developers believe live model retrieval is "good enough" until they encounter massive context bills or subtle API hallucinations. However, fighting this assumption through an external web interface requires exhausting persuasion. If a product requires twenty minutes of debate to justify its core existence, the user interface wedge is wrong.

### "Why not just press Ctrl+P on the single page I need?"

A common critique from practicing builders was scope mismatch:

> *"Your use case is only relevant when I know exactly what I want to scrape. Why wouldn't I just press Ctrl+P on that specific documentation page, save it, and drop that single page into model context?"*

Engineers rarely need an entire 3,000-page enterprise documentation portal to resolve an immediate coding bug. Usually, they need two specific endpoints, a schema definition, or an authentication pattern. Forcing a user to crawl and ingest a massive document hierarchy when they only needed one page introduces unnecessary latency.

### "If competitors charge metered credits per page, how does this make financial sense?"

When evaluating unit economics, several backend engineers questioned the sustainability of arbitrary web extraction:

> *"Commercial scraping APIs charge roughly 1 credit per page. If a framework documentation site has 500 pages, that is 500 credits consumed on a single run. Why would individual developers pay a subscription for this when documentation is already public on GitHub?"*

They pinpointed an inescapable economic reality: running full-blown headless browsers and deep extraction across arbitrary third-party websites is compute-heavy. Passing those infrastructure costs to individual developers through subscriptions fails because developers expect documentation to be free.

## 4. The Engineering Bottleneck: Arbitrary Crawling is a Sinkhole

Beyond user delivery issues, the technical premise of v1 contained an inherent flaw: **deterministic crawlers cannot reliably discover arbitrary website topologies without infinite edge-case maintenance.**

In my pipeline, HTTP 200 is merely a process exit code; it is not an accuracy score.

When my crawler hits a documentation site with 200 total pages, it might successfully extract 25 pages and exit cleanly with status `complete`. Why? Because the remaining 175 pages sit behind client-side JavaScript routers, nested accordion menus, or custom state machines (such as Mintlify scoped navigation trees or Docusaurus runtime chunks).

To the user, the dashboard displays "Complete." In reality, 85% of the documentation hierarchy is completely missing.

Fixing this deterministically requires writing endless framework-specific extractors for every documentation engine on the internet. But attempting to solve it via autonomous LLM agents (spinning up headless browser instances that click every tab and inspect every DOM tree) destroys performance and unit economics. An extraction run that costs $0 and finishes in 15 seconds balloons into four minutes of compute and several dollars in model calls.

Attempting to support *any arbitrary URL* pasted by random internet visitors turned my engineering attention into an endless cycle of debugging broken DOM trees.

## 5. Effort Is Never Lost: Moving Beyond v1

Deciding to retire an MVP is not failure; it is basic engineering hygiene. Continuing to polish an interface that users do not retain is vanity.

Nothing built here was wasted:
1. **The domain and search presence are alive.** `agentcache.run` is indexed across major search engines, ranks for developer documentation keywords, and attracts over 500 organic engineering visitors every day.
2. **The underlying problem remains authentic.** Coding agents still hallucinate library methods, context windows still get choked with raw HTML bloat, and frontier models still waste tokens repeating web searches across third-party documentation portals.
3. **The failure was the interface, not the problem.** Developers do not want a manual website where they download ZIP files.

I am taking v1's URL-to-ZIP download form offline. 

Whatever shape comes next will not involve manual archive downloads or arbitrary web crawling forms. If software is meant to assist coding agents, it must live inside agent environments: delivered through direct MCP servers, lightweight CLI tools, and pre-verified library indexes that require zero manual handling.

Until then, all my live database telemetry remains publicly visible at [/api/stats/public](/api/stats/public). Inspect the numbers yourself.
