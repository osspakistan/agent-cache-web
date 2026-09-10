# Agent Cache — System Design Document (Architecture & Outer Layer)

**Document Version:** 1.1.0  
**Status:** Architecture Locked (Outer Layer, Storage Foundation & Dual Error Handling)  
**Date:** 2026-09-03  
**Implementation Target:** `agent-cache-web/`  

---

## 1. Executive Summary & Core Design Philosophy

Agent Cache is a web-first tool that transforms any documentation site into an agent-first, machine-readable format (Markdown + metadata), browsable online and downloadable as an indexed ZIP bundle.

### 1.1 The "Zero-In-Memory" Principle
1. **Persistent-First (No Ephemeral Memory Loss):**
   - The application does **not** rely on in-memory process caches or RAM buffers for job state.
   - If the server restarts or worker crashes mid-crawl, state is not lost; all events, progress milestones, and logs live deterministically on disk (`storage/jobs/<id>/`) and synchronize to Cloudflare R2.
2. **Deterministic & Replayable:**
   - Any job can be revisited at any time via `/dingdong/ac-{id}` or `/docs/ac-{id}`.
   - Revisiting a live or completed job replays the execution history directly from the recorded event stream, never from volatile memory.
3. **Decoupled Architecture:**
   - **Outer Layer:** Web routing, page delivery, Server-Sent Events (SSE), database persistence (Turso/libSQL), and object storage (Cloudflare R2).
   - **Inner Layer (Pluggable):** The universal extraction engine (the crawling, topology probing, HTML purification, and AST normalization ladder) runs independently and reports to the storage layer via standard file/event contracts.

### 1.2 Foreground-Only Execution (No Heavy Background Jobs in v1)
- Crawling runs in the foreground attached directly to the user's active connection.
- Users remain on the `/dingdong/ac-{id}` processing screen while live events stream.
- If a user visits `/docs/ac-{id}` while the job is still running, the server issues an **HTTP 307 Temporary Redirect** right back to `/dingdong/ac-{id}`.

---

## 2. Dual-Layer Error Handling Architecture

Throughout the entire project, errors are strictly separated into two distinct representations: **Machine/Server-Side Errors** and **Human/UI-Facing Errors**.

```text
               ┌──────────────────────────────┐
               │         Error Event          │
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
   [ 1. Machine/Terminal Error ]  [ 2. Human/UI-Facing Error ]
   - Precise stack traces         - Casual, clever, witty tone
   - Exact HTTP status codes      - Sarcastic yet helpful context
   - Detailed network errors      - NEVER "Something went wrong"
   - Server stdout / logs.txt     - Clear next step for human
   - For: Developers, Agents      - For: Users watching the UI
```

### 2.1 The Two Error Tiers

| Tier | Audience | Location | Purpose & Tone | Example |
|---|---|---|---|---|
| **Machine Error** | Developers, Ops, Coding Agents | Server terminal stdout, `evlog`, `logs.txt`, `.dingdong/events.jsonl` | Exhaustive technical precision: error class, code, HTTP status, request headers, target URL, and stack trace. | `[FATAL] HTTP 403 Forbidden: Cloudflare Turnstile bot challenge triggered on https://example.com/docs (Ray ID: 8829a1b0)` |
| **Human Error** | End Users | Browser UI cards, banners, `/docs/ac-{id}` recovery states | Casual, slightly sarcastic, human-friendly, yet razor-sharp clear. **Forbidden:** generic cop-outs like *"Something went wrong"* or *"An unexpected error occurred"*. | *"Cloudflare threw a tantrum and decided you're a Russian robot. We couldn't sneak past their door on this one. Try pasting their direct docs subdomain instead of the homepage."* |

### 2.2 Standard Error Catalog

```typescript
export interface AppError {
  /** Machine-readable error code */
  code: 'BOT_BLOCKED' | 'INVALID_URL' | 'ZERO_PAGES' | 'TIMEOUT' | 'DNS_FAILURE' | 'RATE_LIMITED'
  /** Server/Agent log message (exhaustive technical detail) */
  machine: string
  /** UI display message (casual, witty, clear) */
  human: string
  /** Technical details / stack */
  details?: Record<string, unknown>
}
```

* **Bot Block (403/Cloudflare):**
  - *Machine:* `HTTP 403 Forbidden: Cloudflare WAF challenge on origin https://...`
  - *Human:* `Cloudflare's bouncer took one look at our crawler and slammed the velvet rope. Try feeding us the direct docs subdomain instead of their marketing homepage.`
* **No Documentation Found (0 Pages):**
  - *Machine:* `DiscoveryError: 0 documentation routes identified across llms.txt, sitemap, and nav probes.`
  - *Human:* `We checked the sitemap, peeked at llms.txt, and sniffed every link—this site is guarding its docs like state secrets. Double check if this URL actually hosts developer docs.`
