import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const agents = readFileSync(join(root, '../AGENTS.md'), 'utf8')

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } else { console.log('PASS: ' + msg) } }

check(agents.includes('考研速记规律规则'), 'AGENTS.md must require exam-speed patterns for all subjects')
check(agents.includes('## 考研速记规律（一看就会）'), 'AGENTS.md must pin the exact section title')
check(agents.includes('所有科目、所有知识点'), 'rule must cover all subjects and all knowledge points')
check(agents.includes('至少 3 条规律'), 'rule must set minimum pattern count')
check(agents.includes('英语类知识点'), 'rule must cover English reading-type patterns')

process.exit(failed ? 1 : 0)
