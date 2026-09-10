# the .agentcache dot-folder: gitignore-ready docs for your repo

**meta title:** the .agentcache folder: how we structure local documentation
**meta description:** agent cache outputs to .agentcache/docs/<slug>/ — a hidden, gitignore-ready folder structure. here's why dot-folders are right for docs.
**slug:** /blog/agentcache-dot-folder
**target keywords:** agentcache dot folder, documentation dot folder, gitignore docs, repo documentation folder, local docs repo

---

agent cache outputs documentation to `.agentcache/docs/<slug>/`.

it's a dot-folder. hidden. gitignore-ready. and it's deliberate.

## why a dot-folder

dot-folders (starting with `.`) are hidden by default in most systems:
- `ls` doesn't show them
- file explorers hide them
- they're out of the way

this is good. docs are reference material, not source code. they shouldn't clutter your view.

## the structure

```
.agentcache/
└── docs/
    ├── hono/
    │   ├── docs/
    │   │   ├── getting-started.md
    │   │   ├── routing.md
    │   │   └── middleware.md
    │   ├── meta.yaml
    │   ├── _map.json
    │   └── INDEX.md
    ├── stripe/
    │   ├── docs/
    │   └── ...
    └── supabase/
        ├── docs/
        └── ...
```

each project gets its own folder. each folder has:
- `docs/` — the actual markdown files
- `meta.yaml` — metadata for agent discovery
- `_map.json` — navigation tree
- `INDEX.md` — table of contents

## why not `docs/` directly?

why not put it at `docs/hono/` instead of `.agentcache/docs/hono/`?

because `docs/` is a common directory name. many projects use it for their own documentation. putting extracted docs there would clash.

`.agentcache/` is namespaced. unique. it won't conflict.

## gitignore-ready by default

the .agentcache folder should be in your `.gitignore`:

```
# agent cache documentation
.agentcache/
```

this means:
- docs aren't committed to git (might be large)
- each developer can have different docs sets
- ci can pre-populate docs if needed
- `.agentcache/` can be regenerated anytime

## multiple docs sets in one repo

a typical project uses multiple libraries:

```
.agentcache/
├── hono/          # backend framework
├── stripe/        # payments
└── prisma/        # database
```

each extraction is independent. you can add, remove, or update individual docs sets without affecting others.

## versioning and updates

what happens when hono releases version 4?

options:
1. **re-extract:** run agent cache again with the same url. existing docs are replaced.
2. **version-specific:** extract to `.agentcache/docs/hono-v4/` alongside `.agentcache/docs/hono-v3/`
3. **partial update:** we don't support this yet. full re-extraction only.

in practice: re-extract when you need a new version. most stable apis don't change often enough to need frequent updates.

## the mcp connection

the future mcp server for agent cache will:
1. scan `.agentcache/` for `meta.yaml` files
2. build an index of available docs
3. surface relevant docs to agents on request

this is why the structure matters. the mcp server needs a predictable way to find docs. `.agentcache/docs/*/meta.yaml` is that predictable path.

## future: the cli managing .agentcache/

the planned cli commands:

```bash
agentcache add https://docs.stripe.com    # extract to .agentcache/docs/stripe/
agentcache list                             # show all extracted docs
agentcache view hono                        # show hono docs structure
agentcache remove hono                      # delete .agentcache/docs/hono/
agentcache update hono                      # re-extract hono docs
```

the folder structure enables these commands. each command maps to a filesystem operation.

## alternatives considered

**`node_modules/.agentcache/`**: too hidden. not accessible. tied to npm.

**`~/.agentcache/<project>/`**: global storage instead of per-project. breaks the "docs live with code" principle.

**inline in `package.json` metadata**: too limited. not suitable for full docs.

## bottom line

`.agentcache/` is a simple, predictable, hidden location for documentation.

it's gitignore-ready. it supports multiple docs sets. it enables future tooling like cli and mcp.

when you extract docs, this is where they go. out of sight, but always available.

---

**related:**
- [meta.yaml: what makes docs discoverable](/blog/meta-yaml-agent-discovery)
- [why local docs matter](/blog/why-local-docs)
