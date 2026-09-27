#!/usr/bin/env node
import { main } from './lib/run.mjs'
import { arrowList, confirm, createPrompter, editText, line, pause } from './lib/ui.mjs'

const argv = process.argv.slice(2)

if (argv.includes('--help') || argv.includes('-h')) {
  line('')
  line('  usage: npm run sync [--audit] [--dry-run]')
  line('')
  line('    --audit    report what is unregistered and exit, changing nothing')
  line('    --dry-run  run the full flow, print the diff, write nothing')
  line('')
  process.exit(0)
}

const prompter = createPrompter()

const ui = {
  select: (options) => arrowList(options),
  askText: (current) => editText(prompter, current),
  confirm: (question, defaultYes) => confirm(prompter, question, defaultYes)
}

const code = await main({
  ui,
  dryRun: argv.includes('--dry-run'),
  auditOnly: argv.includes('--audit')
})

prompter.close()
if (process.stdin.isTTY) await pause()
process.exit(code)
