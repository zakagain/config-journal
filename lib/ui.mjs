import readline from 'node:readline'
import { createInterface } from 'node:readline/promises'

const CURSOR_HIDE = '\x1B[?25l'
const CURSOR_SHOW = '\x1B[?25h'
const CLEAR_DOWN = '\x1B[0J'
const colour = Boolean(process.stdout.isTTY) && process.env.NO_COLOR !== '1'
const paint = (code) => (colour ? code : '')
export const DIM = paint('\x1B[2m')
export const RESET = paint('\x1B[0m')

export function line(text = '') {
  process.stdout.write(`${text}\n`)
}

export function heading(text) {
  line()
  line(`  ${text}`)
  line()
}

export function createPrompter() {
  const queued = []
  const waiting = []
  let rl = null

  const open = () => {
    if (rl) return
    rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdin.isTTY)
    })
    rl.on('line', (value) => {
      if (waiting.length) waiting.shift()(value)
      else queued.push(value)
    })
    rl.on('close', () => {
      while (waiting.length) waiting.shift()(null)
    })
  }

  return {
    ask(query = '') {
      if (queued.length) {
        if (query) process.stdout.write(query)
        return Promise.resolve(queued.shift())
      }
      open()
      if (process.stdin.isTTY) {
        rl.setPrompt(query)
        rl.prompt()
      } else {
        process.stdout.write(query)
      }
      return new Promise((resolve) => waiting.push((value) => resolve(value ?? '')))
    },
    close() {
      if (rl) rl.close()
    }
  }
}

function repaint(rows, height) {
  const up = height > 0 ? `\x1B[${height}A` : ''
  process.stdout.write(`${up}${CLEAR_DOWN}${rows.join('\n')}\n`)
}

export function arrowList({ prompt, items, multi = true, initial = [] }) {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin)
    const wasRaw = process.stdin.isRaw === true
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdout.write(CURSOR_HIDE)

    let cursor = 0
    let height = 0
    const picked = new Set(initial)

    const rows = () => [
      '',
      `  ${prompt}`,
      ''
    ]

    const draw = () => {
      const out = rows()
      items.forEach((item, at) => {
        const mark = multi ? (picked.has(at) ? '◉' : '○') : at === cursor ? '●' : '○'
        const detail = item.detail ? `  ${DIM}${item.detail}${RESET}` : ''
        out.push(`   ${mark} ${String(at + 1).padStart(2)}. ${item.label}${detail}`)
      })
      const keys = multi
        ? '↑/↓ move · space toggle · a all · enter confirm · q cancel'
        : '↑/↓ move · enter confirm · q cancel'
      out.push('', `  ${DIM}${keys}${RESET}`)
      repaint(out, height)
      height = out.length
    }

    const finish = (value) => {
      process.stdin.off('keypress', onKey)
      process.stdin.setRawMode(wasRaw)
      if (!wasRaw) process.stdin.pause()
      process.stdout.write(`${CURSOR_SHOW}\n`)
      resolve(value)
    }

    const onKey = (_char, key = {}) => {
      if (key.name === 'return' || key.name === 'enter') {
        if (multi) return finish([...picked].sort((a, b) => a - b))
        return finish([cursor])
      }
      if ((key.ctrl && key.name === 'c') || key.name === 'q' || key.name === 'escape') {
        return finish(null)
      }
      if (key.name === 'up' || key.name === 'k') cursor = (cursor - 1 + items.length) % items.length
      else if (key.name === 'down' || key.name === 'j') cursor = (cursor + 1) % items.length
      else if (key.name === 'home') cursor = 0
      else if (key.name === 'end') cursor = items.length - 1
      else if (multi && key.name === 'space') {
        if (picked.has(cursor)) picked.delete(cursor)
        else picked.add(cursor)
      } else if (multi && key.name === 'a') {
        if (picked.size === items.length) picked.clear()
        else items.forEach((_, at) => picked.add(at))
      } else return
      draw()
    }

    process.stdin.on('keypress', onKey)
    draw()
  })
}

export async function numberedList(prompter, { prompt, items, multi = true }) {
  line()
  line(`  ${prompt}`)
  line()
  items.forEach((item, at) => {
    line(`   ${String(at + 1).padStart(2)}. ${item.label}${item.detail ? `  ${item.detail}` : ''}`)
  })
  line()
  line(
    `  ${multi ? 'Numbers separated by spaces or commas, "a" for all, or "q" to cancel.' : 'A single number, or "q" to cancel.'}`
  )
  const answer = (await prompter.ask('  > ')).trim()
  if (!answer || answer.toLowerCase() === 'q') return null
  if (multi && answer.toLowerCase() === 'a') return items.map((_, at) => at)
  const picked = []
  for (const token of answer.split(/[\s,]+/)) {
    const at = Number.parseInt(token, 10)
    if (Number.isInteger(at) && at >= 1 && at <= items.length) picked.push(at - 1)
  }
  if (!picked.length) {
    line(`  ${DIM}Nothing recognised — nothing selected.${RESET}`)
    return null
  }
  return [...new Set(picked)].sort((a, b) => a - b)
}

export async function editText(prompter, current) {
  const answer = (
    await prompter.ask(`     ${DIM}enter to accept, or type to change${RESET} [${current}] > `)
  ).trim()
  return answer || current
}

export async function confirm(prompter, question, defaultYes = false) {
  const hint = defaultYes ? 'Y/n' : 'y/N'
  const answer = (await prompter.ask(`  ${question} ${DIM}[${hint}]${RESET} `))
    .trim()
    .toLowerCase()
  if (!answer) return defaultYes
  return answer === 'y' || answer === 'yes'
}

export async function pause() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await rl.question(`\n  ${DIM}press enter to exit${RESET} `)
  rl.close()
}
