# how we handle versioned documentation (v1, v2, v3)

**meta title:** how agent cache handles versioned documentation
**meta description:** many docs sites have version selectors. here's how agent cache extracts versioned docs and which version you get.
**slug:** /blog/versioned-documentation
**target keywords:** versioned documentation, docs versioning, multiple doc versions, api version documentation, docs version selector

---

many documentation sites have version selectors. "v1" vs "v2." "latest" vs "legacy." "api v3" vs "api v4."

when you paste a docs url, which version does agent cache extract?

## the versioning problem

| site | version pattern | example |
|---|---|---|
| react | `/docs/` (latest) + `/docs/18/` | url-based |
| node.js | `/api/v18/` | path-based |
| docusaurus | version dropdown | spa-rendered |
| mintlify | `/v1/`, `/v2/` | subdomain or path |

different sites handle versions differently. some put the version in the url. some use a dropdown rendered by javascript. some default to the latest version.

## our strategy: extract the default version

for most sites, the "default" url serves the latest version. that's what we extract.

examples:
- `https://hono.dev/docs` → whatever version hono serves by default (currently v4)
- `https://react.dev` → latest react docs
- `https://docs.stripe.com` → latest stripe api version

this is the version most users want. most agents need the current stable docs, not legacy versions.

## version detection methods

we detect versions in several ways:

**url path:** `/v1/`, `/v2/`, `/docs/v18/`

**subdomain:** `v1.docs.example.com`, `v2.docs.example.com`

**meta tags:** `<meta name="doc-version" content="v2">`

**framework-specific docusaurus and mintlify expose version info in their apis. fumadocs has version tabs.

## variant support (future)

we're adding variant support. extractions will be tagged with version info:

```
.agentcache/docs/hono-v3/
.agentcache/docs/hono-v4/
```

each is an independent extraction. you can have multiple versions side by side.

this is not implemented yet. current behavior: one extraction per site, latest version.

## why not extract all versions

extracting all versions means:
- more storage
- longer extraction time
- more maintenance
- user confusion about which version to use

most users want the latest. if they need an older version, they can extract it explicitly by pasting the versioned url.

## extracting a specific version

if you need a specific version, paste the versioned url:
- `https://react.dev/docs/18.2` (if it exists)
- `https://v2.docs.example.com/api`

agent cache extracts the url you give it. if that url points to a specific version, that's what you get.

## the ui (future)

a future version of the web app might show:

```
extracting hono docs...
version detected: v4 (latest)
also available: v3 (extract separately if needed)
```

giving users awareness without forcing all versions.

## bottom line

agent cache extracts the default (usually latest) version.

for most use cases, that's correct. agents need current docs.

if you need a specific version, paste the versioned url directly.

variant support is coming. but latest-first is the right default.

---

**related:**
- [framework extractor rankings](/blog/docs-framework-agent-readability)
- [the acquisition ladder](/blog/acquisition-ladder)
