# cloudflare workers' 50 subrequest limit killed my serverless dream

**meta title:** cloudflare workers killed our serverless docs extraction pipeline
**meta description:** i tried to run agent cache on cloudflare workers. the 50 subrequest limit made it impossible for large docs sites. here's why we switched to a vps.
**slug:** /blog/cloudflare-workers-50-subrequest-limit
**target keywords:** cloudflare workers subrequest limit, cloudflare workers 50 subrequest, workers subrequest limit, serverless documentation extraction, cf workers limit

---

cloudflare workers seemed perfect for agent cache. edge computing. global distribution. serverless pricing. zero cold starts. built-in caching.

i built a proof-of-concept. then i hit the subrequest limit. and realized serverless isn't always the answer.

## why cloudflare workers seemed perfect

agent cache processes documentation extraction jobs. users submit a url. the system crawls the site, converts it to markdown, zips it, and stores it.

sounds like a perfect serverless workload: trigger on request, process in the background, store results, done.

cloudflare workers specifically:
- 0ms cold starts (v8 isolates)
- runs at the edge (low latency for users)
- integrates with r2 (our storage)
- durable objects for state management
- native fetch api for crawling

i was sold.

## the 50 subrequest limit

cloudflare workers limits each request to **50 subrequests**.

what's a subrequest? any `fetch()` call. to external domains. to r2. to durable objects. to the cache api.

each one counts.

for a single-page extraction, 50 subrequests sounds like plenty. but documentation sites have hundreds of pages. thousands, sometimes.

let's count: extracting a medium-sized docs site like supabase or convex requires fetching:
- the main page (1)
- the sitemap (1)
- navigation/sidebar to discover structure (2-3)
- each individual page content (100-500)
- images/assets (optional, we skip these)

**that's 100+ subrequests for a typical docs site.**

for large sites like stripe (8.7 MB of docs, thousands of pages), it's 500+ subrequests.

cloudflare workers caps at 50. total.

## the stripe problem

stripe docs is one of the hardest extractions we do. it's large. it's custom. it has multiple tabs and versions.

breaking that extraction into batches that fit within 50 subrequests per request? practically impossible. you'd need to chain 10+ sequential requests, each triggered by the previous. durable objects for state. queues for orchestration.

by the time you build all that, you've reinvented a server architecture. poorly.

## workarounds i tried

### workaround 1: batching pages per request

fetch multiple pages in a single request? no, cloudflare counts each `fetch()` separately. one request per page = one subrequest per page.

### workaround 2: durable objects for state

durable objects can persist state across requests. so you could:
1. request 1: fetch 50 pages, store in durable object
2. request 2: fetch next 50 pages, store in durable object
3. repeat until done

this works but adds complexity. and each durable object request counts as a subrequest too. you get maybe 40 page fetches + 10 durable object writes per request.

for a 500-page site: 500 / 40 = 13 sequential requests. taking 15+ seconds total. not terrible, but not great.

### workaround 3: waiting for a limit increase

cloudflare's enterprise plan can increase limits. but we're a side project. enterprise is $5,000+/month minimum.

not happening.

## why a vps monolith won

we switched to a vps. a single $6/month instance running bun + hono.

no subrequest limits. crawl 500 pages concurrently. use as many `fetch()` calls as you want. store results on local disk. zip them. upload to r2.

the whole extraction pipeline runs in one process. no state management. no queuing. no durable objects. the simplicity is beautiful.

portability story? serverless is more portable. but for this workload, the vps is actually easier to reason about. one process. linear execution. predictable.

## when cloudflare workers *does* work

workers is perfect for:
- simple api endpoints (authentication, webhooks)
- lightweight proxying
- small-scale scraping (under 50 pages)
- edge caching

it's just not designed for crawling documentation sites with hundreds of pages.

## the lesson: match your architecture to your workload

serverless is great for request-response patterns. small units of work. stateless transformations.

crawling is different. it's stateful. sequential. io-heavy. requires coordination across many requests.

the industry pushes serverless as the default. but defaults are just defaults. they're not rules.

for documentation extraction, a traditional server is the pragmatic choice. sometimes boring architecture is the right architecture.

## bottom line

cloudflare workers is great technology. i'm a fan. i've used it for other projects.

but for a documentation crawler that needs to fetch hundreds of pages? the 50 subrequest limit is a dealbreaker. a $6/month vps handles it better.

the lesson isn't "serverless is bad." the lesson is **"match your architecture to your workload."**

---

**related:**
- [agent cache architecture deep dive](/blog/architecture-deep-dive)
- [why i chose hono over express](/blog/why-hono-over-express)
- [the economics of docs extraction](/blog/economics-docs-extraction)
