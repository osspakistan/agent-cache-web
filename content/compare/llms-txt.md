# agent cache vs llms.txt: not a competition

**meta title:** agent cache vs llms.txt: product vs standard
**meta description:** llms.txt is a proposed standard. agent cache is a tool that works with or without it. here's how they relate.
**slug:** /vs-llms-txt
**target keywords:** agent cache vs llms.txt, llms.txt alternative, llms.txt standard, docs for agents

---

llms.txt is a proposed standard. a text file that sits at the root of a docs site and tells ai agents what documentation is available.

agent cache is a tool that extracts documentation sites into clean markdown.

these aren't competitors. they're not even in the same category. but people search "llms.txt alternative" and "agent cache vs llms.txt" so here we are. this article explains the relationship.

## what llms.txt actually is

llms.txt is a simple standard. a text file in the root of a domain containing a structured list of documentation resources. here's the rough idea:

```
# my-library docs

## getting started
- /docs/introduction
- /docs/installation
- /docs/quickstart

## api reference
- /docs/api/authentication
- /docs/api/endpoints
- /docs/api/errors
```

clean. simple. human and machine readable.

if a docs site has `llms.txt`, an agent can read it, understand the structure, and request relevant documentation. no crawling needed. no guessing.

**but here's the thing: almost nobody has it.**

## what agent cache actually does

agent cache doesn't need llms.txt to work. it crawls the site regardless.

but when llms.txt exists, agent cache checks it **first**. it's tier 1 of the acquisition ladder. 1 request, instant download, perfect structure, zero cost.

agent cache:
1. checks `/llms.txt` or `/llms-full.txt` first
2. if found, downloads the listed docs directly
3. if not found, falls back to other methods (github, direct .md, html, etc.)

**llms.txt makes agent cache faster.** when it exists, agent cache skips crawling entirely. the tier 1 fallback is instant.

## adoption reality

llms.txt is a great idea. adoption is low.

i've extracted 100+ documentation sites. less than 10% had llms.txt. most don't even know it exists.

so agent cache is built for the 90% of sites that don't have llms.txt. but it benefits from the 10% that do.

## llms.txt doesn't replace agent cache

even if every site had llms.txt, you'd still need agent cache for:

**format conversion.** llms.txt lists urls. those urls still return html (usually). agent cache converts them to clean markdown. strips navigation, banners, cookie notices.

**structure.** llms.txt gives you a flat list. agent cache creates the folder hierarchy, `meta.yaml`, `_map.json`, `INDEX.md`. organization matters for agents.

**offline access.** llms.txt points to live urls. agent cache downloads the content. gives you a zip you can use offline.

**completion.** some sites have incomplete llms.txt files. agent cache crawls the whole site regardless. catches what the llms.txt misses.

## agent cache doesn't replace llms.txt

if every site adopted llms.txt, agent cache would be much faster and cheaper. tier 1 would handle most extractions. the 88% success rate would climb higher.

**agent cache is a backfill for a world that doesn't have llms.txt yet.** but it's more than that. it also handles the conversion, cleaning, and structuring that llms.txt alone doesn't solve.

## the llms-full.txt thing

some sites have `llms-full.txt` which contains the entire docs in one file. mintlify supports this. when it exists, agent cache downloads it in one request. instant, complete, and structured.

this is the ideal scenario. a single text file with everything. no crawling needed.

but again, adoption is low. agent cache handles both cases: when the standard exists and when it doesn't.

## the bottom line

llms.txt is a standard that makes agent cache faster when it exists.

agent cache is a tool that handles docs extraction whether or not llms.txt exists.

they're complementary. if llms.txt adoption grows, agent cache benefits. if it doesn't, agent cache still works. 

use agent cache regardless. if a site has llms.txt, agent cache just gets it faster. if it doesn't, agent cache figures it out anyway.

if you're a docs site maintainer: add `llms.txt`. it helps tools like agent cache. it helps your users. it's low effort, high value.

---

**related:**
- [agent cache vs context7](/vs/context7)
- [the acquisition ladder](/blog/acquisition-ladder)
