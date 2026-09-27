import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

export const ROOT = path.resolve(HERE, '..')
export const DOCS = path.join(ROOT, 'docs')
export const CONFIG_FILE = path.join(ROOT, '.vitepress', 'config.mts')
export const ENTRY_INDEX = 'entry-index.md'

export const CATEGORIES = {
  app: { label: 'App review', dir: 'apps', section: 'Apps', index: 'appindex.md' },
  game: { label: 'Game review', dir: 'games', section: 'Games', index: 'gameindex.md' },
  movie: { label: 'Movie review', dir: 'movies', section: 'Movies', index: 'movieindex.md' },
  book: { label: 'Book review', dir: 'books', section: 'Books', index: 'bookindex.md' }
}

const STRUCTURAL = {
  'index.md': 'home page',
  '404.md': 'not-found page',
  'entry-index.md': 'entry index',
  'appindex.md': 'app A–Z index',
  'gameindex.md': 'game A–Z index',
  'movieindex.md': 'movie A–Z index',
  'bookindex.md': 'book A–Z index',
  'apps.md': 'app landing page',
  'games.md': 'game landing page',
  'movies.md': 'movie landing page',
  'books.md': 'book landing page',
  'game-reviews.md': 'duplicate of games.md',
  'suggest-something.md': 'suggestion form',
  'LICENSE.md': 'licence',
  'DISCLAIMER.md': 'disclaimer',
  'windowsdisclaimer.md': 'disclaimer'
}

const IMPLICIT = {
  'index.md': 'served as the site root',
  '404.md': 'claimed automatically by VitePress'
}

const SUPPRESSED = {
  'game-reviews.md': 'held back from the audit on request'
}

export function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n')
}

export function writeLines(file, lines) {
  fs.writeFileSync(file, lines.join('\n'))
}

export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[/\\:*?"<>|]/g, '')
}

function normaliseTarget(target) {
  return target.replace(/^\.\//, '').replace(/^\//, '')
}

export function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (!pair) continue
    fields[pair[1]] = pair[2].trim().replace(/^["']([\s\S]*)["']$/, '$1')
  }
  return fields
}

export function pageTitle(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const fields = readFrontmatter(file)
  if (fields.title) return fields.title
  const heading = raw.match(/^#\s+(.+)$/m)
  if (heading) return heading[1].replace(/[^\p{L}\p{N}]/gu, '').trim()
  return path.basename(file, '.md')
}

export function displayFromTitle(title) {
  return title
    .replace(/\s*\|\s*review\s*$/i, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim()
}

export function readSidebar() {
  const lines = readLines(CONFIG_FILE)
  const links = new Set()
  for (const line of lines) {
    const found = line.match(/\blink:\s*['"]([^'"]*)['"]/)
    if (found) links.add(found[1])
  }
  return { lines, links }
}

export function readIndexList(file) {
  const lines = readLines(file)
  const entries = []
  lines.forEach((line, at) => {
    const found = line.match(/^(\s*)- \[([^\]]*)\]\(([^)]*)\)\s*$/)
    if (found) entries.push({ at, indent: found[1], text: found[2], target: found[3] })
  })
  return { lines, entries }
}

function allMarkdown() {
  const found = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md')) found.push(full)
    }
  }
  walk(DOCS)
  return found
}

function buildReferencedSet() {
  const referenced = new Set()
  for (const file of allMarkdown()) {
    const raw = fs.readFileSync(file, 'utf8')
    for (const found of raw.matchAll(/\(([^)\s]+\.md)\)/g)) {
      referenced.add(normaliseTarget(found[1]))
    }
  }
  return referenced
}

function mdFilesIn(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
}

function reviewPages(sidebarLinks) {
  const pages = []
  for (const [kind, category] of Object.entries(CATEGORIES)) {
    const dir = path.join(DOCS, category.dir)
    const indexName = category.index
    const indexPath = path.join(DOCS, indexName)
    if (!fs.existsSync(dir) || !fs.existsSync(indexPath)) continue
    const { entries } = readIndexList(indexPath)
    const indexed = new Set(entries.map((entry) => normaliseTarget(entry.target)))
    for (const name of mdFilesIn(dir)) {
      const slug = name.replace(/\.md$/, '')
      const file = path.join(dir, name)
      const title = pageTitle(file)
      const target = normaliseTarget(`${category.dir}/${name}`)
      pages.push({
        kind,
        role: category.label,
        file,
        relative: path.relative(ROOT, file),
        name,
        title,
        display: displayFromTitle(title),
        link: `/${category.dir}/${slug}`,
        target,
        section: category.section,
        indexName,
        inSidebar: sidebarLinks.has(`/${category.dir}/${slug}`),
        inIndex: indexed.has(target)
      })
    }
  }
  return pages
}

function notePages(sidebarLinks) {
  const { entries } = readIndexList(path.join(DOCS, ENTRY_INDEX))
  const indexed = new Set(entries.map((entry) => normaliseTarget(entry.target)))
  const pages = []
  for (const name of mdFilesIn(DOCS)) {
    const slug = name.replace(/\.md$/, '')
    const link = `/${slug}`
    const file = path.join(DOCS, name)
    const structural = STRUCTURAL[name]
    const inSidebar = sidebarLinks.has(link)
    const title = pageTitle(file)
    pages.push({
      kind: 'note',
      role: structural ? `structural: ${structural}` : 'note',
      file,
      relative: path.relative(ROOT, file),
      name,
      title,
      display: displayFromTitle(title),
      link,
      target: name,
      section: null,
      indexName: ENTRY_INDEX,
      inSidebar,
      inIndex: indexed.has(name),
      structural: Boolean(structural)
    })
  }
  return pages
}

export function scan() {
  const { links: sidebarLinks } = readSidebar()
  const referenced = buildReferencedSet()
  const pages = [...reviewPages(sidebarLinks), ...notePages(sidebarLinks)]
  for (const page of pages) {
    page.referenced = referenced.has(page.target)
  }
  return pages
}

export function audit(pages) {
  const actionable = pages.filter(
    (page) => page.kind !== 'note' && (!page.inSidebar || !page.inIndex)
  )
  const notes = pages.filter((page) => page.kind === 'note' && !page.structural)
  const unlistedNotes = notes.filter((page) => !page.inSidebar)
  const wired = new Set(actionable.map((page) => page.target))
  const stale = pages.filter(
    (page) =>
      !IMPLICIT[page.name] &&
      !SUPPRESSED[page.name] &&
      !page.inSidebar &&
      !page.referenced &&
      !wired.has(page.target)
  )
  return { pages, actionable, notes, unlistedNotes, stale }
}

export function compareText(a, b) {
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' })
}
