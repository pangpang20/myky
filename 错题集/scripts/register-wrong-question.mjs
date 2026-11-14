#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { dateEast8, isoEast8 } from '../lib/east8-time.mjs'

const usage = `Usage: node register-wrong-question.mjs <payload.json>
Payload schema:
{
  "itemId": "数据结构-三层嵌套求和循环",
  "subject": "数据结构",
  "file": "数据结构/三层嵌套求和循环复杂度错题.md",
  "knowledge": "…完整知识点梳理…",
  "mnemonic": "…记忆口诀…",
  "keyPoints": ["…"],
  "rootCauses": { "题组 topic": "根因说明" },
  "ebbinghausQuestions": [ { "topic": "...", "question": "...", "options": {...}, "answer": "A", "analysis": "..." } ],
  "quizQuestions": [ { "id": "ds-n1", "topic": "...", "type": "single", "question": "...", "options": {...}, "answer": "D", "analysis": "...", "itemId": "..." } ]
}`

const payloadPath = process.argv[2]
if (!payloadPath) { console.error(usage); process.exit(1) }

const p = JSON.parse(readFileSync(payloadPath, 'utf8'))
const root = new URL('..', import.meta.url).pathname.replace(/^\/(.*)\/$/, '$1')
const read = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'))
const write = (rel, data) => writeFileSync(new URL(rel, import.meta.url), JSON.stringify(data, null, 2) + '\n', 'utf8')

const today = dateEast8()
const due = dateEast8(new Date(Date.now() + 86400000))

// 1. Ebbinghaus db.json (4318 source of truth)
const db = read('../data/db.json')
if (!db.items.some(x => x.id === p.itemId)) {
  db.items.push({
    id: p.itemId, subject: p.subject, file: p.file,
    firstLearned: today, reviews: [], status: 'learning',
    round: 1, dueDate: due, createdAt: isoEast8()
  })
  write('../data/db.json', db)
}

// 2. Ebbinghaus knowledge.json
const kb = read('../ebbinghaus/knowledge.json')
kb[p.itemId] = {
  knowledge: p.knowledge, mnemonic: p.mnemonic,
  keyPoints: p.keyPoints, rootCauses: p.rootCauses
}
write('../ebbinghaus/knowledge.json', kb)

// 3. Ebbinghaus round-1 questions (subject-specific file)
const dsqPath = p.subject === '数据结构' ? '../ebbinghaus/ds-questions.json' : '../ebbinghaus/questions.json'
const dsq = read(dsqPath)
const baseNum = 1000 + dsq.questions.filter(q => q.itemId === p.itemId).length
let n = 0
for (const q of p.ebbinghausQuestions) {
  n += 1
  const id = `ds-r1-${String(baseNum + n).padStart(3, '0')}`
  if (!dsq.questions.some(x => x.itemId === p.itemId && x.topic === q.topic)) {
    dsq.questions.push({ id, itemId: p.itemId, round: 1, subject: p.subject, ...q })
  }
}
write(dsqPath, dsq)

// 4. Quiz knowledge.json (4317 study view)
const qkb = read('../quiz/knowledge.json')
qkb[p.itemId] = { knowledge: p.knowledge, mnemonic: p.mnemonic, keyPoints: p.keyPoints, rootCauses: p.rootCauses }
write('../quiz/knowledge.json', qkb)

// 5. Quiz questions.json (4317 practice) — newest first
if (p.quizQuestions?.length) {
  const quiz = read('../quiz/questions.json')
  const existingIds = new Set(quiz.map(q => q.id))
  const fresh = p.quizQuestions
    .filter(q => !existingIds.has(q.id))
    .map(q => ({ subject: p.subject, itemId: p.itemId, ...q }))
  write('../quiz/questions.json', [...fresh, ...quiz])
}

console.log(`Registered "${p.itemId}": db item + knowledge + ${p.ebbinghausQuestions.length} round-1 questions + quiz sync.`)
