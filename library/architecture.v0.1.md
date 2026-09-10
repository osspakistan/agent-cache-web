# Agent Cache Web — Architecture & Technical Reference

Status: **Implementation Phase (v1 MVP Monolith)**.
Feature specs live in `library/system-design.md` and `.wtf/00.chats/experiments-playbooks/`.

---

## 1. High-Level Technology Stack

| Layer | Choice | Why Selected |
|---|---|---|
| **Runtime** | **Bun 1.3+** | Fast startup, native TS/TSX execution, zero client build step |
| **Server Framework** | **Hono 4** | Ultra-lightweight, modular router, built-in SSE, portable |
| **Frontend Rendering**| **Hono JSX + htmx 4** | Server-rendered HTML fragments, zero SPA bundle overhead |
| **Routing** | **File-based (`src/app/`)** | Declarative file tree scanner (`page.tsx`, `*.fragment.tsx`, `*.route.ts`) |
| **Database** | **Turso (libSQL)** | Serverless SQLite; local disk dev fallback, instant edge indexing |
| **Object Storage** | **Cloudflare R2 (S3-compatible)** | Zero egress fees, deterministic job directories (`jobs/ac-{id}/`) |
| **Extraction Engine** | **Zero-AI 5-Tier Acquisition Ladder** | `.md` direct APIs, GitHub trees, Turndown DOM purification |
| **Compression** | **fflate** | High-performance synchronous and streaming ZIP archiving |
| **Logging & Telemetry**| **evlog** | Request-scoped structured events, append-only disk journals |

---

## 2. Core Architectural Pillars

### 2.1 The "Zero-In-Memory" Rule
- **No Volatile Memory Dependency:** Process RAM is never used as an authoritative state store.
- **Disk-Backed Append-Only Ledger:** During crawling, every log line, discovery probe, and progress milestone appends immediately to disk:
  - `storage/jobs/ac-{id}/.dingdong/events.jsonl`
  - `storage/jobs/ac-{id}/logs.txt`
  - `storage/jobs/ac-{id}/final/`
- **Replayable SSE Streams:** Revisiting `/dingdong/ac-{id}` does not depend on memory; it replays the recorded JSONL ledger and resumes live subscriptions.
- **Atomic R2 Sync:** Completed bundles are compressed to `bundle.zip` on disk and synchronized to Cloudflare R2 for durable global hosting.

### 2.2 Dual-Layer Error Handling
Throughout the codebase, errors are strictly bifurcated:
1. **Machine Error (`error_machine`):**
   - Precise, technical, and exhaustive (HTTP status, DNS codes, Cloudflare Ray IDs, stack traces).
   - Displayed in server `stdout`, `evlog`, and technical log files for developers and coding agents.
2. **Human Error (`error_human`):**
   - Casual, slightly sarcastic, witty, and human-friendly.
   - **Forbidden:** Generic cop-outs like *"Something went wrong"* or *"An unexpected error occurred"*.
   - Explains the situation clearly with an actionable tip (e.g. Cloudflare WAF block, dead domain, 0 doc routes found).

### 2.3 Foreground-Only Execution (No Background Crawls in v1)
- Crawling runs attached to the user's active session.
- Visiting `/docs/ac-{id}` while a job is running issues an **HTTP 307 Temporary Redirect** back to `/dingdong/ac-{id}`.

---

## 3. Global Identification System (`ac-{id}`)

All jobs use the custom 8-character NanoID:
```text
ac-[a-z0-9]{8}
Example: ac-4k9z1m8x
```
Matches the length of `agent-cache`, providing clean, predictable identifiers for URLs, DB rows, filesystem paths, and R2 object keys.

---

## 4. Storage Architecture: Local Disk & Cloudflare R2

### R2 Bucket Structure (`jobs/ac-{id}/`):
```text
bucket-name/
└── jobs/
    └── ac-{id}/
        │
        ├── .dingdong/                         <-- Step-by-step processing traces & live stream
        │   ├── 01-probe.json                  <-- Probe traces (llms.txt, sitemap, git checks)
        │   ├── 02-manifest.json               <-- Resolved URLs & strategy selection
        │   ├── 03-nav-tree.json               <-- Extracted live sidebar/header hierarchy
        │   └── events.jsonl                   <-- Append-only event log for SSE replay
        │
        ├── final/                             <-- Clean, agent-ready markdown hierarchy
        │   ├── meta.yaml                      <-- Agent metadata (name, canonical URL, keywords)
        │   ├── _map.json                      <-- Navigational index of all files, titles, and paths
        │   ├── INDEX.md                       <-- Master documentation table of contents
        │   ├── 01-overview/
        │   │   ├── INDEX.md
        │   │   ├── 01-quickstart.md
        │   │   └── 02-architecture.md
        │   └── ...
        │
        ├── bundle.zip                         <-- Complete pre-compressed archive of `final/`
        │
        ├── logs.txt                           <-- Raw terminal transcript for curl / viewing
        │
        └── meta.json                          <-- Atomic job snapshot
```

