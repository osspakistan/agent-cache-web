# agent cache vs context7: local docs vs remote retrieval

**meta title:** agent cache vs context7 (2026): free offline docs vs $10/seat api
**meta description:** context7 charges $10/seat for 5,000 api calls. agent cache is free. you own the docs. works offline. here's the honest comparison.
**slug:** /compare/context7
**target keywords:** agent cache vs context7, context7 alternative, local docs for agents, context7 vs agent cache, context7 pricing

---

context7 is the big name in "docs for agents." built by upstash. 126,000+ libraries indexed. mcp server. plugged into cursor, claude code, codex, devin.

agent cache is a tool that downloads docs once and gives you a zip file. plus an mcp server that scans your local `.agentcache/` folder and serves docs to any agent. free. no tiers. no pricing. just free.

both get docs into your agent's context. one rents access. one gives you ownership. this is the honest breakdown.

## context7 retrieves snippets while your agent works

context7 is a runtime retrieval api. your agent asks context7 for docs while it works. context7 searches their index of 126,000+ libraries. returns snippets. your agent uses those snippets to write code.

updates are fast. their homepage shows supabase docs updated 13 minutes ago. react docs updated 1 day ago. prisma updated 1 hour ago. this is their main selling point: always fresh.

they have an mcp server. plug it into claude code, cursor, codex, whatever. your agent calls context7 automatically. no manual setup after initial install.

**but you don't own anything.** every call goes to their api. you rent access.

## agent cache downloads a reference you can keep

agent cache is a one-time extraction tool. paste a docs url. agent cache crawls the whole site. converts everything to clean markdown. gives you a zip file.

no api calls during your agent session. no internet needed after download. the docs live in `.agentcache/docs/<slug>/` on your disk. your agent reads them like any other file.

the mcp server (coming soon) scans your `.agentcache/` folder and surfaces docs to agents automatically. no manual file references needed.

**and it's free.** no tiers. no credits. no "per seat." no "freemium." no meter running. extracting documentation should be free. it's a public resource. you shouldn't pay rent to access docs that are already public.

## context7 meters api calls; agent cache doesn't

this is where it gets real.

context7 is freemium. they have a free tier, then they charge.

| context7 | |
|---|---|
| free tier | 1,000 calls/month + 20 daily bonus |
| pro | $10/seat/month, 5,000 calls |
| overage | $10 per 1,000 extra calls |

agent cache? free. not "freemium." not "free tier." just free. no limits, no billing, no surprise bills. extracting public documentation should not cost money. this is not a controversial take.

context7's free tier is tight. 1,000 calls sounds like a lot until your agent hits it in a week.

in january 2026 they quietly slashed the free tier by 92%. from something like 12,500 down to 500, then bumped to 1,000 after backlash. this is documented. people noticed.

then they want $10/seat/month for 5,000 calls. then $10 per 1,000 extra.

for docs. public documentation. information that is already on the internet.

i think that's wrong. docs should be free to access. the fact that someone built an indexer and put a meter on it doesn't change that.

## context7 is easier for fresh, popular libraries

i'm not here to trash them. they're better at some things.

**freshness.** context7 updates every few hours. agent cache gives you a snapshot. if you need bleeding-edge docs for a library that releases daily, context7 wins. no contest.

**index size.** 126,000+ libraries. if it's popular and open source, context7 probably has it. agent cache only has what you extract.

**zero setup for popular packages.** `npx ctx7 setup` and you're done. agent cache requires you to paste a url and wait for extraction.

**team consistency.** everyone queries the same index. same version. same snippets. no "did you extract v2 or v3?" confusion.

if you work with rapidly-changing libraries and prefer convenience over ownership, context7 is the pragmatic choice.

## local bundles work offline and include the whole site

**completeness.** context7 returns snippets. agent cache returns the entire site. i extracted stripe docs once: 8.7 mb, hundreds of pages. context7 gives you relevant snippets. agent cache gives you everything.

**offline.** once downloaded, you don't need internet. plane, coffee shop with shit wifi, doesn't matter. your docs are local.

**free.** context7 costs $10+/seat/month minimum for serious usage. agent cache is free. extracting docs should be free. the data is public. the docs are public. charging per api call to read public documentation is rent-seeking.

**ownership.** the docs are yours. in your repo. version controlled. if agent cache disappears tomorrow, your docs don't.

**determinism.** same url, same output, always. context7's index changes. their ranking changes. their api changes. agent cache gives you the same bundle every time.

**any docs site.** context7 indexes popular open source libraries. agent cache works with any docs url. internal docs. private apis. obscure frameworks. if it has a docs site, agent cache can extract it.

**mcp too.** context7 has an mcp server that calls their remote api. agent cache will have an mcp server that reads from your local disk. same convenience. different data source. you get mcp integration without the per-call fees.

## context7 calls upstash; my planned mcp reads disk

both have mcp servers. the difference is what they serve.

context7's mcp calls their api. every request goes to upstash. every request costs money. every request needs internet.

agent cache's mcp reads from your disk. the mcp server scans `.agentcache/`, reads `meta.yaml` files, and surfaces docs to your agent. zero api calls. zero internet. zero cost.

same convenience. fundamentally different architecture.

## repeated lookups use up the call allowance

context7's model seems cheap until you scale. $10/seat, 5,000 calls.

try counting how many times your agent references docs in a typical session. autocomplete. error fixes. "what's the signature for this again?" 50+ calls per session is realistic. two agents on a team, working daily? you'll burn through 5,000 before the month's half done.

then it's $10 per 1,000 extra calls. the meter keeps running.

agent cache is one extraction per docs site. ever. unless you want to re-extract for a new version.

## can you use both?

yes. actually the smartest setup is both.

use context7 for bleeding-edge libraries that update faster than you can re-extract. react, next.js, whatever changes daily.

use agent cache for stable apis your agent references constantly. stripe, supabase, hono. extract once. own forever. no meter running.

i do this. context7 for the fast-moving stuff. agent cache for the references i need every day.

## pay for freshness only where you need it

context7 is convenient and fresh. you pay for that convenience. i think that convenience is overpriced.

agent cache is free, offline, and puts you in control. with mcp coming soon, you get the same convenience without the meter.

charging for docs access is weird. the docs are already public. context7 built an indexer and a nice api and that's useful work. but putting a meter on public information? that's a business model, not a public good.

my opinion: information wants to be free. docs are information. agent cache keeps them free.

use context7 if you want to pay $10+/seat for someone else to host an index of public docs.

use agent cache if you think that's ridiculous.

my take? docs don't actually change that much. stripe's api has been stable for months. hono's core hasn't shifted. you don't need real-time updates for 90% of what your agent does. you need the docs on your disk, ready to read, without a meter running.

if you're paying $10+/seat just to query docs your agent already asked about yesterday, you're optimizing the wrong thing.

use context7 for what it's good at: fresh, popular libraries where setup speed matters.

use agent cache for everything else: stable apis, offline work, ownership, and not paying rent on documentation.

---

**related:**
- [agent cache vs firecrawl](/compare/firecrawl)
- [keeping reference docs beside your code](/blog/agentcache-dot-folder)
- [i extracted 100 docs sites. here's what broke](/blog/100-docs-sites-what-broke)
