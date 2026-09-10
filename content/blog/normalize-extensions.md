# the .md.md bug: why url normalization matters in docs extraction

**meta title:** the .md.md bug: url normalization in docs extraction
**meta description:** a simple bug caused us to request `page.md.md` instead of `page.md`. here's why url normalization is critical.
**slug:** /blog/md-md-extension-bug
**target keywords:** md.md extension bug, documentation extension normalization, double md extension, markdown extraction bug, url normalization docs

---

a bug that cost hours to debug. the symptom: `404` for urls that should've worked. the cause: double extensions. `page.md.md` instead of `page.md`.

## the bug

our acquisition ladder constructs `.md` urls by appending `.md` to the path:

```
base url: /docs/getting-started
.md url: /docs/getting-started.md
```

but some sites already had `.md` in their canonical urls:

```
base url: /docs/getting-started.md
.md url: /docs/getting-started.md.md
```

double extension. `404`. extraction fails.

## how it happened

naive implementation:
```javascript
const mdUrl = `${url}.md`
```

if `url` is `/docs/page`, this works: `/docs/page.md`.
if `url` is `/docs/page.md` (already has extension), this becomes `/docs/page.md.md`.

sites where this happened:
- sites that expose `.md` directly in their canonical paths
- some docusaurus configurations
- sites with custom routing that includes `.md`

## the fix

normalize before constructing:

```javascript
function normalizeExtensions(url) {
  // strip trailing extensions
  return url
    .replace(/\.mdx?$/, '')    // remove .md and .mdx
    .replace(/\.html?$/, '')   // remove .html and .htm
}

const mdUrl = `${normalizeExtensions(url)}.md`
```

simple. but critical.

## other extension issues

it's not just `.md.md`:

- `.html.html`
- `.mdx.md` (site uses `.mdx`, we append `.md`)
- `.php.md`

any site that includes extensions in canonical paths needs normalization.

## the general rule

before constructing any url with a known extension, strip existing extensions first.

```javascript
// bad
const newUrl = `${url}.md`

// good
const baseUrl = stripExtensions(url)
const newUrl = `${baseUrl}.md`
```

## testing for edge cases

url normalization is full of edge cases:

- query strings: `/docs/page?ref=nav` → `/docs/page.md?ref=nav`
- anchors: `/docs/page#section` → `/docs/page.md#section`
- trailing slashes: `/docs/page/` → `/docs/page.md`

each of these needs careful handling.

## bottom line

url normalization sounds simple. it's not.

tiny bugs in url construction cause extraction failures that are hard to debug. always normalize. always test with real urls.

---

**related:**
- [the acquisition ladder](/blog/acquisition-ladder)
- [html extraction](/blog/html-to-markdown-extraction)
