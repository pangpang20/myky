import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const html = readFileSync(join(root, 'quiz', 'index.html'), 'utf8')
const questions = JSON.parse(readFileSync(join(root, 'quiz', 'questions.json'), 'utf8'))

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } }

check(html.includes('单选题点击选项即判分'), 'page must explain single-choice instant judging')
check(html.includes('多选题勾选后'), 'page must explain multi-choice submit button')
check(html.includes("q.type === 'single'"), 'page must branch on single type')
check(html.includes('submitBtn.disabled'), 'multi-choice must gate submit button')
check(html.includes('Object.keys(q.options).sort()'), 'options must render in A/B/C/D order')
check(html.includes('已记入错题集'), 'wrong answers must be recorded')
check(Array.isArray(questions) && questions.length >= 5, 'at least 5 questions')

const ids = new Set()
const subjects = new Set(['数据结构','计算机组成原理','操作系统','计算机网络'])
for (const q of questions) {
  check(typeof q.id === 'string' && q.id.length > 0, 'question id required')
  check(!ids.has(q.id), `duplicate id ${q.id}`)
  ids.add(q.id)
  check(subjects.has(q.subject), `unknown subject ${q.subject}`)
  check(q.type === 'single' || q.type === 'multi', `bad type ${q.type}`)
  const letters = Object.keys(q.options || {})
  check(letters.length === 4, `${q.id} must have 4 options`)
  if (q.type === 'single') {
    check(typeof q.answer === 'string' && letters.includes(q.answer), `${q.id} single answer invalid`)
  } else {
    check(Array.isArray(q.answer) && q.answer.length > 1, `${q.id} multi answer invalid`)
    check(q.answer.every(a => letters.includes(a)), `${q.id} multi answer letter invalid`)
  }
  check(typeof q.analysis === 'string' && q.analysis.length > 10, `${q.id} analysis too short`)
}
check(questions.some(q => q.type === 'multi'), 'must include at least one multi-choice question')

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1) }
console.log(`Quiz validation passed: ${questions.length} question(s).`)