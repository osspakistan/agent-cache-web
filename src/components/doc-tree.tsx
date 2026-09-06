import type { NavHierarchy, NavItem } from '../lib/utils/types'

// ─── Tree node type ───────────────────────────────────────────────────────────

interface TreeNode {
  name: string
  title?: string
  path: string
  url?: string
  isDir: boolean
  children: TreeNode[]
}

/**
 * Builds nested hierarchy tree preserving original external doc URLs for each node.
 */
export function buildHierarchyTree(hierarchy: NavHierarchy): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isDir: true, children: [] }

  function addPath(parts: string[], isDir: boolean, url?: string, title?: string) {
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      let child = node.children.find((c) => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: isLast ? isDir : true,
          children: [],
        }
        node.children.push(child)
      }
      if (isLast) {
        if (url) child.url = url
        if (title) child.title = title
      }
      node = child
    }
  }

  const hasTabs = Boolean(hierarchy.tabs && hierarchy.tabs.length > 1)
  const tabIndexMap = new Map<string, number>()
  if (hasTabs && hierarchy.tabs) {
    hierarchy.tabs.forEach((t, idx) => {
      tabIndexMap.set(t, idx + 1)
    })
  }

  function getSecFolderParts(sec: (typeof hierarchy.sections)[0], sIdx: number): string[] {
    const secFolder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`
    if (hasTabs && sec.tab) {
      const tIdx = tabIndexMap.get(sec.tab) || 1
      const tabFolder = `${String(tIdx).padStart(2, '0')}-${sec.tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      return [tabFolder, secFolder]
    }
    return [secFolder]
  }

  function collectItems(items: NavItem[], parentParts: string[]) {
    items.forEach((item, iIdx) => {
      const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const prefix = String(iIdx + 1).padStart(2, '0')
      const hasChildren = Boolean(item.items && item.items.length > 0)
      if (hasChildren) {
        const folderParts = [...parentParts, `${prefix}-${slug}`]
        addPath([...folderParts, 'index.md'], false, item.url, item.title)
        collectItems(item.items || [], folderParts)
      } else {
        addPath([...parentParts, `${prefix}-${slug}.md`], false, item.url, item.title)
      }
    })
  }

  hierarchy.sections.forEach((sec, sIdx) => {
    const secParts = getSecFolderParts(sec, sIdx)
    // Also include section INDEX.md in the tree representation
    addPath([...secParts, 'INDEX.md'], false, undefined, `${sec.title} Index`)
    collectItems(sec.items, secParts)
  })

  return root.children
}

/**
 * Extracts flat canonical relative paths from a documentation NavHierarchy.
 */
export function extractHierarchyPaths(_productName: string, hierarchy: NavHierarchy): string[] {
  const paths: string[] = []
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

  function collectItems(items: NavItem[], parentPath: string) {
    items.forEach((item, iIdx) => {
      const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const prefix = String(iIdx + 1).padStart(2, '0')
      const hasChildren = Boolean(item.items && item.items.length > 0)
      if (hasChildren) {
        const folder = `${parentPath}/${prefix}-${slug}`
        paths.push(`${folder}/index.md`)
        collectItems(item.items || [], folder)
      } else {
        paths.push(`${parentPath}/${prefix}-${slug}.md`)
      }
    })
  }

  hierarchy.sections.forEach((sec, sIdx) => {
    const secFolder = getSecFolder(sec, sIdx)
    paths.push(`${secFolder}/INDEX.md`)
    collectItems(sec.items, secFolder)
  })

  return [...new Set(paths)]
}

/**
 * Generates a plain ASCII tree (not rendered in UI — kept for debugging/export).
 */
