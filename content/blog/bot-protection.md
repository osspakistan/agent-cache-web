# bot protection is the last mile problem for docs extraction

**meta title:** bot protection: why 12% of docs sites fail to extract
**meta description:** 12% of documentation sites block extraction because of cloudflare, captchas, and wafs. here's how bot protection blocks crawlers and what we do about it.
**slug:** /blog/bot-protection-docs-extraction
**target keywords:** bot protection documentation, cloudflare docs extraction, crawl blocked documentation, docs extraction failure, 403 docs crawl

---

you'd think documentation — meant to be read — would be easy to access. but 12% of the sites we tried to extract were blocked by bot protection.

cloudflare challenges. captchas. rate limits. wafs. they treat documentation crawlers like threats.

this is the last mile problem of docs extraction: the content is public, but you can't programmatically fetch it.

## the paradox: public docs, blocked access

documentation is public information. it's meant to be read. but modern web infrastructure treats non-browser requests as suspicious.

if your user-agent says "curl" or "node-fetch" or doesn't match a known browser, cloudflare issues a challenge. solve the javascript challenge, or no access.

this is reasonable for e-commerce. reasonable for news sites. but for documentation? it's a barrier to legitimate use.

## how bot protection works (simplified)

bot protection has layers:

**layer 1: ip reputation.** known data center ips get flagged. aws, digitalocean, linode ranges are often blocked by default.

**layer 2: request fingerprint.** user-agent string, headers, tls fingerprint. curl and node-fetch leave obvious fingerprints.

**layer 3: javascript challenge.** the server returns an html page with javascript. the script must execute and solve a math problem or set a cookie. non-browsers can't do this.

**layer 4: behavioral analysis.** number of requests per second. patterns. humans don't fetch 100 pages in 30 seconds. scripts do.

**layer 5: captcha.** image or puzzle challenge. 

## cloudflare: the biggest blocker

cloudflare is used by ~40% of docs sites. their "browser integrity check" challenges non-browser requests.

symptoms: 403 forbidden with cloudflare headers. or a 503 with a challenge page. or a redirect to a captcha.

some cloudflare configs are aggressive. some are relaxed. there's no way to know without trying.

## rate limiting: 429 too many requests

even sites without full bot protection have rate limits. too many requests too fast = temporary block.

our approach: polite crawling. 8-12 workers. random delays between 200-500ms. user-agent string that identifies us honestly.

we're not trying to ddos anyone. we're trying to download documentation.

## the problem with documentation sites specifically

why do docs sites need bot protection?

- **scrapers:** competitors scraping pricing, features, content
- **ai training data:** companies scraping docs to build training datasets
- **bandwidth:** large crawlers consuming significant bandwidth
- **default settings:** cloudflare's default includes bot protection. many sites never disable it

most docs sites don't intentionally block crawlers. they just never disabled the default settings.

## our approach: polite crawling first

1. **identify ourselves honestly.** user-agent includes "agent-cache" and a contact url.
2. **rate limit。** 8-12 concurrent requests max. delays between requests.
3. **respect robots.txt.** if a site blocks us there, we don't crawl.
4. **no headless browsers.** we don't use selenium/puppeteer. they're slow and resource-intensive. if a site requires javascript execution, we mark it as blocked.
5. **retry with backoff.** transient errors get retries with exponential backoff.

## when polite crawling fails

if cloudflare issues a challenge and our crawler can't solve it, we have options:

**option 1: accept the failure.** 12% of sites won't extract. we log the failure and move on. this is our default.

**option 2: use a headless browser.** we don't do this currently. but it's technically possible. tradeoffs: 10x slower, 10x more expensive, 10x more complex.

**option 3: use a paid extraction service.** firecrawl and similar services have infrastructure (residential proxies, browser farms) that can bypass challenges. tier 6 of our acquisition ladder. we don't use it often.

## what we don't do

- we don't use residential proxy networks
- we don't fake browser fingerprints
- we don't solve captchas
- we don't bypass authentication
- we don't crawl behind paywalls

if a site actively doesn't want to be crawled, we respect that.

## the future: llms.txt as the solution

bot protection exists because scraping is adversarial. but if sites expose `llms.txt`, there's no need to scrape. one request. one text file. no crawling. no bot protection triggers.

this is why llms.txt matters. it changes the dynamic from "crawler vs. protector" to "friendly request for agreed-upon content."

llms.txt adoption is growing. mintlify and fumadocs support it natively. when it's widespread, bot protection ceases to be a docs extraction problem.

## bottom line

bot protection is the biggest unsolved problem in docs extraction. not parsing html. not handling custom frameworks. just getting a basic http response.

we handle it by being polite, respecting robots.txt, and accepting that 12% of sites won't work.

use llms.txt if you're a docs site maintainer. it's the clean fix for everyone.

---

**related:**
- [100 sites extracted: what broke](/blog/100-docs-sites-what-broke)
- [our robots.txt policy](/blog/robots-txt-crawling-ethics)
- [llms.txt: the standard we need](/blog/llms-txt-adoption-2026)
