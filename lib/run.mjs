import { audit, readLines, scan, writeLines } from './catalogue.mjs'
import { applyIndexEntry, applySidebarEntry, planIndexEntry, planSidebarEntry } from './patch.mjs'
import { DIM, RESET, heading, line } from './ui.mjs'

const CREATE_HINTS = [
  'npm run app "Title"   → docs/apps/',
  'npm run game "Title"  → docs/games/',
  'npm run review "Title" → docs/movies/',
  'npm run book "Title"  → docs/books/',
  'npm run note "Title"  → docs/'
]

function mark(ok) {
  return ok ? '✔' : '·'
}

function buildReport() {
  const pages = scan()
  return { pages, ...audit(pages) }
}

function printReport(report) {
  heading('config-journal · catalogue audit')

  const reviews = report.pages.filter((page) => page.kind !== 'note')
  const registered = reviews.filter((page) => page.inSidebar && page.inIndex)
  const partial = reviews.filter((page) => page.inSidebar !== page.inIndex)
  const missing = report.actionable

  line(`  reviews on disk      ${reviews.length}`)
  line(`  fully registered     ${mark(true)} ${registered.length}`)
  line(`  half registered      ${partial.length ? `! ${partial.length}` : DIM + '0' + RESET}`)
  line(`  not registered       ${missing.length ? `! ${missing.length}` : DIM + '0' + RESET}`)
  line()

  if (missing.length) {
    line(`  ${DIM}not yet wired up${RESET}`)
    for (const page of missing) {
      const gaps = [page.inSidebar ? null : 'sidebar', page.inIndex ? null : page.indexName]
        .filter(Boolean)
        .join(' + ')
      line(`    ! ${page.title.padEnd(34)} ${DIM}${page.relative}  → missing: ${gaps}${RESET}`)
    }
    line()
  }

  if (report.unlistedNotes.length) {
    line(`  ${DIM}notes with no sidebar entry (left alone — Docs and entry-index are hand-ordered)${RESET}`)
    for (const page of report.unlistedNotes) {
      line(`    · ${page.title.padEnd(34)} ${DIM}${page.relative}${RESET}`)
    }
    line()
  }

  if (report.stale.length) {
    line(`  ${DIM}unreferenced pages (in no sidebar, linked from nowhere)${RESET}`)
    for (const page of report.stale) {
      line(`    ? ${page.title.padEnd(34)} ${DIM}${page.relative}  ${page.role}${RESET}`)
    }
    line()
  }
}

function printPlans(plans) {
  const byFile = new Map()
  for (const plan of plans) {
    if (!plan) continue
    if (!byFile.has(plan.file)) byFile.set(plan.file, [])
    byFile.get(plan.file).push(plan)
  }
  heading('changes')
  for (const [file, group] of byFile) {
    line(`  ${group[0].relative}`)
    for (const plan of group) {
      const where = plan.before
        ? `between "${plan.before}" and ${plan.after ? `"${plan.after}"` : 'the end'}`
        : `at the top, before "${plan.after}"`
      line(`    + ${plan.line.trim()}`)
      line(`      ${DIM}inserts ${where}${RESET}`)
      if (plan.commaFix) {
        line(`      ${DIM}adds a trailing comma to the line above (syntax only)${RESET}`)
      }
    }
    line()
  }
  const touched = [...byFile.values()].flat().filter((plan) => plan.commaFix).length
  line(
    `  ${touched ? DIM : ''}insert-only: no existing entry is reordered, reworded, or removed.${
      touched ? ' Comma fixes noted above.' : ''
    }${touched ? RESET : ''}`
  )
  line()
}

function groupByFile(plans) {
  const groups = new Map()
  for (const plan of plans) {
    if (!plan) continue
    if (!groups.has(plan.file)) groups.set(plan.file, [])
    groups.get(plan.file).push(plan)
  }
  return groups
}

const usable_length = (plans) => plans.filter(Boolean).length

export async function main({ ui, dryRun = false, auditOnly = false }) {
  const report = buildReport()
  printReport(report)

  if (auditOnly) return 0

  if (!report.actionable.length) {
    heading('nothing to do')
    line('  Every review page is already in the sidebar and its A–Z index.')
    line()
    line(`  ${DIM}creating a review?${RESET}`)
    for (const hint of CREATE_HINTS) line(`    ${hint}`)
    line(`  ${DIM}then re-run this command to wire it up.${RESET}`)
    line()
    return 0
  }

  const items = report.actionable.map((page) => {
    const gaps = [page.inSidebar ? null : 'sidebar', page.inIndex ? null : page.indexName]
      .filter(Boolean)
      .join(' + ')
    return { label: page.title, detail: `${page.role} · ${gaps}` }
  })

  const picked = await ui.select({
    prompt: 'wire up which reviews?',
    items,
    multi: true,
    initial: [0]
  })

  if (!picked) {
    heading('cancelled')
    line('  Nothing was changed.')
    line()
    return 0
  }

  const chosen = picked.map((at) => report.actionable[at])
  const plans = []
  const skipped = []

  for (const page of chosen) {
    line()
    line(`  ${page.relative}`)
    const display = await ui.askText('sidebar + index label', page.display)
    line(`    ${DIM}frontmatter title: ${page.title}${RESET}`)
    line(`    ${DIM}label:            ${display}${RESET}`)
    try {
      plans.push(planSidebarEntry(page, display))
      plans.push(planIndexEntry(page, display))
    } catch (error) {
      skipped.push({ page, reason: error.message })
      line(`    ${DIM}skipped: ${error.message}${RESET}`)
    }
  }

  if (skipped.length && usable_length(plans)) {
    line()
    line(`  ${DIM}${skipped.length} page(s) skipped; the rest can still be written.${RESET}`)
  }

  const usable = plans.filter(Boolean)
  if (!usable.length) {
    heading('nothing to write')
    if (skipped.length) {
      line(`  ${skipped.length} page(s) could not be planned safely:`)
      for (const item of skipped) line(`    ! ${item.page.relative} — ${item.reason}`)
      line()
      line(`  ${DIM}fix the config by hand, or re-run once the shape is back to normal.${RESET}`)
    } else {
      line('  Every selected page was already registered.')
    }
    line()
    return 0
  }

  printPlans(usable)

  if (dryRun) {
    heading('dry run')
    line('  No files were written.')
    line()
    return 0
  }

  const yes = await ui.confirm(`write ${usable.length} line(s) to ${groupByFile(usable).size} file(s)?`)
  if (!yes) {
    heading('cancelled')
    line('  Nothing was changed.')
    line()
    return 0
  }

  let commaFixes = 0
  for (const [file, group] of groupByFile(usable)) {
    const buffer = readLines(file)
    for (const plan of group) {
      if (plan.file.endsWith('config.mts')) {
        if (applySidebarEntry(plan, buffer).commaFixed) commaFixes += 1
      } else {
        applyIndexEntry(plan, buffer)
      }
    }
    writeLines(file, buffer)
    line(`  ${mark(true)} ${group[0].relative}`)
  }
  if (commaFixes) {
    line(`  ${DIM}${commaFixes} trailing comma(s) added where a new entry needed one${RESET}`)
  }

  const after = buildReport()
  line()
  if (after.actionable.length) {
    line(`  ${!after.actionable.length ? '' : '!'} still unregistered: ${after.actionable.length}`)
    for (const page of after.actionable) line(`    ! ${page.relative}`)
  } else {
    line(`  ${mark(true)} every review page is now registered`)
  }
  line()
  line(`  ${DIM}changes are unstaged — review with "git diff", build with "npm run docs:build".${RESET}`)
  line()
  return 0
}
