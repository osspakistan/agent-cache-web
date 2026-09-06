import { zipSync } from 'fflate'
import { uploadToR2 } from '../../lib/clients'
import type { NavHierarchy } from '../../lib/utils/types'
import { generateDocMetadata } from './meta'

export interface PackageBundleOptions {
  jobId: string
  productName: string
  title?: string
  description?: string
  docsUrl: string
  githubUrl?: string | null
  hierarchy: NavHierarchy
  extractedFiles: Map<string, Uint8Array>
  companionLlmsFullUrl?: string
}

export interface PackageBundleResult {
  zipSizeBytes: number
  hasCompanionLlmsFull: boolean
}

export async function packageJobBundle(opts: PackageBundleOptions): Promise<PackageBundleResult> {
  const {
    jobId,
    productName,
    title,
    description,
    docsUrl,
    githubUrl,
    hierarchy,
    extractedFiles,
    companionLlmsFullUrl,
  } = opts
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
  const hasTabs = Boolean(hierarchy.tabs && hierarchy.tabs.length > 1)
  const tabIndexMap = new Map<string, number>()
  if (hasTabs && hierarchy.tabs) {
    hierarchy.tabs.forEach((t, idx) => {
      tabIndexMap.set(t, idx + 1)
    })
  }

  function getSecFolder(sec: (typeof hierarchy.sections)[0], sIdx: number): string {
    let folder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`
    if (hasTabs && sec.tab) {
      const tIdx = tabIndexMap.get(sec.tab) || 1
      const tabFolder = `${String(tIdx).padStart(2, '0')}-${sec.tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      folder = `${tabFolder}/${folder}`
    }
    return folder
  }

  function renderItemsToc(
    items: (typeof hierarchy.sections)[0]['items'],
    parentFolder: string,
    indent: string,
  ): string {
    let result = ''
    items.forEach((it, iIdx) => {
      const slug = it.slug || it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const hasChildren = Boolean(it.items && it.items.length > 0)
      if (hasChildren) {
        const nestedFolder = `${parentFolder}/${String(iIdx + 1).padStart(2, '0')}-${slug}`
        result += `${indent}- [${it.title}](${nestedFolder}/index.md)\n`
        result += renderItemsToc(it.items || [], nestedFolder, `${indent}  `)
      } else {
        const fileRef = `${parentFolder}/${String(iIdx + 1).padStart(2, '0')}-${slug}.md`
        result += `${indent}- [${it.title}](${fileRef})\n`
      }
    })
    return result
  }

  for (let sIdx = 0; sIdx < hierarchy.sections.length; sIdx++) {
    const sec = hierarchy.sections[sIdx]
    const secFolder = getSecFolder(sec, sIdx)

    let secIndex = `# ${sec.title}\n\n`
    secIndex += renderItemsToc(sec.items, '.', '')

    const secBytes = Buffer.from(secIndex, 'utf8')
    await uploadToR2(
      `${r2FinalPrefix}/${secFolder}/INDEX.md`,
      secBytes,
      'text/markdown; charset=utf-8',
    )
    extractedFiles.set(`${secFolder}/INDEX.md`, secBytes)
  }

  // 3. Generate master root INDEX.md
  let masterIndex = `# ${title || `${productName} Documentation`}\n\n`
  if (description) {
    masterIndex += `> ${description}\n>\n`
  }
  masterIndex += `> Auto-generated agent-ready mirror of [${docsUrl}](${docsUrl})\n\n`

  if (hasCompanionLlmsFull) {
    masterIndex += `> **Companion File**: [llms-full.txt](llms-full.txt) is included in the root archive as a vendor single-file dump.\n\n`
  }

  masterIndex += `## Table of Contents\n\n`

  if (hasTabs && hierarchy.tabs) {
    for (const tab of hierarchy.tabs) {
      const tabSections = hierarchy.sections
        .map((sec, sIdx) => ({ sec, sIdx }))
        .filter((entry) => entry.sec.tab === tab)

      if (tabSections.length > 0) {
        masterIndex += `## ${tab}\n\n`
        tabSections.forEach(({ sec, sIdx }, localIdx) => {
          const secFolder = getSecFolder(sec, sIdx)
          masterIndex += `### ${localIdx + 1}. [${sec.title}](${secFolder}/INDEX.md)\n\n`
          masterIndex += renderItemsToc(sec.items, secFolder, '')
          masterIndex += `\n`
        })
      }
    }
  } else {
    for (let sIdx = 0; sIdx < hierarchy.sections.length; sIdx++) {
      const sec = hierarchy.sections[sIdx]
      const secFolder = getSecFolder(sec, sIdx)
      masterIndex += `### ${sIdx + 1}. [${sec.title}](${secFolder}/INDEX.md)\n\n`
      masterIndex += renderItemsToc(sec.items, secFolder, '')
      masterIndex += `\n`
    }
  }

  const masterBytes = Buffer.from(masterIndex, 'utf8')
  await uploadToR2(`${r2FinalPrefix}/INDEX.md`, masterBytes, 'text/markdown; charset=utf-8')
  extractedFiles.set('INDEX.md', masterBytes)

  // 4. Generate Strategy B metadata (keywords, intent triggers, ecosystem)
  const meta = await generateDocMetadata({
    productName,
    url: docsUrl,
    title,
    description,
    hierarchy,
  })

  // Format YAML arrays cleanly
  const yamlKeywords =
    meta.keywords.length > 0
      ? `keywords:\n${meta.keywords.map((k) => `  - "${k.replace(/"/g, '\\"')}"`).join('\n')}\n`
      : ''

  const yamlTriggers =
    meta.intent_triggers.length > 0
      ? `intent_triggers:\n${meta.intent_triggers.map((t) => `  - "${t.replace(/"/g, '\\"')}"`).join('\n')}\n`
      : ''

  const yamlEcosystem =
    meta.ecosystem.length > 0
      ? `ecosystem:\n${meta.ecosystem.map((e) => `  - "${e.replace(/"/g, '\\"')}"`).join('\n')}\n`
      : ''

  // Write meta.yaml and _map.json directly to R2
  const repoLine = githubUrl ? `repository: "${githubUrl}"\n` : ''
  const metaYaml = `${`name: "${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"
title: "${(title || `${productName} Docs`).replace(/"/g, '\\"')}"
description: "${(description || '').replace(/"/g, '\\"')}"
url: "${docsUrl}"
${repoLine}created_at: "${new Date().toISOString()}"
version: "1.0.0"
companion_llms_full: ${hasCompanionLlmsFull}
${yamlKeywords}${yamlTriggers}${yamlEcosystem}`.trim()}\n`

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
  const zipKey = `jobs/${jobId}/${jobId}.zip`

  // Upload ZIP directly to R2 named after jobId, plus bundle.zip alias
  await Promise.all([
    uploadToR2(zipKey, zipped, 'application/zip'),
    uploadToR2(`jobs/${jobId}/bundle.zip`, zipped, 'application/zip'),
  ])

  return {
    zipSizeBytes: zipped.byteLength,
    hasCompanionLlmsFull,
  }
}