---

## 5. Layer 2: Core Conversion Engine (The 5 Pipeline Phases)

```text
User Input URL
     │
     ▼
[ Phase 1: Target Docs Origin Resolver ] (resolver.ts)
     │ - Normalizes input domain (e.g. chatgpt.com -> developers.openai.com)
     │ - Probes subdomains: docs.*, */docs, developer.*
     │ - Fallback Tavily resolver (only on 0 pages / 403 WAF blocks)
     ▼
[ Phase 2: Structural Topology Mapper ] (topology.ts)
     │ - Sniffs live sidebar navigation DOM (<nav data-left-nav>, <aside>, etc.)
     │ - Fallback to sitemap.xml path segments
     │ - Recreates exact category & article hierarchy
     ▼
[ Phase 3: Cost-Ordered Acquisition Ladder ] (ladder.ts)
     │ - Tier 1: llms-full.txt (instant 1-request download)
     │ - Tier 2: GitHub Open-Source Strategy (github-raw-markdown via Git Trees API)
     │ - Tier 3: Direct .md API endpoints (Mintlify, GitBook, ReadMe)
     │ - Tier 4: HTML Purification (Cheerio/JSDOM + Turndown clean markdown)
     ▼
[ Phase 4: Concurrent Worker Pool ] (crawler.ts)
     │ - Concurrency N=8-12 workers
     │ - 10s timeout, polite backoff retry
     │ - Streams markdown pages directly to disk (atomic write)
     ▼
[ Phase 5: Semantic Packaging & Indexing ] (packager.ts)
     │ - 2-digit numeric prefixing (01-, 02-)
     │ - Dual Table of Contents (local INDEX.md + master docs/INDEX.md)
     │ - meta.yaml, _map.json, and bundle.zip creation
     │ - Push artifacts to Cloudflare R2 & update Turso DB status to 'complete'
```

---

## 6. Directory Layout (`agent-cache-web/src/`)

```text
src/
├── app/                               <-- File-based routes & UI views
│   ├── layout.tsx                     <-- Root HTML shell (Paper theme, fonts, HTMX)
│   ├── page.tsx                       <-- GET / (Landing page & URL submission)
│   ├── not-found.tsx                  <-- 404 page
│   ├── error.tsx                      <-- 500 error page
│   ├── health.route.ts                <-- GET /health
│   ├── jobs/
│   │   └── create.fragment.tsx        <-- POST /jobs/create -> creates job & 303 redirect
│   ├── dingdong/
│   │   └── [id]/
│   │       ├── page.tsx               <-- GET /dingdong/ac-{id} (Live terminal & status)
│   │       ├── stream.route.ts        <-- GET /dingdong/ac-{id}/stream (SSE stream & replay)
│   │       └── raw-log.route.ts       <-- GET /dingdong/ac-{id}/raw-log (Plain text curl view)
│   └── docs/
│       ├── page.tsx                   <-- GET /docs (Public completed directory)
│       └── [id]/
│           ├── page.tsx               <-- GET /docs/ac-{id} (Showcase, tree map, download)
│           └── download.route.ts      <-- GET /docs/ac-{id}/download (Instant ZIP download)
│
├── modules/
│   ├── engine/                        <-- Layer 2: Core Conversion Engine
│   │   ├── index.ts                   <-- Pipeline coordinator
│   │   ├── resolver.ts                <-- Target docs origin resolver
│   │   ├── topology.ts                <-- Structural navigation parser
│   │   ├── ladder.ts                  <-- Acquisition ladder strategy selector
│   │   ├── crawler.ts                 <-- Worker pool & HTML purifier
│   │   └── packager.ts                <-- Numeric indexer, INDEX.md & ZIP maker
│   └── jobs/
│       ├── index.ts                   <-- Job service (create, get, list, update)
│       └── db.ts                      <-- Turso / libSQL schema & query execution
│
├── lib/                               <-- Shared Foundation Layer
│   ├── clients/                       <-- Singleton infrastructure clients
│   │   ├── index.ts                   <-- Facade export for clients
│   │   ├── turso.ts                   <-- Singleton Turso / libSQL connection
│   │   ├── r2.ts                      <-- Singleton Cloudflare R2 S3 connection
│   │   └── r2-storage.ts              <-- Cloudflare R2 operations (upload, get, append events)
│   ├── utils/                         <-- Pure utilities & contracts
│   │   ├── id.ts                      <-- Domain-based ID generator ({domain.ext}-{4hex})
│   │   ├── errors.ts                  <-- Dual-layer error system (machine vs human witty)
│   │   ├── logger.ts                  <-- evlog request logger
│   │   └── types.ts                   <-- Global TypeScript interfaces
│   └── logic/                         <-- Shared cross-cutting pure business helpers
│
└── index.tsx                          <-- Application entrypoint (Bun.serve + Hono)
```