* **Unreachable / DNS Dead End:**
  - *Machine:* `FetchError: ENOTFOUND at dns.lookup(fake-url.dev)`
  - *Human:* `That domain seems as dead as dial-up internet. Check the spelling before our crawler hurts itself trying to find it.`
* **Rate Limited (429):**
  - *Machine:* `HTTP 429 Too Many Requests: Retry-After 60s`
  - *Human:* `Their server told us to slow our roll. We backed off politely, but they're still catching their breath. Give it a minute and hit retry.`

---

## 3. Global Identification System (`ac-{id}`)

Every extraction job is assigned an 8-character NanoID prefixed with `ac-`:

```text
ac-{8-char-nanoid}
Example: ac-4k9z1m8x
```

* **Rationale:** Matches the 8-character length of `agent-cache`, providing clean, recognizable, and collision-resistant URLs across the site.
* **Consistency:** The exact same ID is used as:
  - Database primary key in Turso (`id`).
  - Web route parameter (`/dingdong/ac-4k9z1m8x`, `/docs/ac-4k9z1m8x`).
  - Scratch disk path (`storage/jobs/ac-4k9z1m8x/`).
  - Cloudflare R2 bucket prefix (`jobs/ac-4k9z1m8x/`).

---

## 4. Storage Architecture: Cloudflare R2 & Local Disk

Following the agreed 4-item bucket layout, every job folder in R2 is structured under `jobs/ac-{id}/`:

```text
bucket-name/
└── jobs/
    └── ac-{id}/
        │
        ├── .dingdong/                         <-- Step-by-step processing, probe traces & live stream
        │   ├── 01-probe.json                  <-- Machine-readable probe trace (llms.txt, sitemap, git)
        │   ├── 02-manifest.json               <-- Resolved URLs & strategy decision
        │   ├── 03-nav-tree.json               <-- Extracted live sidebar/header hierarchy
        │   └── events.jsonl                   <-- Append-only event log (powers real-time SSE & replay)
        │
        ├── final/                             <-- Agent-ready clean markdown hierarchy
        │   ├── meta.yaml                      <-- Standard metadata (name, url, keywords, version)
        │   ├── _map.json                      <-- Navigational index of all files, titles, and paths
        │   ├── INDEX.md                       <-- Master documentation table of contents
        │   ├── 01-overview/
        │   │   ├── INDEX.md
        │   │   ├── 01-quickstart.md
        │   │   └── 02-architecture.md
        │   ├── 02-core-concepts/
        │   │   ├── INDEX.md
        │   │   └── 01-authentication.md
        │   └── 03-api-reference/
        │       ├── INDEX.md
        │       └── 01-endpoints.md
        │
        ├── bundle.zip                         <-- Complete ZIP archive of the `final/` directory
        │                                          (served instantly on /docs/ac-{id} download)
        │
        ├── logs.txt                           <-- Raw terminal transcript for plain-text viewing / curl
        │
        └── meta.json                          <-- Atomic job snapshot for quick reads without DB lookup
```

### Disk-to-R2 Synchronization Model (No-Memory Flow)
1. When a job begins, an isolated disk directory is created at `storage/jobs/ac-{id}/`.
2. As workers execute:
   - Events are appended directly to `storage/jobs/ac-{id}/.dingdong/events.jsonl` on disk.
   - Terminal logs are appended directly to `storage/jobs/ac-{id}/logs.txt`.
   - Extracted markdown files are written directly into `storage/jobs/ac-{id}/final/`.
3. When stages finish:
   - Manifests and probe traces are persisted to `.dingdong/`.
   - `bundle.zip` is compressed directly from disk into `storage/jobs/ac-{id}/bundle.zip`.
4. Artifacts are synchronized to Cloudflare R2 using multipart parallel streaming, making the bundle permanently available globally and backing up the disk.

---

## 5. Database Schema (Turso / libSQL)

The database acts as the high-speed index for the public directory and instant route lookups, completely decoupling listing queries from R2 object scans.

```sql
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,                       -- e.g. "ac-4k9z1m8x"
    input_url TEXT NOT NULL,                   -- The exact URL submitted by the user
    resolved_url TEXT,                         -- The canonical documentation root resolved
    product_name TEXT,                         -- Detected product name (e.g. "Hono", "Better Auth")
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'probing' | 'crawling' | 'packaging' | 'complete' | 'failed'
    strategy TEXT,                             -- 'direct-raw-md' | 'github-raw-markdown' | 'html-purify' | 'llms-txt'
    page_count INTEGER DEFAULT 0,              -- Number of processed pages
    error_machine TEXT,                        -- Captured machine error for terminal/debugging
    error_human TEXT,                          -- Human-friendly, casual/witty error message for UI
    
    -- Product Metadata (for /docs/ac-{id} header card)
    title TEXT,                                -- OpenGraph / Title tag
    description TEXT,                          -- Meta description
    logo_url TEXT,                             -- Favicon or logo URL
    
    -- Storage & Asset References
    r2_prefix TEXT NOT NULL,                   -- e.g. "jobs/ac-4k9z1m8x"
    zip_size_bytes INTEGER DEFAULT 0,          -- Size of bundle.zip
    
    -- Timestamps
    created_at INTEGER NOT NULL,               -- Unix epoch timestamp (ms)
    completed_at INTEGER                       -- Unix epoch timestamp (ms)
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_input_url ON jobs(input_url);
```

