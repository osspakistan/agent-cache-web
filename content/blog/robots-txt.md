# do we respect robots.txt? our crawling ethics policy

**meta title:** robots.txt and crawling ethics at agent cache
**meta description:** we respect robots.txt, rate limits, and only crawl public docs. here's our full crawling ethics policy.
**slug:** /blog/robots-txt-crawling-ethics
**target keywords:** robots.txt crawling, crawling ethics, respect robots.txt, documentation crawling policy, ethical web crawling

---

agent cache crawls documentation sites. this raises ethical questions. do we respect robots.txt? what's our rate limit? do we bypass paywalls?

here's our policy. short version: we respect the site owner's wishes.

## robots.txt policy: always respect it

if a site's `robots.txt` blocks us, we don't crawl.

we look for two things:

1. **global block:** `User-agent: * Disallow: /docs/` — if this exists and covers docs paths, we don't extract.
2. **agent-specific block:** `User-agent: agent-cache Disallow: /` — if a site specifically names us, we respect it.

before crawling any site, we fetch and parse `robots.txt`.

if blocked, we show a clear message: "this site blocks crawlers via robots.txt. we respect that."

## rate limits: polite crawling

our default settings:
- **concurrency:** 8-12 workers
- **delay between requests:** 200-500ms per worker
- **burst protection:** max 20 requests/second to any single domain

this is below the threshold that triggers most rate limits. it's also polite.

if we get a `429 too many requests`, we:
1. immediately pause requests to that domain
2. wait the `retry-after` duration from headers, or 60 seconds
3. resume with reduced concurrency (halved)
4. if blocked again, mark as failed and move on

## what we never crawl

- **paywalled content:** if it requires payment, we don't attempt extraction.
- **authenticated content:** if it requires login, we don't attempt extraction.
- **private/internal documentation:** we only crawl public urls.
- **behind captchas:** if a captcha appears, we stop and mark as failed.
- **personal data:** we don't extract sites containing user data.

## user-agent identification

our user-agent identifies us:

```
agent-cache/0.1 (+https://agentcache.run/bot; contact@agentcache.run)
```

transparent. reachable. not pretending to be a browser.

## how to block agent cache

if you're a site owner and want to block us:

### option 1: robots.txt
```
User-agent: agent-cache
Disallow: /
```

### option 2: contact us
email `contact@agentcache.run` with your domain. we'll add you to our blocklist.

### option 3: rate limit
any rate limit under 10 requests/second effectively blocks us. we won't fight it.

## the line: public docs only

we only extract publicly accessible documentation.

this is our hard rule. no authenticated content. no paywalls. no user data.

if it's public and meant to be read, we'll extract it. if the owner asks us to stop, we stop.

## why this matters to us

crawling is a privilege, not a right. we rely on docs sites being accessible. that means respecting the people who maintain them.

our approach: polite, transparent, and reversible.

most sites don't block us. most are fine with extraction. but for those that aren't, we respect boundaries.

## bottom line

- we respect robots.txt
- we crawl politely
- we only extract public docs
- we stop when asked

if you maintain a docs site and have questions or concerns, email us.

---

**related:**
- [bot protection: 12% of sites that fail](/blog/bot-protection-docs-extraction)
