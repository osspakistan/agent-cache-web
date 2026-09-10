# github tree api: the fastest docs extraction you've never heard of

**meta title:** extract docs from github in 30 seconds with the git tree api
**meta description:** if a docs site is open-source on github, you can extract the entire docs tree in 30 seconds using the git tree api. no scraping needed. here's how.
**slug:** /blog/github-tree-fast-extraction
**target keywords:** github tree api documentation, github raw markdown extraction, fast docs extraction github, github cdn documentation, open source docs extraction

---

our fastest extraction ever: 3,848 files in 87 seconds. zero html parsing. zero jsdom. zero bot protection worries.

the secret? the github tree api.

## the problem with traditional crawling

traditional crawler approach:
1. fetch the docs homepage
2. parse html to find links
3. follow each link
4. extract content from html
5. repeat for every page

for a site with 1,000 pages: 1,000+ http requests. 1,000 html parses. 1,000 content extractions. takes 5-10 minutes.

what if the docs are already structured markdown files in a git repo? what if you could just download them directly?

## the github tree api

the github api exposes a "tree" endpoint that lists all files in a directory recursively.

```
GET /repos/:owner/:repo/git/trees/:branch?recursive=1
```

response: a flat list of every file and folder in the repo, with their paths, types, and blob hashes.

from this list, we filter for documentation files:
- `.md` files in a `docs/` directory
- `.mdx` files in the same
- `README.md` at root (usually includes getting started)
- any `.md` files matching known doc patterns

## github raw cdn: no api rate limits

once we know the file paths, we download them via the github raw cdn:

```
https://raw.githubusercontent.com/:owner/:repo/:branch/:path
```

this is the key advantage: **raw cdn downloads don't count against github api rate limits.** you have 60 requests/hour for unauthenticated api calls. but raw cdn has generous limits (thousands per hour).

for open-source repos, this means you can download an entire docs tree without authentication.

## the full flow

1. **discover the repo:** check if the docs site links to a github repo in footer, header, or about page
2. **find the docs directory:** common names: `docs/`, `docs/`, `website/docs/`, `packages/docs/`, `src/content/docs/`
3. **get the tree:** one api call returns all files recursively
4. **filter docs files:** `.md` and `.mdx` in the docs directory
5. **download via raw cdn:** parallel requests, 8-12 workers
6. **reconstruct hierarchy:** use file paths from the tree to build the same folder structure

## real results

| site | files | time | strategy |
|---|---|---|---|
| nango | 3,848 | 87s | github tree |
| posthog | 1,915 | 40s | github tree |
| clerk | 1,124 | 28s | github tree |
| zeabur | 1,066 | 21s | github tree |

compare to html extraction for the same sizes: 3-10 minutes. github tree: under 2 minutes.

## limitations

**only works for open-source projects.** if the repo is private, you need authentication.

**docs structure may differ from site.** some projects keep docs in `/docs/` but the website is in `/website/`. some use a separate `docs` repo. some keep docs with the main code.

**not all files are user-facing docs.** `contributing.md`, `license.md`, `changelog.md` — these might be in the repo but aren't part of the user docs. we filter them out.

**some docs are in a separate repo.** the main code is in `company/product` but docs are in `company/docs`. our resolver tries to detect this.

## rate limits

github api: 60 requests/hour unauthenticated, 5,000/hour authenticated.
github raw cdn: thousands per hour. in practice, we rarely hit limits.

for large repos with 5,000+ files, we might hit the api limit. but most docs sites are under 1,000 pages.

## why this is tier 2, not tier 1

tier 1 is `llms.txt`. when it exists, it's a single request for the entire docs structure and content (if `llms-full.txt`).

github tree is tier 2 because it requires multiple requests: one for the tree, then one per file for the download.

but for repos with good `llms-full.txt` support, tier 1 still wins. github tree is the best fallback when `llms.txt` doesn't exist.

## bottom line

github tree + raw cdn is the fastest, cheapest, most reliable docs extraction method. it doesn't work for proprietary docs, but for open-source projects, it's unbeatable.

if you're building a docs extraction pipeline and not checking github first, you're leaving massive speed gains on the table.

---

**related:**
- [the acquisition ladder](/blog/acquisition-ladder)
- [100 sites extracted: the full data](/blog/100-docs-sites-what-broke)
- [from html to markdown: the hard path](/blog/html-to-markdown-extraction)