---

## 6. Page Lifecycle & Route Map

```text
User
 │
 ├── [1] GET /
 │      └─ Enter URL -> Submit Form
 │
 ├── [2] POST /jobs/create
 │      ├─ Generate ID: ac-{8-char-nanoid}
 │      ├─ Insert record into Turso DB (status: 'pending')
 │      ├─ Initialize local disk storage: storage/jobs/ac-{id}/
 │      └─ 303 Redirect to: /dingdong/ac-{id}
 │
 ├── [3] GET /dingdong/ac-{id}
 │      ├─ Dedicated live processing page (Foreground only, user stays here)
 │      ├─ Connects to SSE endpoint: GET /dingdong/ac-{id}/stream
 │      ├─ Reads/Appends to storage/jobs/ac-{id}/.dingdong/events.jsonl
 │      ├─ Live real-time terminal UI (ANSI color, progress indicators)
 │      ├─ On 'complete' -> UI renders "View Documentation" button -> /docs/ac-{id}
 │      └─ On 'failed' -> UI renders witty human error card + terminal toggle
 │      (Revisiting at any time streams the persisted history to date)
 │
 ├── [4] GET /docs
 │      ├─ Public directory of all generated documentations
 │      ├─ Fast query against Turso (status = 'complete', order by created_at DESC)
 │      └─ Grid/List view with search and direct links to /docs/ac-{id}
 │
 └── [5] GET /docs/ac-{id}
        ├─ If job is running ('pending' | 'probing' | 'crawling' | 'packaging'):
        │     └─ 307 Redirect back to /dingdong/ac-{id} (no background jobs!)
        ├─ If job 'failed':
        │     └─ Render recovery card with human error + link to /dingdong/ac-{id}
        └─ If job 'complete':
              ├─ Metadata card (Product name, resolved URL, logo, description)
              ├─ Navigation tree / interactive map of all markdown pages
              ├─ Direct download button for bundle.zip (via GET /docs/ac-{id}/download)
              └─ Audit link back to /dingdong/ac-{id}
```

---

## 7. Real-Time Streaming & Log Replay Protocol (`/dingdong/ac-{id}`)

The streaming system does not store events in an ephemeral in-memory emitter. It uses an **append-only disk ledger**:

```text
SSE Request: GET /dingdong/ac-{id}/stream
   │
   ├── 1. Read existing lines from: storage/jobs/ac-{id}/.dingdong/events.jsonl
   │      └─ Send each historical event to the browser immediately (Instant Replay)
   │
   └── 2. If status is NOT terminal ('complete' | 'failed'):
          └─ Stream new events to the client as they are written to disk.
```

### Event Payload Schema (`events.jsonl`)
```json
{ "type": "phase", "phase": "probe", "message": "Probing machine-readable endpoints...", "timestamp": 1772605200000 }
{ "type": "log", "level": "info", "message": "Found sitemap.xml with 86 documentation URLs", "timestamp": 1772605201200 }
{ "type": "progress", "done": 12, "total": 86, "current_url": "https://hono.dev/docs/getting-started", "timestamp": 1772605202100 }
{ "type": "error", "machine": "HTTP 403 on https://...", "human": "Cloudflare's bouncer kicked us out...", "timestamp": 1772605205000 }
{ "type": "complete", "docs_url": "/docs/ac-4k9z1m8x", "zip_url": "/docs/ac-4k9z1m8x/download", "timestamp": 1772605207500 }
```

---

## 8. Next Steps: Building the Outer Scaffold

With the outer system design and dual error handling locked:
1. **Scaffold Shared Utilities:**
   - ID Generator (`ac-{nanoid(8)}`).
   - Turso DB client & migration script with dual error columns (`error_machine`, `error_human`).
   - R2 storage client.
   - Dual-error utility (`createAppError(code, machine, human, details)`).
2. **Scaffold Route Handlers:**
   - `/` $\rightarrow$ Submit URL $\rightarrow$ redirects to `/dingdong/ac-{id}`.
   - `/dingdong/[id]` $\rightarrow$ SSE stream + live terminal + error display.
   - `/docs` $\rightarrow$ Public completed docs directory.
   - `/docs/[id]` $\rightarrow$ 307 redirect if running, showcase if complete, recovery card if failed.
