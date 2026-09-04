import { zipSync } from 'fflate'
import { uploadToR2 } from '../../lib/clients'
import type { NavHierarchy } from '../../lib/utils/types'

export interface PackageBundleOptions {
  jobId: string
  productName: string
  docsUrl: string
  hierarchy: NavHierarchy
  extractedFiles: Map<string, Uint8Array>
  companionLlmsFullUrl?: string
}

export interface PackageBundleResult {
  zipSizeBytes: number
  hasCompanionLlmsFull: boolean
}

export async function packageJobBundle(opts: PackageBundleOptions): Promise<PackageBundleResult> {
  const { jobId, productName, docsUrl, hierarchy, extractedFiles, companionLlmsFullUrl } = opts
  const r2FinalPrefix = `jobs/${jobId}/final`
  let hasCompanionLlmsFull = false

  // 1. Fetch and store companion llms-full.txt if available
  if (companionLlmsFullUrl) {
    try {
      const fullRes = await fetch(companionLlmsFullUrl, {
        headers: { 'User-Agent': 'agent-cache/1.0' },
        signal: AbortSignal.timeout(10000),
      })
      if (fullRes.ok) {
        const fullText = await fullRes.text()
        if (fullText.length > 50) {
          const fullBytes = Buffer.from(fullText, 'utf8')
          await uploadToR2(`${r2FinalPrefix}/llms-full.txt`, fullBytes, 'text/plain; charset=utf-8')
          extractedFiles.set('llms-full.txt', fullBytes)
          hasCompanionLlmsFull = true
        }
      }
    } catch (err) {
      console.warn(
        `[Packager] Failed to fetch companion llms-full.txt from ${companionLlmsFullUrl}:`,
        err,
      )
    }
  }

  // 2. Generate local INDEX.md in each section
  for (let sIdx = 0; sIdx < hierarchy.sections.length; sIdx++) {
    const sec = hierarchy.sections[sIdx]
    const secFolder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`

    let secIndex = `# ${sec.title}\n\n`
    sec.items.forEach((it, iIdx) => {
      const fileRef = `${String(iIdx + 1).padStart(2, '0')}-${it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
      secIndex += `- [${it.title}](${fileRef})\n`
    })

    const secBytes = Buffer.from(secIndex, 'utf8')
    await uploadToR2(
      `${r2FinalPrefix}/${secFolder}/INDEX.md`,
      secBytes,
      'text/markdown; charset=utf-8',
    )
    extractedFiles.set(`${secFolder}/INDEX.md`, secBytes)
  }

  // 3. Generate master root INDEX.md
  let masterIndex = `# ${productName} Documentation\n\n`
  masterIndex += `> Auto-generated agent-ready mirror of [${docsUrl}](${docsUrl})\n\n`

  if (hasCompanionLlmsFull) {
    masterIndex += `> 💡 **Companion File**: [llms-full.txt](llms-full.txt) is included in the root archive as a vendor single-file dump.\n\n`
  }

  masterIndex += `## Table of Contents\n\n`

  for (let sIdx = 0; sIdx < hierarchy.sections.length; sIdx++) {
    const sec = hierarchy.sections[sIdx]
    const secFolder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`
    masterIndex += `### ${sIdx + 1}. [${sec.title}](${secFolder}/INDEX.md)\n\n`
    sec.items.forEach((it, iIdx) => {
      const fileRef = `${secFolder}/${String(iIdx + 1).padStart(2, '0')}-${it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
      masterIndex += `- [${it.title}](${fileRef})\n`
    })
    masterIndex += `\n`
  }

  const masterBytes = Buffer.from(masterIndex, 'utf8')
  await uploadToR2(`${r2FinalPrefix}/INDEX.md`, masterBytes, 'text/markdown; charset=utf-8')
  extractedFiles.set('INDEX.md', masterBytes)

  // 4. Write meta.yaml and _map.json directly to R2
  const metaYaml = `name: "${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"
title: "${productName} Docs"
url: "${docsUrl}"
created_at: "${new Date().toISOString()}"
version: "1.0.0"
companion_llms_full: ${hasCompanionLlmsFull}
`
  const metaBytes = Buffer.from(metaYaml, 'utf8')
  await uploadToR2(`${r2FinalPrefix}/meta.yaml`, metaBytes, 'text/yaml; charset=utf-8')
  extractedFiles.set('meta.yaml', metaBytes)

  const mapJson = JSON.stringify(hierarchy, null, 2)
  const mapBytes = Buffer.from(mapJson, 'utf8')
  await uploadToR2(`${r2FinalPrefix}/_map.json`, mapBytes, 'application/json; charset=utf-8')
  extractedFiles.set('_map.json', mapBytes)

  // 5. Create ZIP bundle from memory map using fflate
  const zipEntries: Record<string, Uint8Array> = {}
  for (const [path, bytes] of extractedFiles.entries()) {
    zipEntries[path] = bytes
  }

  const zipped = zipSync(zipEntries, { level: 6 })
  const zipKey = `jobs/${jobId}/bundle.zip`

  // Upload ZIP directly to R2
  await uploadToR2(zipKey, zipped, 'application/zip')

  return {
    zipSizeBytes: zipped.byteLength,
    hasCompanionLlmsFull,
  }
}