export function generateAsciiTree(productName: string, hierarchy: NavHierarchy): string {
  const lines: string[] = []
  const rootName = (productName || 'docs').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  lines.push(`${rootName}/docs/`)

  const hasTabs = Boolean(hierarchy.tabs && hierarchy.tabs.length > 1)
  const tabIndexMap = new Map<string, number>()
  if (hasTabs && hierarchy.tabs) {
    hierarchy.tabs.forEach((t, idx) => {
      tabIndexMap.set(t, idx + 1)
    })
  }

  function renderItems(items: NavItem[], prefix: string) {
    items.forEach((item, idx) => {
      const isLast = idx === items.length - 1
      const branch = isLast ? '└── ' : '├── '
      const nextPrefix = prefix + (isLast ? '    ' : '│   ')
      const hasChildren = Boolean(item.items && item.items.length > 0)
      const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const fileIdx = String(idx + 1).padStart(2, '0')
      if (hasChildren) {
        lines.push(`${prefix}${branch}${fileIdx}-${slug}/`)
        lines.push(`${nextPrefix}├── index.md`)
        renderItems(item.items || [], nextPrefix)
      } else {
        lines.push(`${prefix}${branch}${fileIdx}-${slug}.md`)
      }
    })
  }

  if (hasTabs && hierarchy.tabs) {
    hierarchy.tabs.forEach((tab, tIdx) => {
      const isLastTab = tIdx === (hierarchy.tabs?.length ?? 0) - 1
      const tabBranch = isLastTab ? '└── ' : '├── '
      const tabPrefix = isLastTab ? '    ' : '│   '
      const tabSlug = `${String(tIdx + 1).padStart(2, '0')}-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      lines.push(`${tabBranch}${tabSlug}/`)
      const tabSections = hierarchy.sections.filter((s) => s.tab === tab)
      tabSections.forEach((sec, sIdx) => {
        const isLastSec = sIdx === tabSections.length - 1
        const secBranch = isLastSec ? '└── ' : '├── '
        const secPrefix = tabPrefix + (isLastSec ? '    ' : '│   ')
        const secFolder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`
        lines.push(`${tabPrefix}${secBranch}${secFolder}/`)
        renderItems(sec.items, secPrefix)
      })
    })
  } else {
    hierarchy.sections.forEach((sec, sIdx) => {
      const isLastSec = sIdx === hierarchy.sections.length - 1
      const secBranch = isLastSec ? '└── ' : '├── '
      const secPrefix = isLastSec ? '    ' : '│   '
      const secFolder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`
      lines.push(`${secBranch}${secFolder}/`)
      renderItems(sec.items, secPrefix)
    })
  }

  return lines.join('\n')
}

/**
 * Render tree nodes to HTML string (SSR).
 * level=0 → L1 nodes (open by default), level≥1 → collapsed by default.
 * Each file node links directly to its source doc page.
 */
function renderTreeNodes(nodes: TreeNode[], level: number): string {
  if (nodes.length === 0) return ''

  const items = nodes
    .map((node) => {
      if (node.isDir) {
        const open = level === 0
        const icon = open
          ? `<span class="tree-toggle-icon">−</span>`
          : `<span class="tree-toggle-icon">+</span>`
        const childHtml = renderTreeNodes(node.children, level + 1)
        return `
        <li class="tree-dir-item" data-open="${open}">
          <button class="tree-dir-btn" type="button" aria-expanded="${open}">
            ${icon}
            <span class="tree-node-name">${node.name}</span>
          </button>
          <ul class="tree-children" style="${open ? '' : 'display:none'}">
            ${childHtml}
          </ul>
        </li>`
      }

      // File node — strip .md suffix for clean display
      const display = node.name.replace(/\.md$/, '')
      const titleAttr = node.title ? ` title="${node.title.replace(/"/g, '&quot;')}"` : ''

      if (node.url) {
        return `
        <li class="tree-file-item">
          <a class="tree-file-link" href="${node.url}" target="_blank" rel="noopener noreferrer"${titleAttr}>
            <span class="tree-file-name">${display}</span>
            <span class="tree-file-arrow" aria-hidden="true">↗</span>
          </a>
        </li>`
      }

      return `
      <li class="tree-file-item">
        <span class="tree-file-name"${titleAttr}>${display}</span>
      </li>`
    })
    .join('')

  return items
}

/**
 * Interactive collapsible file tree — pure SSR HTML + vanilla JS.
 * Includes direct external doc links for each file and live search.
 */
