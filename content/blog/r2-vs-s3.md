# why cloudflare r2 beats s3 for my documentation bundles

**meta title:** cloudflare r2 vs s3: why r2 won for docs storage
**meta description:** i use cloudflare r2 instead of s3 for storing documentation bundles. here's why zero egress fees matter when you serve zip downloads.
**slug:** /blog/r2-vs-s3-storage
**target keywords:** cloudflare r2 vs s3, r2 documentation storage, zero egress r2, r2 object storage, s3 alternative r2

---

s3 is the default object store. it's everywhere. amazon built it. it works.

i chose cloudflare r2.

## s3 bills for downloads; r2 doesn't

s3 charges for data egress. when someone downloads a file from s3, amazon charges you for the bandwidth.

r2 charges zero for egress. downloads are free.

for most use cases, this doesn't matter. you store backups in s3. you retrieve them rarely. the egress cost is negligible.

for agent cache, egress is the primary cost.

## my use case: zip file downloads

every extraction produces a zip file. users download that zip.

average zip size: 5-10 MB. some are 50+ MB (stripe docs is 8.7 MB).

s3 pricing: $0.09 per gb downloaded.

10,000 downloads of 5 MB zips = ~50 GB = $4.50. 100,000 downloads = $450. 1,000,000 downloads = $4,500.

r2 pricing: $0.

## does r2 have downsides?

yes. a few:

**api compatibility.** r2 is mostly s3-compatible. mostly. some edge cases in multipart uploads. but for simple put/get operations, it's identical.

**console experience.** s3 console is mature. r2 console is newer. simpler. fewer features.

**list performance.** r2 can be slower when listing many objects. i don't list objects much.

**region availability.** s3 has more regions. r2 is newer. but for my scale, the available regions are sufficient.

**no lifecycle management (yet).** s3 has sophisticated lifecycle rules. r2's are simpler. again, i don't need complex rules.

for my workload (put object, get object, occasional delete), r2 is perfect.

## download costs at three traffic levels

assuming my launch goes moderately well:

| downloads/month | avg zip size | s3 egress | r2 egress |
|---|---|---|---|
| 10,000 | 5 MB | $4.50 | $0 |
| 100,000 | 5 MB | $45 | $0 |
| 1,000,000 | 5 MB | $450 | $0 |

r2 storage cost: $0.015/GB/month.
s3 storage cost: $0.023/GB/month.

r2 is slightly cheaper for storage too. but the real savings is egress.

## when s3 would be the right choice

- mixed workloads (not just downloads)
- need complex lifecycle policies
- need cross-region replication
- enterprise requirements for s3 specifically
- need glacier/archive tiers
- already invested in aws ecosystem

for agent cache, none of these apply. r2 wins on cost for my specific workload.

## implementation

r2 is s3-compatible. i use the aws sdk with an r2 endpoint:

```javascript
const s3 = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  region: 'auto'
})
```

put object:
```javascript
await s3.send(new PutObjectCommand({
  Bucket: 'agent-cache',
  Key: 'jobs/ac-4k9z1m8x/bundle.zip',
  Body: zipBuffer
}))
```

get object:
```javascript
await s3.send(new GetObjectCommand({
  Bucket: 'agent-cache',
  Key: 'jobs/ac-4k9z1m8x/bundle.zip'
}))
```

if r2 didn't exist, i'd use s3. the code is identical.

## r2 fits a product that mostly serves downloads

r2 is not universally better than s3. it's better for my specific use case: serving zip file downloads.

zero egress fees make it the obvious choice. i'm not paying amazon for bandwidth i didn't ask for.

if you're building anything with significant download volume, r2 is worth considering.

---

**related:**
- [agent cache architecture deep dive](/blog/architecture-deep-dive)
- [turso vs postgresql](/blog/why-turso-over-postgres)
