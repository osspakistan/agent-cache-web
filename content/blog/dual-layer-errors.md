# building a dual-layer error system: machine errors vs human errors

**meta title:** dual-layer error system: how i handle errors at agent cache
**meta description:** agent cache uses two error layers: machine errors for logs and human errors for users. here's why and how it makes debugging easier.
**slug:** /blog/dual-layer-error-system
**target keywords:** dual layer error handling, machine error human error, error handling pattern, witty error messages, developer experience errors

---

most apps have one error message. that message is either too technical for users or too vague for developers. it fails both audiences.

agent cache has two layers. every error gets split:
- **machine error:** technical, exhaustive, for logs
- **human error:** plain, actionable, for users

## vague for developers, cryptic for users

before dual-layer errors, my approach was like everyone else's:

```
error: "failed to extract documentation"
```

this tells the user nothing. what failed? why? what should they do?

or:

```
error: "502 bad gateway on cloudflare-proxied endpoint, ray id: ..."
```

great for debugging. useless for a user reading the status page.

## layer 1: machine errors

machine errors are for logs, monitoring, and debugging. verbose. technical. every detail.

example:
```json
{
  "error_machine": {
    "type": "bot_protection_challenge",
    "http_status": 403,
    "cloudflare_ray_id": "...",
    "cf_chl_jschl_tk": "...",
    "user_agent": "...",
    "request_url": "https://docs.example.com/api/reference",
    "timestamp": "2026-09-09T12:34:56Z",
    "attempt_count": 3,
    "backoff_strategy": "exponential",
    "last_headers": { ... }
  }
}
```

this goes to:
- stdout logs
- event ledger (`events.jsonl`)
- error tracking (if i had it)

it's for developers and operators. not for end users.

## layer 2: human errors

human errors are for users. plain language. actionable. sometimes funny.

example:
```
cloudflare blocked me. tried 3 times with polite delays. still got challenged.
this happens when docs sites have aggressive bot protection.
suggestions:
- if you own this site, consider whitelisting my crawler
- if not, i can't extract this site right now
- try again later, some sites loosen restrictions during off-peak
```

this goes to:
- the status page
- sse stream (what the user sees)
- logs (as a summary)

## what i never say

- "something went wrong", meaningless
- "an unexpected error occurred", expected by whom?
- "please try again later", why? what changed?
- "contact support", no. tell them what to do.

## what makes a good human error

1. **say what happened.** "cloudflare issued a javascript challenge" > "an error occurred"
2. **say why it matters.** "i can't extract sites behind captchas" > "extraction failed"
3. **give actionable next steps.** "try again in 1 hour" or "this site uses bot protection, so extraction isn't possible"
4. **be honest.** don't blame the user. don't pretend everything is fine.

## bad vs good examples

**bad:** "extraction failed due to network error"
**good:** "docs.example.com returned a 403 with cloudflare challenge page. this site uses bot protection that blocks automated access. i can't extract it right now."

**bad:** "rate limit exceeded"
**good:** "hit the rate limit for this site after 12 requests. some docs providers throttle crawlers. waiting 60 seconds before retry."

**bad:** "failed to parse html"
**good:** "encountered unexpected html structure. this might be a single-page app (spa) or custom framework. tried framework detection but no known pattern matched."

## detailed logs and fewer support questions

dual-layer errors make debugging trivial. when something breaks, i open the event log. every machine error is there. every detail.

for users, they see a clear explanation. no "something went wrong." they know exactly what happened and why.

support burden: minimal. most users understand from the human error message.

## implementation

errors are generated at the point of failure. the same exception produces both layers:

```
try {
  crawlPage(url)
} catch (e) {
  machine_error = e.to_machine_format()
  human_error = e.to_human_format()
  write_to_log(machine_error)
  stream_to_user(human_error)
}
```

each error type knows how to format itself for both audiences.

## log the details, show users what they can do

one error message can't serve both audiences. don't try.

split the error. machine gets everything. humans get clarity.

both win.

---

**related:**
- [agent cache architecture](/blog/architecture-deep-dive)
- [100 sites extracted: what broke](/blog/100-docs-sites-what-broke)
