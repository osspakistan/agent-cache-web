# Agent Cache Web — Architecture

Status: **planned, not yet implemented.** v1 (web MVP) technical map.
Feature scope lives in `.wtf/01.idea/features/web/` (f01–f04); this file is the how.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Server | **Hono** (TypeScript, `@hono/node-server`) | light, portable to Workers later |
| Frontend | **htmx** (server-rendered HTML) | no SPA framework, no client build |
| Rendering | **Hono JSX** | typed SSR components, no template engine |
| Routing | **file-based (`src/app/`)**, custom ~50-line scanner | Next App Router simplicity, zero registration |
| Storage | **filesystem** — bundles as immutable artifacts | no DB for v1 |
| Fetching | built-in `fetch` (curl-level deps only) | cost rule: zero paid services |

## Design principles

1. **Filesystem is the database.** Everything is files under `storage/jobs/<id>/`.
   Atomic writes, resumable by construction.
2. **The page is the unit of work, not the phase.** Discovery → manifest once; then every
   page flows fetch → extract → write independently, bounded concurrency.
3. **Server and worker are separate processes.** The Hono server never runs a crawl.
   Server reads job state files; the detached worker writes them. Server restart never
   kills a job. (Internal plumbing — NOT a user-facing CLI.)
4. **Failures are results, not exceptions.** Any terminal state renders as a page.
5. **Zero cost-bearing calls.** Plain HTTP fetches only. No LLM, no paid APIs in v1.
6. **SSR-first.** Every URL renders a complete HTML page. htmx enhances; it is never required.

## Process model

```text
┌──────────── Hono server (always on) ────────────┐
│ serves pages/fragments/routes (see routing)     │
│ POST /jobs → create job dir → spawn worker      │
│ polls nothing — htmx polls status fragments     │
└──────────────┬──────────────────────────────────┘
               │ spawn (detached child, same binary, internal arg)
               ▼
┌──────────── worker (one per job) ───────────────┐
│ 1. discover   sitemap.xml else link-follow      │
│               → manifest.json (cap applied HERE)│
│ 2. run        bounded pool (N=8):               │
│               fetch → extract → pages/xx.md     │
│ 3. package    assemble bundle/ + bundle.zip     │
└─────────────────────────────────────────────────┘
```

Single writer per file: server writes `job.json` once, then the worker owns the job dir.
Server is a pure reader of `progress.json`.

## Job directory (the only shared state)

```text
storage/jobs/<job-id>/
├── job.json         ← written ONCE by server: { url, created_at, settings }
├── manifest.json    ← written ONCE by worker: { pages[], truncated? }
├── pages/           ← one file per page, atomic (tmp+rename)
│    └── <index>.md  ← frontmatter { url, title } + markdown body
├── progress.json    ← written ONLY by worker, atomically: { state, total, done, failed, error? }
├── bundle/          ← immutable after complete
└── bundle.zip
```

Terminal states: `complete | failed`. Non-terminal: `discovering | running | packaging`.

## Routing — file-based (`src/app/`)

The folder tree IS the routing table. A scanner at boot walks `src/app/` and registers
routes on Hono. Delete a file → route gone. No registration code anywhere.

### The 4 magic file names

| File | URL | Methods | Layout |
|---|---|---|---|
| `page.ts` | segment path | `GET` only | yes (nearest `layout.ts`) |
| `*.fragment.ts` | segment path + filename prefix | `GET` and/or `POST` | never |
| `route.ts` / `*.route.ts` | segment path + prefix | any method | never |
| `layout.ts` | — (wrapper) | — | — |

Every handler file exports **named HTTP-method functions** (`export const GET`,
`export const POST`) — no default exports. One file = one URL. Handlers read params via
`c.req.param("id")`, queries via `c.req.query()`. Static segment beats `[dynamic]` sibling.

### Reference application (products / directory-style)

What the convention looks like when a real product lives in it:

