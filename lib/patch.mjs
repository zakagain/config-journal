import path from 'node:path'
import {
  CONFIG_FILE,
  DOCS,
  ROOT,
  compareText,
  readIndexList,
  readSidebar,
  writeLines
} from './catalogue.mjs'

const ITEM_LINE =
  /^(\s*)\{\s*text:\s*(['"])((?:\\.|(?!\2)[^\\])*)\2\s*,\s*link:\s*(['"])([^'"]*)\4\s*\},?\s*$/

function sidebarLine(indent, display, link, needsComma) {
  const base = `${indent}{ text: ${quoteForConfig(display)}, link: '${link}' }`
  return needsComma ? `${base},` : base
}

function quoteForConfig(text) {
  if (text.includes("'") && !text.includes('"')) return `"${text}"`
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function indentOf(line) {
  return (line.match(/^(\s*)/) || ['', ''])[1]
}

function ensureTrailingComma(lines, at) {
  const trimmed = lines[at].replace(/\s+$/, '')
  if (trimmed.endsWith(',')) return false
  lines[at] = `${trimmed},`
  return true
}

function findSectionItems(lines, section) {
  const headerRe = new RegExp(`^\\s*text:\\s*['"]${section}['"]\\s*,?\\s*$`)
  const headers = lines.map((line, at) => (headerRe.test(line) ? at : -1)).filter((at) => at >= 0)
  if (headers.length === 0) {
    throw new Error(`no sidebar section named "${section}"`)
  }
  if (headers.length > 1) {
    throw new Error(`sidebar section "${section}" is ambiguous (${headers.length} matches)`)
  }
  const itemsAt = lines.findIndex((line, at) => at > headers[0] && /^\s*items:\s*\[\s*$/.test(line))
  if (itemsAt === -1) throw new Error(`sidebar section "${section}" has no items array`)
  const indent = indentOf(lines[itemsAt])
  const closeAt = lines.findIndex(
    (line, at) => at > itemsAt && line.replace(/\s+$/, '') === `${indent}]`
  )
  if (closeAt === -1) throw new Error(`sidebar section "${section}" items array is not closed`)
  const itemAt = []
  for (let at = itemsAt + 1; at < closeAt; at += 1) {
    if (lines[at].trim() === '') continue
    const found = lines[at].match(ITEM_LINE)
    if (!found) {
      throw new Error(`unrecognised sidebar item at line ${at + 1}; refusing to guess`)
    }
    itemAt.push({ at, text: found[3], link: found[5], indent: indentOf(lines[at]) })
  }
  return { itemsAt, closeAt, itemAt, indent }
}

function insertionIndex(entries, text) {
  for (let i = 0; i < entries.length; i += 1) {
    if (compareText(entries[i].text, text) > 0) return i
  }
  return entries.length
}

function anchorFor(entries, index) {
  if (index === 0) {
    return { indent: entries[0] ? entries[0].indent : '', at: -1, insert: entries[0] ? entries[0].at : -1 }
  }
  const previous = entries[index - 1]
  return { indent: previous.indent, at: previous.at, insert: previous.at + 1 }
}

function buildPlan({ file, section, line, before, after, commaFix, indent }, page, display) {
  return {
    file,
    relative: path.relative(ROOT, file),
    section,
    line,
    indent,
    before,
    after,
    commaFix: Boolean(commaFix),
    pageLink: page.link,
    target: page.target,
    display
  }
}

export function planSidebarEntry(page, display) {
  const { lines } = readSidebar()
  const block = findSectionItems(lines, page.section)
  if (block.itemAt.some((item) => item.link === page.link)) {
    return { skip: `already in the "${page.section}" sidebar` }
  }
  const index = insertionIndex(block.itemAt, display)
  const anchor = anchorFor(block.itemAt, index)
  const indent = anchor.indent || `${block.indent}  `
  const isLast = index >= block.itemAt.length
  const line = sidebarLine(indent, display, page.link, !isLast)
  const before = index === 0 ? null : block.itemAt[index - 1].text
  const after = index < block.itemAt.length ? block.itemAt[index].text : null
  const anchorLine = anchor.at >= 0 ? lines[anchor.at].replace(/\s+$/, '') : ''
  const commaFix = anchorLine !== '' && !anchorLine.endsWith(',')
  return buildPlan(
    { file: CONFIG_FILE, section: page.section, line, before, after, commaFix, indent },
    page,
    display
  )
}

export function applySidebarEntry(plan, lines) {
  const block = findSectionItems(lines, plan.section)
  if (block.itemAt.some((item) => item.link === plan.pageLink)) {
    throw new Error(`refusing to add a duplicate sidebar entry for ${plan.pageLink}`)
  }
  const index = insertionIndex(block.itemAt, plan.display)
  const anchor = anchorFor(block.itemAt, index)
  const isLast = index >= block.itemAt.length
  const commaFixed = anchor.at >= 0 ? ensureTrailingComma(lines, anchor.at) : false
  const line = sidebarLine(anchor.indent || plan.indent, plan.display, plan.pageLink, !isLast)
  lines.splice(anchor.insert >= 0 ? anchor.insert : block.closeAt, 0, line)
  return { commaFixed }
}

export function planIndexEntry(page, display) {
  const file = path.join(DOCS, page.indexName)
  const { entries } = readIndexList(file)
  if (!entries.length) {
    throw new Error(`${page.indexName} has no A–Z list to extend`)
  }
  if (entries.some((entry) => entry.target.replace(/^\.\//, '') === page.target)) {
    return { skip: `already in ${page.indexName}` }
  }
  const index = insertionIndex(entries, display)
  const anchor = anchorFor(entries, index)
  const line = `${anchor.indent || entries[0].indent}- [${display}](${page.target})`
  const before = index === 0 ? null : entries[index - 1].text
  const after = index < entries.length ? entries[index].text : null
  return buildPlan({ file, section: page.indexName, line, before, after }, page, display)
}

export function applyIndexEntry(plan, lines) {
  const entries = collectEntries(lines)
  if (entries.some((entry) => entry.target.replace(/^\.\//, '') === plan.target)) {
    throw new Error(`refusing to add a duplicate index entry for ${plan.target}`)
  }
  const index = insertionIndex(entries, plan.display)
  const anchor = anchorFor(entries, index)
  lines.splice(anchor.insert >= 0 ? anchor.insert : lines.length, 0, plan.line)
  return lines
}

function collectEntries(lines) {
  const entries = []
  lines.forEach((line, at) => {
    const found = line.match(/^(\s*)- \[([^\]]*)\]\(([^)]*)\)\s*$/)
    if (found) entries.push({ at, indent: found[1], text: found[2], target: found[3] })
  })
  return entries
}

export function commit(plan, lines) {
  writeLines(plan.file, lines)
}
