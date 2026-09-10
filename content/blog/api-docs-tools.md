# api documentation tools: from openapi to graphql

**meta title:** api documentation tools ranked: openapi, graphql, and beyond
**meta description:** scalar, redocly, swagger, and 15+ other api doc tools compared. which ones are agent-readable and which ones hide content behind javascript?
**slug:** /blog/api-documentation-tools-ranked
**target keywords:** api documentation tools, openapi documentation generator, api docs platform, swagger alternative, graphql documentation tool

---

api documentation is different from product documentation. it's not prose and tutorials. it's schemas, endpoints, parameters, and response objects.

the tools that generate api docs are also different. they don't take markdown. they take openapi specs, graphql schemas, asyncapi definitions. they turn structured machine-readable specs into human-readable websites.

here's how they work, which ones are good, and which ones break extraction.

## openapi renderers: the big three

openapi (formerly swagger) is the standard for rest api documentation. a single `openapi.json` or `openapi.yaml` file describes every endpoint. the tools render it.

### scalar

newer, faster, and simpler than the alternatives. open source. built-in api testing client. code snippets in 15+ languages. custom themes. offline-first.

**agent-readiness:** the openapi spec is the source of truth. it's a json file. agents can read the spec directly. the rendered website is for humans. extraction: grab the spec file. done.

**verdict:** if you're choosing a new openapi renderer, start here. it's modern, fast, and the spec-first approach is inherently agent-friendly.

### redocly

the enterprise standard. redoc pioneered the three-column layout. redocly expanded it into a full developer portal platform with linting, bundling, search, and ci/cd integration.

**agent-readiness:** same as scalar. the openapi spec is readable by agents. redocly adds a developer portal layer that's human-focused.

**verdict:** if you need enterprise features (multi-spec portals, team collaboration, governance), redocly is the choice. for simple api docs, scalar is leaner.

### swagger ui

the original. still maintained by smartbear. executes live api calls from the browser. the tool that made "interactive api docs" a standard expectation.

**agent-readiness:** old, bulky, and renders everything client-side. the spec is accessible at `/openapi.json`, but the html is javascript-heavy. for agents, read the spec file directly.

**verdict:** legacy choice. works. stable. but scalar and redocly are better modern options.

## modern alternatives worth knowing

**stoplight elements**: embeddable web components. converts openapi + asyncapi into standalone web apps or react portals. good if you need to embed api docs inside an existing application.

**rapidoc**: zero-dependency web component. parses openapi specs directly inside standard html. no build pipeline. just a `<script>` tag.

**zuplo**: edge-based api gateway that auto-converts openapi specs to hosted developer portals. includes rate-limiting controls and live request consoles.

**bump.sh**: hosted api portals that track breaking changes between spec releases. ci/cd integration. good for teams that release api versions frequently.

## markdown output and guides alongside specs

**widdershins**: converts openapi 3.0, swagger 2.0, and asyncapi definitions into clean markdown. formatted for docusaurus, mkdocs, or slate. this is actually the most agent-friendly tool in the category: it produces markdown that agents can read natively.

**spectacle**: generates static html from openapi specs using handlebars templates. multi-page or single-page output.

**dapperdox**: embeds markdown conceptual guides alongside openapi endpoints. unified developer portal.

## graphql documentation: different problem

graphql apis don't have openapi specs. they have schemas. the documentation tools extract the schema via introspection and render it.

**magidoc**: static site generator built for graphql. inspects schemas via introspection. outputs svelte-powered searchable sites. the introspection query is the agent-readable source. the rendered site is for humans.

**spectaql**: node.js generator. parses schema files or introspection queries. multi-column html with customizable css. also outputs markdown if configured.

**graphdoc**: static html from graphql schemas. no runtime dependencies. simple and lightweight.

**agent-readiness for graphql:** introspection queries (`__schema`, `__types`) are the machine-readable source. agents can query these directly. the rendered documentation is a human convenience.

## protobuf, asyncapi, and other protocols

**asyncapi generator**: official tooling for event-driven architectures. websockets, kafka, mqtt topics. outputs html, markdown, or react apps. the asyncapi spec is machine-readable.

**protoc-gen-doc**: plugin for the protocol buffer compiler. extracts inline comments from `.proto` files. outputs html, markdown, or json. the `.proto` files with comments are the source.

**typespec**: microsoft's language for api definitions. typescript-like syntax. compiles to openapi + html docs. also outputs the spec file.

## fetch the spec instead of parsing the site

for api documentation tools, the rendered website is almost always secondary to the spec.

| tool | machine-readable source | extraction strategy |
|---|---|---|
| scalar | `openapi.json` | fetch spec directly |
| redocly | `openapi.json` | fetch spec directly |
| swagger ui | `openapi.json` | fetch spec directly |
| stoplight | `openapi.json` | fetch spec directly |
| magidoc | introspection query | run introspection |
| spectaql | schema file / introspection | read file or query |
| graphdoc | schema file | read file |
| asyncapi | `asyncapi.yaml` | fetch spec directly |
| typespec | `tsp` files + compiled spec | read source or output |

for all of these, the best extraction strategy is: don't extract the website. extract the spec.

this is different from product documentation (docusaurus, mintlify) where the site *is* the content. for api docs, the site is frosting. the spec is the cake.

## when the spec isn't available

some teams don't publish their openapi spec publicly. they only publish the rendered docs. in those cases:

- scalar and redocly: the spec is usually embedded in the page json or available at a predictable url
- swagger ui: check `/openapi.json`, `/swagger.json`, or `/api-docs`
- custom implementations: might require html parsing to extract the schema

if the spec truly isn't exposed, extraction becomes hard. but this is rare. most api docs tools want the spec to be accessible.

## choose a renderer for people, a spec for agents

api documentation tools are simpler to extract than product docs because they have a machine-readable source: the spec.

scalar is the modern default. redocly for enterprise. widdershins if you want markdown output. everything else is a variation.

for agents: read the spec. ignore the website.

---

**related:**
- [pure docs generators ranked](/blog/pure-docs-generators-ranked)
- [browser-rendered docs break extraction](/blog/browser-rendered-docs-extraction-problem)
