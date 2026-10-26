import type { EngineInterface, Register } from 'claude-code'

type Engine = EngineInterface

// Tageswerte je Projekt, im Speicher unter "t:<Tag>:<Projekt>"
export type Day = { aktiv: number; turns: number; tokens: number; sitzungen: number }
export type Row = { tag: string; projekt: string; day: Day }

const PREFIX = 't:'
const EMPTY = (): Day => ({ aktiv: 0, turns: 0, tokens: 0, sitzungen: 0 })

// ---------------------------------------------------------------------------
// Formate
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-')
  return `${d}.${m}.${y}`
}

// Stunden:Minuten (1:05), unter einer Minute mit Sekunden (0:42 min)
export function hm(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `0:${pad(s)} min`
  const m = Math.round(s / 60)
  return `${Math.floor(m / 60)}:${pad(m % 60)} h`
}

export function num(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Montag 00:00 der Woche, in der ms liegt
export function weekStart(ms: number): number {
  const d = new Date(ms)
  const back = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime()
}

function projectOf(cwd: string): string {
  return cwd.replace(/\/+$/, '').split('/').pop() || cwd || 'ohne Namen'
}

// ---------------------------------------------------------------------------
// Speicher
// ---------------------------------------------------------------------------

async function load($: Engine, key: string): Promise<Day> {
  const v = (await $.store.get(key)) as Partial<Day> | undefined
  return { ...EMPTY(), ...(v && typeof v === 'object' ? v : {}) }
}

async function add($: Engine, now: number, project: string, delta: Partial<Day>): Promise<void> {
  const key = `${PREFIX}${dayKey(now)}:${project}`
  const cur = await load($, key)
  for (const k of Object.keys(delta) as (keyof Day)[]) cur[k] += delta[k] ?? 0
  await $.store.set(key, cur)
}

async function rows($: Engine): Promise<Row[]> {
  const out: Row[] = []
  for (const key of await $.store.keys()) {
    if (!key.startsWith(PREFIX)) continue
    const rest = key.slice(PREFIX.length)
    const tag = rest.slice(0, 10)
    const projekt = rest.slice(11)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || !projekt) continue
    out.push({ tag, projekt, day: await load($, key) })
  }
  return out
}

async function prune($: Engine, now: number, days: number): Promise<void> {
  const limit = dayKey(now - days * 86_400_000)
  for (const key of await $.store.keys()) {
    if (key.startsWith(PREFIX) && key.slice(PREFIX.length, PREFIX.length + 10) < limit) {
      await $.store.delete(key)
    }
  }
}

// ---------------------------------------------------------------------------
// Auswertung
// ---------------------------------------------------------------------------

export function sum(list: Row[]): Day {
  const t = EMPTY()
  for (const r of list) for (const k of Object.keys(t) as (keyof Day)[]) t[k] += r.day[k]
  return t
}

export function perProject(list: Row[]): [string, Day][] {
  const m = new Map<string, Row[]>()
  for (const r of list) m.set(r.projekt, [...(m.get(r.projekt) ?? []), r])
  return [...m.entries()]
    .map(([p, rs]) => [p, sum(rs)] as [string, Day])
    .filter(([, d]) => d.aktiv > 0 || d.turns > 0)
    .sort((a, b) => b[1].aktiv - a[1].aktiv)
}

export function line(label: string, d: Day): string {
  const n = d.sitzungen > 0 ? `, ${d.sitzungen} ${d.sitzungen === 1 ? 'Sitzung' : 'Sitzungen'}` : ''
  return `${label}: ${hm(d.aktiv)} aktiv, ${d.turns} Antworten, ${num(d.tokens)} Tokens${n}`
}

export type Session = { project: string; startedAt: number; active: number; turns: number; tokens: number }

export function overview(s: Session, now: number, all: Row[]): string {
  const today = dayKey(now)
  const ws = dayKey(weekStart(now))
  const todayRows = all.filter(r => r.tag === today)
  const weekRows = all.filter(r => r.tag >= ws)
  const total = now - s.startedAt
  const share = total > 0 ? Math.round((s.active / total) * 100) : 0
  const lines = [
    `Zeitprotokoll, Projekt "${s.project}"`,
    `Sitzung: läuft seit ${hm(total)}, davon Claude am Arbeiten ${hm(s.active)} (${share} %), ${s.turns} Antworten, ${num(s.tokens)} Tokens`,
    line('Heute', sum(todayRows)),
    line('Diese Woche', sum(weekRows)),
  ]
  const top = perProject(weekRows).slice(0, 5)
  if (top.length) {
    lines.push('Diese Woche je Projekt:')
    for (const [p, d] of top) lines.push(`  ${p}: ${hm(d.aktiv)}, ${d.turns} Antworten`)
  }
  return lines.join('\n')
}

