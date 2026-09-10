# the zero-in-memory rule: why agent cache never holds state in ram

**meta title:** zero-memory architecture: how we built a crash-proof crawler
**meta description:** agent cache uses a zero-memory rule where nothing stays in ram. everything streams to disk. here's why this matters for reliability.
**slug:** /blog/zero-memory-architecture
**target keywords:** zero memory architecture, disk backed processing, append only ledger, stateless documentation extraction, disk backed state

---

most web apps hold state in memory. they load things from the database. keep them in ram. update them in ram. write back to disk "later."

if the process crashes, that state is gone. if the server restarts, it's gone. you hope it doesn't happen.

agent cache uses a different rule: **nothing meaningful stays in ram.** everything that matters streams to disk immediately.

## the zero-memory rule

rule: **if data is important, it must be reconstructable from disk.**

this means: no in-memory caches with "write to db later." no in-memory job queues. no state that vanishes on crash.

if the process dies, restart it. it reads from disk and resumes.

## how it works

every extraction job gets a directory on disk:

```
storage/jobs/ac-{id}/
├── events.jsonl      ← append-only event log
├── logs.txt          ← human-readable logs
├── final/            ← extracted docs
└── bundle.zip        ← final package
```

**events.jsonl** is the source of truth. every event is appended as a json line:

```json
{"ts":"2026-09-09T12:34:56Z","event":"page.extracted","url":"https://...","size":1234}
{"ts":"2026-09-09T12:34:57Z","event":"navigation.found","pages":42}
{"ts":"...","event":"error","type":"rate_limited","retry_after":60}
```

append-only means: events are never modified. to cancel a crawl, append a cancellation event. to mark complete, append a completion event.

## why append-only is powerful

**reliability:** if the process crashes mid-write, the existing log is still valid. no partial writes. no corrupted state.

**replayability:** any agent or human can read the log and reconstruct exactly what happened.

**no locks:** no need for transaction locks. just append.

**audit trail:** the log is a perfect record of every decision.

## sse streaming from disk

the browser sees extraction progress via sse (server-sent events).

where does the sse data come from? not memory. disk.

when a user visits `/dingdong/ac-{id}`:
1. server opens `events.jsonl`
2. replays all existing events via sse
3. keeps the file open
4. streams new events as they happen

if the user refreshes: replay again from the beginning. if the server restarts: data is still on disk.

## crash recovery

what happens when the process dies during extraction?

1. process restarts
2. reads last known state from `events.jsonl`
3. determines what was already extracted
4. resumes from where it stopped
5. new events appended to the log

no state lost. no user confusion. the extraction just continues.

## the tradeoff: disk is slower than ram

ram access: ~10 nanoseconds.
disk access (ssd): ~100 microseconds.

10000x slower.

but for this workload, it doesn't matter.

extraction is network-bound. most time is spent fetching pages, not writing to disk. the difference between ram and disk is negligible compared to network latency.

## when this doesn't make sense

zero-memory is a deliberate choice. it's not always right.

**don't use zero-memory for:**
- high-frequency trading (microseconds matter)
- real-time games (60fps can't wait for disk)
- in-memory caches that can be rebuilt (redis is fine for caching)

**do use zero-memory for:**
- long-running processes that might crash
- processes where state loss is expensive
- systems where reproducibility matters
- applications where simplicity > performance

## implementation: evlog and jsonl

we use evlog for structured logging to jsonl files.

jsonl (json lines) is the format: one json object per line. append-only. human-readable. machine-parseable.

```javascript
import { evlog } from 'evlog'

const log = evlog.for('extractor')

log.append('job.started', { url, jobId })
log.append('page.fetched', { url, size, duration })
log.append('page.converted', { url, strategy: 'direct-md' })
log.append('job.completed', { pages, totalSize })
```

each call appends to disk. no buffering.

## bottom line

the zero-memory rule sounds extreme. but it's surprisingly simple to implement. and it makes the system crash-proof.

if data matters, it goes to disk. if it's in ram, it's disposable.

this is how agent cache stays simple, reliable, and debuggable.

---

**related:**
- [agent cache architecture deep dive](/blog/architecture-deep-dive)
- [cloudflare workers killed our serverless dream](/blog/cloudflare-workers-50-subrequest-limit)
