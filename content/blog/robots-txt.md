# do i respect robots.txt? my crawling ethics policy

**meta title:** robots.txt and crawling ethics at agent cache
**meta description:** i respect robots.txt, rate limits, and only crawl public docs. here's my full crawling ethics policy.
**slug:** /blog/robots-txt-crawling-ethics
**target keywords:** robots.txt crawling, crawling ethics, respect robots.txt, documentation crawling policy, ethical web crawling

---

agent cache crawls documentation sites. this raises ethical questions. do i respect robots.txt? what's my rate limit? do i bypass paywalls?

here's my policy. short version: i respect the site owner's wishes.

## robots.txt policy: always respect it

if a site's `robots.txt` blocks me, i don't crawl.

i look for two things:

1. **global block:** `User-agent: * Disallow: /docs/`, if this exists and covers docs paths, i don't extract.
2. **agent-specific block:** `User-agent: agent-cache Disallow: /`, if a site specifically names me, i respect it.

before crawling any site, i fetch and parse `robots.txt`.

if blocked, i show a clear message: "this site blocks crawlers via robots.txt. i respect that."

## rate limits: polite crawling

my default settings:
- **concurrency:** 8-12 workers
- **delay between requests:** 200-500ms per worker
- **burst protection:** max 20 requests/second to any single domain

this is below the threshold that triggers most rate limits. it's also polite.

if i get a `429 too many requests`, i:
1. immediately pause requests to that domain
2. wait the `retry-after` duration from headers, or 60 seconds
3. resume with reduced concurrency (halved)
4. if blocked again, mark as failed and move on

## what i never crawl

- **paywalled content:** if it requires payment, i don't attempt extraction.
- **authenticated content:** if it requires login, i don't attempt extraction.
- **private/internal documentation:** i only crawl public urls.
- **behind captchas:** if a captcha appears, i stop and mark as failed.
- **personal data:** i don't extract sites containing user data.

## user-agent identification

my user-agent identifies me:

```
agent-cache/0.1 (+https://agentcache.run/bot; contact@agentcache.run)
```

transparent. reachable. not pretending to be a browser.

## how to block agent cache

if you're a site owner and want to block me:

### option 1: robots.txt
```
User-agent: agent-cache
Disallow: /
```

### option 2: contact me
email `contact@agentcache.run` with your domain. i'll add you to my blocklist.

### option 3: rate limit
any rate limit under 10 requests/second effectively blocks me. i won't fight it.

## public access doesn't mean permission to ignore the owner

i only extract publicly accessible documentation.

this is my hard rule. no authenticated content. no paywalls. no user data.

if it's public and meant to be read, i'll extract it. if the owner asks me to stop, i stop.

## why this matters to me

crawling is a privilege, not a right. i rely on docs sites being accessible. that means respecting the people who maintain them.

my approach: polite, transparent, and reversible.

most sites don't block me. most are fine with extraction. but for those that aren't, i respect boundaries.

## i'll stop crawling if you ask

- i respect robots.txt
- i crawl politely
- i only extract public docs
- i stop when asked

if you maintain a docs site and have questions or concerns, email me.

---

**related:**
- [bot protection: 12% of sites that fail](/blog/bot-protection-docs-extraction)