export function DocumentationTreeSection({
  productName,
  hierarchy,
}: {
  productName: string
  hierarchy: NavHierarchy
}) {
  const id = `doc-tree-${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const rootSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const nodes = buildHierarchyTree(hierarchy)
  const treeHtml = renderTreeNodes(nodes, 0)

  const tabsCount = hierarchy.tabs ? hierarchy.tabs.length : 0
  const structureLabel =
    tabsCount > 1
      ? `${tabsCount} tabs · ${hierarchy.sections.length} sections`
      : `${hierarchy.sections.length} sections`

  return (
    <section class="doc-tree-section">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span
            class="mono"
            style="font-size: 11px; color: var(--accent-ink); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;"
          >
            File Tree & Artifact Map
          </span>
          <h2 style="font-size: 22px; margin: 4px 0 0; color: var(--ink); font-weight: 600;">
            Documentation Structure
          </h2>
        </div>
        <span class="mono" style="font-size: 12px; color: var(--ink-soft);">
          {structureLabel}
        </span>
      </div>

      <div class="ascii-tree-container">
        {/* Header */}
        <div class="ascii-tree-header" style="padding: 10px 16px;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
            <span
              class="mono"
              style="font-size: 12px; color: var(--ink); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            >
              {rootSlug}/docs/
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <input
              id={`${id}-search`}
              type="text"
              placeholder="filter files..."
              class="mono"
              style="padding: 3px 10px; font-size: 11px; border: 1px solid var(--rule); border-radius: 4px; background: var(--paper); color: var(--ink); outline: none; width: 140px;"
            />
            <button
              id={`${id}-toggle`}
              type="button"
              class="mono"
              style="padding: 3px 8px; font-size: 11px; border: 1px solid var(--rule); border-radius: 4px; background: var(--paper); color: var(--ink-soft); cursor: pointer;"
            >
              collapse all
            </button>
          </div>
        </div>

        {/* Tree body */}
        <div style="max-height: 560px; overflow-y: auto; padding: 8px 0;">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                #${id}, #${id} ul { list-style: none; margin: 0; padding: 0; }
                #${id} .tree-children { padding-left: 18px; border-left: 1px solid var(--rule); margin-left: 8px; }
                #${id} .tree-dir-btn {
                  display: flex; align-items: center; gap: 6px;
                  width: 100%; padding: 3px 12px;
                  background: none; border: none; cursor: pointer;
                  font-family: var(--mono, ui-monospace, monospace); font-size: 12.5px;
                  color: var(--ink); text-align: left;
                  border-radius: 4px; transition: background 0.1s;
                }
                #${id} .tree-dir-btn:hover { background: var(--secondary); }
                #${id} .tree-toggle-icon {
                  width: 14px; text-align: center; flex-shrink: 0;
                  font-size: 12px; color: var(--ink-soft); font-weight: 700;
                  font-style: normal;
                }
                #${id} .tree-node-name { color: var(--ink); font-weight: 500; }
                #${id} .tree-file-item {
                  padding: 2px 12px 2px 30px;
                  font-family: var(--mono, ui-monospace, monospace); font-size: 12px;
                }
                #${id} .tree-file-name { color: var(--ink-soft); transition: color 0.15s ease; }
                #${id} .tree-file-link {
                  display: inline-flex;
                  align-items: center;
                  gap: 5px;
                  color: inherit;
                  text-decoration: none;
                  border-radius: 3px;
                  padding: 1px 4px;
                  margin: -1px -4px;
                  transition: background 0.15s ease, color 0.15s ease;
                }
                #${id} .tree-file-link:hover {
                  background: var(--secondary);
                }
                #${id} .tree-file-link:hover .tree-file-name {
                  color: var(--accent-ink, #2563eb);
                  text-decoration: underline;
                }
                #${id} .tree-file-arrow {
                  font-size: 10px;
                  color: var(--ink-soft);
                  opacity: 0.5;
                  transition: opacity 0.15s ease, transform 0.15s ease;
                }
                #${id} .tree-file-link:hover .tree-file-arrow {
                  opacity: 1;
                  transform: translate(1px, -1px);
                  color: var(--accent-ink, #2563eb);
                }
                #${id} .tree-file-item.hidden, #${id} .tree-dir-item.hidden { display: none; }
              `,
            }}
          />
          <ul id={id} dangerouslySetInnerHTML={{ __html: treeHtml }} />
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var root = document.getElementById(${JSON.stringify(id)});
              if (!root) return;

              // Click: toggle folder
              root.addEventListener('click', function(e) {
                var btn = e.target.closest('.tree-dir-btn');
                if (!btn) return;
                var item = btn.closest('.tree-dir-item');
                var children = item.querySelector('.tree-children');
                var icon = btn.querySelector('.tree-toggle-icon');
                var open = item.dataset.open === 'true';
                item.dataset.open = open ? 'false' : 'true';
                btn.setAttribute('aria-expanded', open ? 'false' : 'true');
                children.style.display = open ? 'none' : '';
                icon.textContent = open ? '+' : '−';
              });

              // Collapse all / expand all
              var toggleBtn = document.getElementById(${JSON.stringify(`${id}-toggle`)});
              var allCollapsed = false;
              if (toggleBtn) {
                toggleBtn.addEventListener('click', function() {
                  allCollapsed = !allCollapsed;
                  toggleBtn.textContent = allCollapsed ? 'expand all' : 'collapse all';
                  root.querySelectorAll('.tree-dir-item').forEach(function(item) {
                    var children = item.querySelector('.tree-children');
                    var icon = item.querySelector('.tree-toggle-icon');
                    item.dataset.open = allCollapsed ? 'false' : 'true';
                    item.querySelector('.tree-dir-btn').setAttribute('aria-expanded', allCollapsed ? 'false' : 'true');
                    children.style.display = allCollapsed ? 'none' : '';
                    icon.textContent = allCollapsed ? '+' : '−';
                  });
                });
              }

              // Search filter
              var searchInput = document.getElementById(${JSON.stringify(`${id}-search`)});
              if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                  var q = e.target.value.toLowerCase().trim();
                  if (!q) {
                    // Restore default state
                    root.querySelectorAll('.tree-dir-item, .tree-file-item').forEach(function(el) {
                      el.classList.remove('hidden');
                    });
                    root.querySelectorAll('.tree-children').forEach(function(ul) {
                      var item = ul.closest('.tree-dir-item');
                      ul.style.display = item && item.dataset.open === 'true' ? '' : 'none';
                    });
                    return;
                  }
                  // Show items that match, expand their parents
                  root.querySelectorAll('.tree-file-item').forEach(function(el) {
                    var name = el.querySelector('.tree-file-name')?.textContent.toLowerCase() || '';
                    el.classList.toggle('hidden', !name.includes(q));
                  });
                  root.querySelectorAll('.tree-dir-item').forEach(function(item) {
                    var hasMatch = item.querySelector('.tree-file-item:not(.hidden)');
                    item.classList.toggle('hidden', !hasMatch);
                    if (hasMatch) {
                      item.querySelector('.tree-children').style.display = '';
                    }
                  });
                });
              }
            })();
          `,
        }}
      />
    </section>
  )
}