```text
app/
├── layout.ts                     ← root <html> shell (required, exactly one)
├── page.ts                       GET  /
├── not-found.ts                  ← 404 component (full page)
├── error.ts                      ← 500 component (page + fragment mode)
├── health.route.ts               GET  /health          JSON
│
├── products/                     ← ONE folder = ONE resource = its whole story
│   ├── layout.ts                 ← wraps everything below (sub-nav)
│   ├── page.ts                   GET  /products
│   ├── route.ts                  GET+POST /products    ← JSON; POST = the write path
│   ├── _sections/                ← page-private (scanner ignores `_`)
│   │   ├── filters.ts
│   │   └── sort-bar.ts
│   ├── _lib/parsing.ts           ← HTTP-shaped helpers shared by this subtree's routes
│   ├── grid.fragment.ts          GET  /products/grid?cat=…   htmx swap
│   ├── search/route.ts           GET  /products/search       JSON
│   └── [id]/
│       ├── page.ts               GET  /products/:id
│       ├── route.ts              GET+PATCH+DELETE /products/:id
│       ├── publish/route.ts      POST /products/:id/publish
│       └── reviews/
│           └── route.ts          GET+POST /products/:id/reviews
│
├── cart/
│   ├── page.ts                   GET  /cart
│   ├── add.fragment.ts           POST /cart/add        ← badge fragment / 303 no-JS
│   └── _lib/totals.ts
│
├── orders/[id]/
│   ├── page.ts                   GET  /orders/:id
│   └── status.fragment.ts        GET  /orders/:id/status   ← htmx poll
│
└── account/
    ├── login.fragment.ts         POST /account/login   ← inline errors via htmx
    └── settings/page.ts          GET  /account/settings
```

### Corner cases — settled rules

1. **More endpoints** → more files/folders in the resource folder. One file per URL, always.
   Location of the Nth endpoint is guessable from the 1st.
2. **Route files never grow.** Ceiling: validate → call module → serialize, ~10 lines per
   method. Feature logic drains down into the module (which may be many files).
   The route file is a door, not a room.
3. **No `app/api/` zone.** JSON routes live in their resource folder. A truly global
   utility (health, webhook) is a root-level file, not a zone. This is a monolith —
   a separate "backend folder" would be the smell.
4. **Multiple fragments per segment**: filename prefix = sub-path
   (`plans.fragment.ts` + `compare.fragment.ts` → two URLs).
5. **Fragment with POST**: same file, `export const POST`. Handler branches on
   `c.req.header("HX-Request")`: htmx → fragment, no-JS → `303 redirect`. One handler,
   both worlds.
6. **Params**: `[id]` = single param, `[...slug]` = catch-all. Handed via `c.req.param()`.
7. **Nested layouts**: nearest ancestor `layout.ts` wraps a page. Fragments never get any
   layout. Root layout is required and unique (no route groups).
8. **404**: `app/not-found.ts`. **500**: `app/error.ts` — scanner wraps every handler;
   pages render it with layout, fragments render it bare (inline swap).
9. **Loading states: no convention — deliberately.** htmx owns it via `hx-indicator` + CSS.
10. **Private colocation**: `_`-prefixed files/folders are invisible to the scanner.
    Page-specific components in `_sections/`, HTTP-shared helpers in `_lib/`.
11. **Scanner conflicts = boot failure.** `page.ts` + `route.ts` claiming the same URL →
    throw at startup with the exact path. Fail fast, never ambiguous.
12. **Static files** live in `public/`, served via `serve-static` at `/*`. Never in `app/`.
13. **Not supported (add only when pain is real):** route groups, parallel routes,
    intercepting routes, per-segment middleware files, multiple root layouts.

## Views — components, pages, fragments

| Term | What it is | Lives in |
|---|---|---|
| **Component** | reusable JSX function | `src/components/` |
| **Page** | full HTML response = components + layout, has a URL | next to its route or `app/**/_sections/` |
| **Fragment** | partial HTML response = components, NO layout, htmx-only | `*.fragment.ts` next to its route |

- One set of components, two ways to serve: `pages/job.ts` wraps `<ProgressBar>` in layout;
  `status.fragment.ts` returns it bare for the poll swap.
- **Placement question for any piece of UI: "who else uses this?"**
  One page only → `_sections/` next to that page. Two or more → `src/components/`.
  Borderline → keep it in `_sections/`; promoting later is trivial.
