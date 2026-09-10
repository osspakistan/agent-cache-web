# agent cache architecture: zero-memory, disk-backed, sse-streamed

**meta title:** agent cache architecture: how i built a crash-proof docs crawler
**meta description:** agent cache uses a zero-memory architecture where nothing stays in ram. everything streams to disk. here's how i built a deterministic, replayable docs extraction pipeline.
**slug:** /blog/architecture-deep-dive
**target keywords:** agent cache architecture, zero-memory architecture, disk-backed processing, sse streaming architecture, hono htmx architecture

---

most web apps hold state in memory. they hope the process doesn't crash. they hope the server doesn't restart. they hope nothing needs to replay.

agent cache uses a different rule: **zero in-memory state.** every log line, every discovered page, every progress update streams directly to disk. this makes the system crash-proof, replayable, and surprisingly simple.

here's the full architecture.

## if it matters, write it to disk

rule: **no state is stored in memory unless it can be reconstructed from disk.**

this means:
- no in-memory job queues
- no in-memory caches with "back to cache later"
- no "i'll write to disk at the end"
- if the process dies mid-crawl, restart and resume from disk

everything that matters goes to an append-only event ledger on disk. everything else is disposable.

## every job gets an append-only event log

every extraction job gets a directory: `storage/jobs/ac-{id}/`

inside:
- `events.jsonl`: append-only event log. every event timestamps and serializes to this file.
- `logs.txt`: human-readable logs for terminal viewing
- `final/`: extracted docs in their final structure
- `bundle.zip`: the final packaged output

the event log is the source of truth. it's append-only. no events are ever modified or deleted. to "cancel" a crawl, i append a cancellation event.

this makes the system trivially replayable. any agent or human can `cat events.jsonl` and see exactly what happened.

## from url to zip in five phases

```
User Input URL
     │
     ▼
[ Phase 1: Resolver ] → Normalize URL, find canonical docs endpoint
     │
     ▼
[ Phase 2: Topology ] → Detect framework, extract navigation structure
     │
     ▼
[ Phase 3: Ladder ]   → Try extraction strategies in cost order
     │
     ▼
[ Phase 4: Crawler ]  → Fetch and convert markdown (8-12 workers)
     │
     ▼
[ Phase 5: Packager ] → Build INDEX.md, meta.yaml, _map.json, zip
```

each phase is isolated. it reads from the previous phase's outputs and writes to disk. no shared memory.

## phase 1: resolver

takes any input url. finds the canonical docs endpoint.

examples:
- `stripe.com` → `docs.stripe.com`
- `github.com/stripe/stripe-node` → `docs.stripe.com` (not the repo)
- `context.dev` → `docs.context.dev`

probes subdomains (`docs.*`, `developer.*`, `api.*`). checks for redirects. verifies the endpoint returns actual documentation.

if no docs endpoint is found, the job fails early with a clear error. no point crawling a marketing page.

## phase 2: topology mapper

detects the docs framework and extracts the navigation structure.

framework detection queries:
- html meta tags: `<meta name="generator" content="docusaurus">`
- specific css classes: `.theme-doc-main` for docusaurus, `data-mintlify` for mintlify
- known html patterns: specific `<nav>` structures
- url patterns: `/docs/getting-started` structure

once detected, framework-specific extractors parse the navigation:
- **mintlify:** reads the navigation from a known api endpoint
- **docusaurus:** extracts from the sidebar json or html
- **fumadocs:** reads version tabs and group structure
- **generic:** falls back to sitemap parsing

the topology is a tree: chapters → sections → pages. this structure drives phase 4.

## phase 3: acquisition ladder

the ladder was covered in detail in a separate post. but architecturally, it's a decision tree that runs per-page.

for each discovered url, the ladder asks:
1. llms.txt available? → use it
2. direct .md endpoint? → fetch it
3. github tree? → download raw files
4. content negotiation works? → use it
5. html purification → fall back

each tier writes to disk independently. no tier depends on another tier's memory state.

## phase 4: crawler with worker pool

8-12 concurrent workers. each worker:
1. reads a url from the discovered list
2. runs it through the acquisition ladder
3. writes the extracted markdown to disk
4. appends a completion event

workers are independent. one worker crashing doesn't affect others. the main process restarts crashed workers.

concurrency is bounded: 8-12 workers is the sweet spot. below 8, i leave speed on the table. above 12, diminishing returns and potential for rate limiting.

## phase 5: packager

after all pages are extracted, the packager:
1. reads all extracted markdown files from disk
2. generates `meta.yaml` with metadata (name, url, keywords, etc.)
3. generates `_map.json` with the navigation tree
4. generates `INDEX.md`: a table of contents
5. structures the output: `docs/<chapter>/<section>/<page>.md`
6. zips everything into `bundle.zip`
7. uploads to r2 for permanent storage

this phase is single-threaded and io-bound. disk → cpu → disk → network.

## sse streaming: progress without websockets

the ui shows extraction progress in real-time. sse (server-sent events) streams events from the `events.jsonl` file to the browser.

when a user visits `/dingdong/ac-{id}`, the server:
1. opens the event log
2. replays all historical events via sse
3. keeps the stream open for new events
4. buffers and streams as events happen

if the user refreshes, events replay again. no state lost.

this is simpler than websockets. no connection management. no reconnect logic. just read the file and stream.

## storage: local disk + r2

**local disk** is the working store. everything during extraction lives here. fast writes. fast reads.

**r2 (cloudflare)** is the final store. completed bundles are uploaded here. r2 has zero egress fees, which matters when users download zip files.

turso (libsql) stores job metadata: job id, url, status, timestamps. tiny data. sqlite handles it fine.

## dual-layer error handling

every error generates two outputs:

**machine error:** goes to logs. technical. exhaustive. includes http status, stack traces, cloudflare ray ids, dns codes. for debugging.

**human error:** goes to the user. witty, actionable, specific. never "something went wrong." always "cloudflare blocked the request with a challenge page. try again or use a different url."

machine errors are for me. human errors are for users. both are correct for their audience.

## why this architecture wins

**crash-proof:** process dies? restart and replay from the event log. crawling resumes where it stopped.

**debuggable:** `cat events.jsonl` tells the entire story. every decision. every failure. every retry.

**scalable (not in the cloud sense):** no redis. no message queues. no kubernetes. just disk and processes. a $6 vps handles everything.

**simple:** fewer moving parts than a typical microservices setup. one process. linear flow. predictable.

**observable:** the event log is a perfect audit trail. see exactly what happened, when, and why.

## tradeoffs

- **disk io is slower than memory.** but for this workload, it doesn't matter. extraction is network-bound (fetching pages), not cpu-bound.
- **not horizontally scalable.** i don't need horizontal scaling. one vps handles everything.
- **replay takes time.** if a job has 10,000 events, replaying them takes a few seconds. acceptable.

## disk, one process, and a browser stream

the architecture is intentionally boring. no fancy distributed systems. no kubernetes. no event sourcing framework.

just: write to disk. read from disk. stream to browser.

the simplicity is the feature.

---

**related:**
- [cloudflare workers killed my serverless dream](/blog/cloudflare-workers-50-subrequest-limit)
- [trying cheaper extraction methods first](/blog/acquisition-ladder)
- [100 sites extracted](/blog/100-docs-sites-what-broke)
