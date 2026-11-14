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
check(html.includes('/api/answer'), 'wrong answers must be reported to server')
check(html.includes('./knowledge.json'), 'study view must load knowledge base')
check(html.includes('function renderStudy('), 'study view must render before quiz')
check(html.includes('function latestItemQuestions('), 'quiz must show only the newest item')
check(html.includes('questions = latestItemQuestions(all)'), 'quiz must filter questions to newest itemId')
check(html.includes('function renderSwitcher('), 'quiz must offer a knowledge-point switcher')
check(html.includes('nextItemBtn'), 'switcher must provide a next-item button')
check(html.includes('function loadItem('), 'switcher must reset round state on load')
check(html.includes('renderStudy(entry)'), 'study view must run before every question')
check(html.includes('根因分析'), 'study view must show root cause analysis')
check(html.includes('完整知识点梳理'), 'study view must show full knowledge summary')
check(html.includes('我已阅读，开始答题'), 'study view must require confirmation before quiz')
check(Array.isArray(questions) && questions.length >= 5, 'at least 5 questions')
check(questions.every(q => typeof q.itemId === 'string' && q.itemId.length > 0), 'each question must link to knowledge item')

const ids = new Set()
const subjects = new Set(['数据结构','计算机组成原理','操作系统','计算机网络','高等数学','英语'])
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

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1) }
console.log(`Quiz validation passed: ${questions.length} question(s).`)