export function table(title: string, list: Row[], withDays: boolean): string {
  if (!list.length) return `${title}: noch nichts erfasst.`
  const lines = [title]
  if (withDays) {
    const days = [...new Set(list.map(r => r.tag))].sort()
    for (const d of days) lines.push(`  ${dayLabel(d)}: ${hm(sum(list.filter(r => r.tag === d)).aktiv)}`)
  }
  for (const [p, d] of perProject(list)) {
    lines.push(`  ${p}: ${hm(d.aktiv)} aktiv, ${d.turns} Antworten, ${num(d.tokens)} Tokens`)
  }
  lines.push(`  Zusammen: ${hm(sum(list).aktiv)} aktiv`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Protokolldatei
// ---------------------------------------------------------------------------

const HEADER = '| Datum | Projekt | Aktiv | Antworten | Tokens |\n|---|---|---|---|---|\n'

async function append($: Engine, file: string, now: number, s: Session, d: Day): Promise<string> {
  let text = ''
  try {
    text = String(await $.fs.read(file))
  } catch {
    text = `# Zeitprotokoll\n\n${HEADER}`
  }
  if (!text.endsWith('\n')) text += '\n'
  const row = `| ${dayLabel(dayKey(now))} | ${s.project} | ${hm(d.aktiv)} | ${d.turns} | ${num(d.tokens)} |\n`
  await $.fs.write(file, text + row)
  return row.trim()
}

// ---------------------------------------------------------------------------

export const register: Register = (on, options) => {
  const fileName = String(options.datei || 'zeitprotokoll.md')
  const keepDays = Number(options.behalte_tage) > 0 ? Number(options.behalte_tage) : 90

  const s: Session = { project: 'ohne Namen', startedAt: 0, active: 0, turns: 0, tokens: 0 }
  let cwd = ''
  let turnStart: number | null = null
  let written: Day = EMPTY()

  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    cwd = e.cwd
    s.project = projectOf(e.cwd)
    s.startedAt = now
    await add($, now, s.project, { sitzungen: 1 })
    await prune($, now, keepDays)
    try {
      await $.command.register({
        name: 'zeit',
        description: 'Arbeitszeit von Claude: Sitzung, heute, Woche',
        argumentHint: '[heute|woche|schreiben]',
      })
    } catch {
      // ohne Befehl läuft die Zeitmessung trotzdem
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) turnStart = await $.clock.now()
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && turnStart !== null) {
      const now = await $.clock.now()
      const dur = Math.max(0, now - turnStart)
      const u = e.usage
      const tokens = u ? u.input_tokens + u.output_tokens + u.cache_creation_input_tokens : 0
      turnStart = null
      s.active += dur
      s.turns += 1
      s.tokens += tokens
      await add($, now, s.project, { aktiv: dur, turns: 1, tokens })
    }
    return next(e)
  })

  on('command.run', { command: 'zeit' }, async ($, e) => {
    const now = await $.clock.now()
    const want = (e.args ?? '').trim().toLowerCase()
    const all = await rows($)
    if (want === 'heute') {
      return { text: table(`Heute, ${dayLabel(dayKey(now))}`, all.filter(r => r.tag === dayKey(now)), false) }
    }
    if (want === 'woche') {
      const ws = dayKey(weekStart(now))
      return { text: table(`Diese Woche (ab ${dayLabel(ws)})`, all.filter(r => r.tag >= ws), true) }
    }
    if (want === 'schreiben') {
      const delta: Day = {
        ...EMPTY(),
        aktiv: s.active - written.aktiv,
        turns: s.turns - written.turns,
        tokens: s.tokens - written.tokens,
      }
      if (delta.turns === 0) return { text: 'Seit dem letzten Eintrag gibt es nichts Neues zu schreiben.' }
      const path = fileName.startsWith('/') ? fileName : `${cwd.replace(/\/+$/, '')}/${fileName}`
      const row = await append($, path, now, s, delta)
      written = { ...EMPTY(), aktiv: s.active, turns: s.turns, tokens: s.tokens }
      return { text: `In ${path} ergänzt:\n${row}` }
    }
    if (want) return { text: `Unbekannt: "${want}". Möglich: heute, woche, schreiben` }
    return { text: overview(s, now, all) }
  })
}
