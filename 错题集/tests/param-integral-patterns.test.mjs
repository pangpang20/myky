import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const md = readFileSync(join(root, '高等数学', '含参数三角有理式积分错题.md'), 'utf8')

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } else { console.log('PASS: ' + msg) } }

check(md.includes('## 考研速记规律（一看就会）'), 'param-integral note must have exam-speed section')
check(md.includes('### 规律 6：与相邻题型的边界'), 'boundary table must be promoted into a speed rule')
check(md.includes('平方和出'), 'speed rule must carry the boundary mnemonic')
check((md.match(/^### 规律 \d/gm) || []).length >= 6, 'param-integral speed patterns must have >= 6 rules')
check(md.includes(String.raw`\ln\left|\frac{at-b}{at+b}\right|`), 'speed rule must state the log result for squared-difference case')
check(md.includes(String.raw`\arctan\frac{at}{b}`), 'speed rule must state arctan result for squared-sum case')
check(md.includes('## 复刷清单'), 'note must keep its exercise list')

process.exit(failed ? 1 : 0)
