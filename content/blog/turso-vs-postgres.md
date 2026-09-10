# why i chose turso (libsql) over postgresql for job metadata

**meta title:** turso vs postgresql: why sqlite won for my use case
**meta description:** agent cache uses turso (libsql) instead of postgresql for job metadata. here's why serverless sqlite was the right call.
**slug:** /blog/why-turso-over-postgres
**target keywords:** turso vs postgresql, turso libsql, sqlite for job metadata, turso database, edge sqlite

---

most web apps use postgresql. it's the default. robust, proven, relational.

agent cache uses turso, a serverless sqlite database.

here's why.

## what i store

agent cache's database stores:
- job metadata: id, url, status, timestamps
- extraction results: page count, strategy used, errors
- basic analytics: which sites are extracted most

the schema is tiny. 3 tables. fewer than 10 columns each.

this is not a complex workload. no complex joins. no transactions spanning multiple tables. no graph queries. no full-text search.

## postgresql: overkill for this workload

postgresql features i don't need:
- advanced query planner (i have simple selects)
- full-text search (i search the filesystem, not the db)
- partitioning (3 tables don't need partitioning)
- replication (single instance is fine)
- complex types (jsonb, arrays, custom types)

postgresql features i'd pay for but not use:
- managed instance at $15+/month
- connection pooling
- backup and recovery
- monitoring

postgresql is a great database. just not for this.

## turso: serverless sqlite

turso is sqlite deployed as a serverless service.

what i get:
- **zero ops.** no database to manage. no migrations to run manually. no connection strings to configure.
- **libsql protocol.** runs locally in development. scales to turso cloud in production.
- **tiny cost.** free tier handles my workload. paid tier is $9/month if i ever need it.
- **sqlite features.** acid transactions. relational queries. small footprint.

## why sqlite works for metadata

sqlite handles my workload perfectly:
- simple schema
- single-writer (job processing is sequential by nature)
- fast reads (status checks, job listing)
- no concurrency conflicts (i control concurrency at the application level)

sqlite's single-writer model is actually fine here. i don't have multiple processes writing simultaneously. the worker pool writes results, the status endpoint reads results. that's acceptable sqlite concurrency.

## turso leaves room for an edge deployment

turso is designed for edge deployments. libsql replicates across regions. low latency for reads.

i'm currently deployed on a single vps. but if i ever move to an edge architecture (cloudflare workers for api, r2 for storage), turso fits naturally.

## when postgresql would be better

postgresql would be the right choice if i had:
- multiple writers (many workers updating the same row)
- complex reports and aggregations
- full-text search requirements
- need for stored procedures
- strict compliance requirements

none of these apply to agent cache.

## moving to postgres if the workload outgrows sqlite

if i outgrow turso, migrating to postgresql is straightforward:
- dump sqlite database
- import to postgresql
- change connection string
- adjust a few queries (sqlite is close to postgresql dialect)

it's not hard. but i probably won't need to. sqlite handles my scale easily.

## three small tables don't need postgres

postgresql is the industry's default database. that's fine.

but not every app needs postgresql. agent cache is a simple tool with simple data needs. sqlite (via turso) handles it perfectly.

use the right tool for the job. sqlite is the right tool here.

---

**related:**
- [agent cache architecture](/blog/architecture-deep-dive)
- [cloudflare r2 vs s3](/blog/r2-vs-s3-storage)