- A fragment must never be a navigation target; a page never rendered without layout.

## Modules — the modular monolith

All logic lives in modules. `app/` files are adapters; they contain no logic, ever.

```text
src/
├── index.ts                 ← boot: scan app/ → register routes; spawn workers
├── app/                     ← file-based routes + colocated views (see above)
├── components/              ← shared JSX components
├── modules/                 ← THE monolith: bounded contexts, all business logic
│   ├── jobs/                ← job lifecycle & storage (owns storage/jobs/)
│   │   ├── index.ts         ← public API: create(), getStatus(), list()
│   │   ├── store.ts         ← job.json / progress.json / atomic writes
│   │   └── types.ts
│   ├── pipeline/            ← orchestration ONLY: discover → pool → package
│   │   └── index.ts         ← worker calls this; owns nothing itself
│   ├── discovery/           ← sitemap / link-follow → manifest
│   ├── fetching/            ← concurrency pool, per-page fetch (.md first, retry)
│   ├── extraction/          ← html → markdown (sanitize, convert) — deterministic
│   └── packaging/           ← bundle tree, meta.yaml, _map.json, zip
└── shared/                  ← kernel: http wrapper, atomic fs, config, types
```

### Dependency rules (one-way, enforced by convention now, lint later)

```text
app/ ──► modules ──► shared
 ▲__________│            ▲
 └── components          │
worker ──► (jobs, pipeline) ──► shared
```

- **`app/` talks to `modules/` only** — never to `shared` directly, never module-to-module.
- **`server` routes know only `jobs`** (create/status). They never import crawling modules.
- **`pipeline` is the only composer of capability modules** and owns no logic itself.
- **`shared` imports nothing.**
- Each module's `index.ts` is its only public surface.

Growth direction: new feature → new module (or files inside one). Route files stay thin;
modules absorb complexity. When the future CLI (f06) arrives, it is a third thin entry
importing the same `modules/` — zero refactor.

## Data access & APIs

Two data paths. Default is the first.

1. **In-process (default):** handlers call module functions directly. No JSON API is created,
   none is fetched. The browser never calls an API to render a page.
2. **JSON endpoint** (`route.ts`): only when something *outside* the page needs the data
   (future CLI, third parties). Thin serializer over the same module function.

htmx interactions are **not** JSON APIs — they are fragment endpoints returning HTML
(`hx-get="/products/grid?..."` → HTML swap).

Hard rules:
- **Never call your own HTTP API from SSR code.** Page and JSON route are siblings over
  the module.
- **Never render pages from browser-side JSON fetches.** If htmx needs data, it gets HTML.

## Concurrency & limits (free tier)

- Max 8 concurrent page fetches per job; polite timeout (10s); single retry on 429/timeout.
- Page cap at discovery (~500, manifest flagged `truncated`).
- Each worker is a separate process — OS handles isolation. Revisit limits when there's a reason.

## Runtime

**Bun** (decided at scaffold): runs TS/TSX natively — no build step, no tsx dep. Serving via
`hono/bun` (serveStatic + `export default { port, fetch }`). Node remains portable if ever
needed: swap to `@hono/node-server`; nothing else changes (fetch + fs + import only).
Dev loop: `bun run --hot src/index.tsx`. Production: `bun run src/index.tsx`.

## Observability

**evlog** (`src/shared/logger.ts`, wired via `evlog()` middleware in `src/index.tsx`):
one wide event per request with requestId, timing, status, custom fields via `log.set()`.
`app.onError` logs through the request-scoped logger when present. Reference docs:
`.agentcache/docs/evlogs/`.

## Open questions

- [ ] Failure policy: strict (current f02: any fetch failure stops the job) vs tolerant
      page-level (failed pages counted + listed, partial bundle completes) — tolerant recommended
- [x] ~~Node vs Bun~~ → **Bun** (no build step; Node portability preserved via Hono adapters)
- [ ] Job retention/cleanup for `storage/jobs/` (suggestion: lazy sweep on server start —
      non-complete jobs > 7 days, complete > 30 days)
