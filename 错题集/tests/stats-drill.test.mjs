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
check(app.includes('function toggleCurve()'), 'memory curve must be collapsible')
check(html.includes('class="section collapsed" id="curveSection"'), 'memory curve must default to collapsed')
check(app.includes('function renderTrend()'), 'trend chart must render')
check(app.includes("keyOf=d=>trendMode==='month'?d.slice(0,7):d"), 'trend must aggregate by month when selected')
check(app.includes('for(let i=6;i>=0;i--)'), 'day view must default to last 7 days')
check(app.includes('for(let i=5;i>=0;i--)'), 'month view must default to last 6 months')
check(app.includes('function smoothPath(pts)'), 'smoothPath must be defined for trend curves')
check(/function smoothPath\(pts\)\{[\s\S]*?return d;/.test(app), 'smoothPath must return a path string')
check(!read('data/db.json').includes('"roundId": "t1"'), 'legacy t1 test answers must be removed')
check(app.includes('kp:sums[k]?sums[k].kp:0'), 'trend must include knowledge-point series')
check(app.includes('q:sums[k]?sums[k].q:0'), 'trend must include question-count series')
check(read('ebbinghaus/index.html').includes('新增知识点')&&read('ebbinghaus/index.html').includes('新增题数'), 'legend must label knowledge points and question counts')
check(app.includes('filter id="trendShadow"'), 'trend curves must have drop-shadow filter')
check(app.includes('filter="url(#trendShadow)"'), 'curve paths must reference the shadow filter')
check(!app.includes("stroke-dasharray='7 5'"), 'all trend lines must be solid')
check(app.includes('animateMotion'), 'trend must animate runner dots along each line')
check(/for\(let k=0;k<4;k\+\+\)/.test(app), 'each line must have 4 runner dots')
check(app.includes('dur="2.4s"'), 'runner animation must be fast (2.4s loop)')
check(app.includes('class="trend-runner"'), 'runner dots must use trend-runner class')
check(html.includes('trendSvg'), 'trend svg must exist')
check(html.includes('按日')&&html.includes('按月'), 'trend must offer day/month toggle')
check(html.includes('--cyan:#22d3ee'), 'cyan color must be defined in dark theme')

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1) }
console.log('Stats drill validation passed.')
