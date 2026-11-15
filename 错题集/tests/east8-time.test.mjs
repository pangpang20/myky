import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isoEast8, dateEast8 } from '../lib/east8-time.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (rel) => readFileSync(join(root, rel), 'utf8')

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } }

check(isoEast8(new Date('2026-11-14T10:22:00Z')) === '2026-11-14T18:22:00', 'isoEast8 must add 8h to UTC')
check(dateEast8(new Date('2026-11-14T16:00:30Z')) === '2026-11-15', 'dateEast8 must roll to next day after 16:00 UTC')
check(dateEast8(new Date('2026-11-14T15:59:59Z')) === '2026-11-14', 'dateEast8 must stay same day before 16:00 UTC')

const reg = read('scripts/register-wrong-question.mjs')
check(!reg.includes('new Date().toISOString().slice(0, 10)'), 'register script must not derive dates from UTC')
check(reg.includes('isoEast8()'), 'register script must write east8 createdAt')
check(reg.includes('INSERT OR IGNORE INTO items'), 'register script must insert items into SQLite')
check(reg.includes('.run(p.itemId, p.subject, p.file, today, due, isoEast8())'), 'SQLite insert must carry east8 createdAt')

const srv = read('ebbinghaus/server.js')
check(!srv.includes('new Date().toISOString().slice(0, 10)'), 'ebbinghaus server must not derive today from UTC')
check(srv.includes('function todayEast8()'), 'ebbinghaus server must use east8 today')

const app = read('ebbinghaus/app.js')
check(app.includes("8*3600*1000") && app.includes("+08:00"), 'ebbinghaus answer timestamps must carry +08:00 offset')

const quiz = read('quiz/index.html')
check(quiz.includes("8*3600*1000") && quiz.includes("+08:00"), 'quiz answer timestamps must carry +08:00 offset')

const { execSync } = await import('node:child_process')
const sqliteOut = execSync(
  'node -e "const Database=require(\'./scripts/node_modules/better-sqlite3\');const db=new Database(\'data/ky.db\');' +
  'console.log(JSON.stringify(db.prepare(\'SELECT createdAt FROM items\').all()))"',
  { cwd: root }
).toString()
const sqliteItems = JSON.parse(sqliteOut)
check(sqliteItems.every(it => /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(it.createdAt) && !it.createdAt.endsWith('Z')), 'all SQLite createdAt must be naive east8 local strings')

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1) }
console.log('East8 time validation passed.')
