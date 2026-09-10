# 8-12 workers: finding the sweet spot for parallel docs extraction

**meta title:** optimal concurrency for docs extraction: why 8-12 workers wins
**meta description:** i tested 1 to 50 concurrent workers for documentation extraction. 8-12 was the sweet spot. here's why more workers actually hurts.
**slug:** /blog/concurrency-sweet-spot-extraction
**target keywords:** concurrency sweet spot, parallel extraction workers, optimal concurrency crawling, worker pool documentation, 8 workers extraction

---

when crawling in parallel, more workers should mean faster extraction, right?

i tested it. concurrency from 1 to 50 workers. the results were surprising.

**8-12 workers is the sweet spot.** below 8, you're slow. above 12, you hit diminishing returns. at 50, things actually get slower.

## adding workers looks like a shortcut

naive assumption: if 1 worker takes 10 minutes, 10 workers take 1 minute. linear scaling.

reality: extraction has bottlenecks. and they aren't cpu.

## test methodology

i ran the same extraction job (a 500-page docs site) with different concurrency levels:

- 1 worker
- 4 workers
- 8 workers
- 12 workers
- 25 workers
- 50 workers

measured: total extraction time, failed requests, system resource usage.

## results

| workers | time | speedup | notes |
|---|---|---|---|
| 1 | 10:00 | 1.0x | baseline |
| 4 | 4:00 | 2.5x | good scaling |
| 8 | 2:30 | 4.0x | sweet spot start |
| 12 | 2:15 | 4.5x | sweet spot end |
| 25 | 2:05 | 4.8x | marginal gain |
| 50 | 2:30 | 4.0x | slower than 12 |

**50 workers was slower than 12 workers.** why? because of network and server-side limits.

## why more workers isn't always better

**1. server-side rate limiting**

most docs sites have implicit or explicit rate limits. nginx, cloudflare, or application-level limits kick in after a certain request rate.

at 50 concurrent requests to the same site, you're likely to hit a limit. responses slow down. some fail. retry logic adds overhead.

at 8-12, you stay under most rate limits. polite crawling gets better throughput than aggressive crawling.

**2. connection overhead**

each worker maintains http connections. at 50 workers, that's 50 tcp connections, tls handshakes, dns lookups.

established connections can be reused within a worker, but with 50 workers, the overhead of managing connections starts to matter.

**3. memory and context switching**

50 workers means 50 concurrent contexts. memory for each worker. cpu for context switching.

not enough to crash a modern server, but enough to add friction.

**4. diminishing returns on io-bound work**

docs extraction is io-bound. mostly waiting for network responses. mostly idle.

at some point, adding more workers doesn't add more throughput because the network is the bottleneck, not the cpu.

## why i default to 10 workers

8 workers crawl fast without being aggressive. 12 workers push it slightly. both keep extraction reliable.

i default to 10 workers. that covers 95% of use cases.

for small sites with known rate limits, i drop to 4-6.

for large sites with confirmed high rate limits, i might try 15-20. but that's rare.

## adaptive concurrency

i have a simple adaptive strategy:
1. start with 10 workers
2. if requests start failing with 429, reduce by 2
3. if requests succeed consistently for 20 seconds, increase by 1
4. cap at 15, floor at 4

in practice, 95% of extractions stay at 10. only aggressive rate limiters force changes.

## what about 1 worker?

single-worker extraction is _slow_. but it's the most polite. if a site is known to be sensitive, single-worker with 1-second delays between requests is the safest option.

i only use this for sites that have already shown signs of rate limiting on previous attempts.

## cloudflare-protected sites

sites behind cloudflare are the most rate-limit-sensitive. cloudflare's rate limits depend on your "threat score." data center ips score badly. browser-like requests score well.

for cloudflare sites, 6-8 workers with 500ms delays between requests usually works. above that, you trigger challenges.

## start at 10 rather than maxing out concurrency

start with 10 workers. it's fast enough for most cases. polite enough for most servers.

going above 15 is usually counterproductive. going below 8 leaves speed on the table.

parallel extraction is about finding the balance between speed and politeness. 8-12 workers hits that balance.

---

**related:**
- [agent cache architecture](/blog/architecture-deep-dive)
- [bot protection: why 12% of sites fail](/blog/bot-protection-docs-extraction)
- [100 sites extracted](/blog/100-docs-sites-what-broke)
