import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (rel) => readFileSync(join(root, rel), 'utf8')

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } }

const app = read('ebbinghaus/app.js')
const html = read('ebbinghaus/index.html')

check(app.includes('const totalQ=QS.length'), 'stats must include total question count')
check(app.includes('drillQuestions()'), 'total questions must drill down by subject')
check(app.includes('drillStatus(') && app.includes("'due'"), 'due count must be clickable')
check(app.includes("drillStatus(\\'learning\\')"), 'learning count must be clickable')
check(app.includes("drillStatus(\\'mastered\\')"), 'mastered count must be clickable')
check(app.includes('drillAnswersByDay()'), 'answers must drill down by day')
check(app.includes('function filterTable('), 'drill rows must support filtering main table')
check(app.includes("map[q.subject]=(map[q.subject]||0)+1"), 'questions must aggregate by subject')
check(app.includes('String(a.at||' + String.fromCharCode(39,39) + ').slice(0,10)'), 'answers must aggregate by date prefix')
check(html.includes('drillModal'), 'drill modal markup must exist')
check(html.includes('.modal-mask.open{display:flex}'), 'modal must be toggleable via class')
check(html.includes('.stat.cyan{color:var(--cyan)}'), 'cyan color variable must be defined for total card')
check(html.includes('--cyan:#22d3ee'), 'cyan color must be defined in dark theme')

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1) }
console.log('Stats drill validation passed.')
