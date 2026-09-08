# Agent Cache Web

Documentation caching engine. Paste any docs URL, get a ZIP of clean markdown your AI agents can read. Built with Hono + htmx, runs on Bun.

## Build & Test

• Install dependencies: `bun install`
• Start development server: `bun run dev`
• Production start: `bun run start`
• Lint: `bun run lint`
• Auto-fix lint: `bun run lint:fix`
• Type check: `bun run typecheck`
• Full check: `bun run check`

## Project Layout

├─ src/
│  ├─ app/           → Hono routes (file-based routing)
│  │  ├─ _sections/  → Landing page sections (hero, demo, batteries, etc.)
│  │  ├─ api/        → REST API routes
│  │  ├─ dingdong/   → Job status + SSE streaming pages
│  │  ├─ docs/        → Completed jobs listing + download
│  │  └─ jobs/        → Job creation form handler
│  ├─ features/
│  │  ├─ engine/      → Crawling pipeline (resolver, ladder, topology, crawler, packager)
│  │  └─ jobs/        → Job CRUD + DB operations
│  ├─ lib/
│  │  ├─ url-rules/   → URL validation rules engine
│  │  ├─ utils/       → Helpers (parking, errors, types)
│  │  └─ clients/     → R2, Turso singletons
│  └─ components/     → Shared JSX components (nav, footer, pill-form)
├─ public/           → Static assets (CSS, JS, fonts)
├─ .wtf/             → Planning docs, references, experiments
└─ docs/             → Project documentation

## Architecture Overview

File-based routing with Hono. Each `page.tsx` or `*.route.ts` file becomes a route. JSX server-side rendering with htmx for interactivity. No SPA framework.

**Job flow:**
1. User submits URL via pill form → `POST /jobs/create`
2. URL validated by rules engine (`src/lib/url-rules/`)
3. Job record created in Turso DB
4. Engine runs in background: resolve → ladder → topology → crawl → package
5. ZIP uploaded to R2
6. User redirected to `/dingdong/{id}` for live progress
7. Completed jobs appear at `/docs`

**Engine pipeline (5 phases):**
1. Resolver: normalize URL, find canonical docs endpoint
2. Ladder: determine acquisition strategy (llms.txt → raw .md → HTML → sitemap → crawler)
3. Topology: map site navigation (framework extractors + DOM parsing)
4. Crawler: fetch pages, extract markdown (concurrent workers)
5. Packager: bundle into ZIP with indexes + meta.yaml

**URL validation rules engine:**
- Rules defined in `src/lib/url-rules/rules.ts`
- Checks: DNS, HTTP reachability, parking detection, live content
- State tracked across all checks
- First error stops the pipeline

## Development Patterns & Constraints

Coding style
• TypeScript strict mode
• Biome for formatting (single quotes, no semicolons, trailing commas)
• Functional components, no classes
• JSX with Hono's `raw()` for HTML injection
• htmx attributes for AJAX (hx-post, hx-get, hx-swap, hx-trigger)

File organization
• Routes: file-based, one file per route
• Features: isolated modules, no cross-feature imports
• Shared code: `src/lib/` only
• Components: `src/components/` for reusable UI

Error handling
• Rules engine returns structured errors with codes + human messages
• Job failures stored in DB, displayed in UI
• Sarcastic error copy for user-facing failures

Async patterns
• All I/O is async/await
• Background jobs via `startJobEngine()` (fire-and-forget)
• SSE for real-time progress streaming

## Security

• No authentication (public tool)
• Input validation via URL rules engine
• No user data stored (only job metadata)
• R2 for storage (not local filesystem in production)

## External Services

• Turso (libsql) - `TURSO_DATABASE_URL` - Job metadata storage
• Cloudflare R2 - `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` - ZIP storage
• OpenRouter (optional) - `OPENROUTER_API_KEY` - LLM metadata extraction

## Gotchas

• `detectParkedDomain` is legacy — use `validateUrl` from `src/lib/url-rules/` instead
• Job IDs are `{hostname}-{4-hex}` format
• `isWithinScope` normalizes www. — never use `startsWith()` for host comparison
• htmx form submissions need `HX-Request` header check for AJAX redirects
• Dev hot reload uses WebSocket on port 10902
• R2_PUBLIC_URL must be set for download links to work
