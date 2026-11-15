#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { dateEast8, isoEast8 } from '../lib/east8-time.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

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
  "quizQuestions": [ { "id": "ds-n1", "topic": "...", "type": "single", "question": "...", "options": {...}, "answer": "D", "analysis": "...", "itemId": "..." } ],
  "examQuestions": [ { "topic": "...", "question": "...（历年真题风格）", "options": {...}, "answer": "A", "analysis": "..." } ]
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
// (4318 runtime reads SQLite data/ky.db directly; legacy db.json no longer written)

// 1b. SQLite (4318 runtime source of truth, server reads data/ky.db)
{
  const dbPath = new URL('../data/ky.db', import.meta.url).pathname
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/%E9%94%99%E9%A2%98%E9%9B%86/g, '错题集')
  const sqlite = new Database(dbPath)
  sqlite.exec(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY, subject TEXT NOT NULL, file TEXT NOT NULL,
    firstLearned TEXT, status TEXT NOT NULL DEFAULT 'learning',
    round INTEGER NOT NULL DEFAULT 1, dueDate TEXT, createdAt TEXT
  )`)
  const inserted = sqlite.prepare(`INSERT OR IGNORE INTO items (id, subject, file, firstLearned, status, round, dueDate, createdAt)
    VALUES (?, ?, ?, ?, 'learning', 1, ?, ?)`).run(p.itemId, p.subject, p.file, today, due, isoEast8())
  sqlite.close()
  if (inserted.changes) console.log(`SQLite: inserted "${p.itemId}" into data/ky.db`)
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
for (const q of p.ebbinghausQuestions) {
  const id = `r1-${randomUUID()}`
  if (!dsq.questions.some(x => x.itemId === p.itemId && x.question === q.question)) {
    dsq.questions.push({ id, itemId: p.itemId, round: 1, subject: p.subject, ...q })
  }
}
write(dsqPath, dsq)

// 4. Quiz knowledge.json (4317 study view)
const qkb = read('../quiz/knowledge.json')
qkb[p.itemId] = { knowledge: p.knowledge, mnemonic: p.mnemonic, keyPoints: p.keyPoints, rootCauses: p.rootCauses }
write('../quiz/knowledge.json', qkb)

// 4b. Ebbinghaus exam-style questions (真题风格练习 also go to both ends)
if (Array.isArray(p.examQuestions)) {
  const exq = read(dsqPath)
  for (const q of p.examQuestions) {
    if (!exq.questions.some(x => x.itemId === p.itemId && x.question === q.question)) {
      exq.questions.push({ id: `r1-${randomUUID()}`, itemId: p.itemId, round: 1, subject: p.subject, ...q })
    }
  }
  write(dsqPath, exq)
}

// 5. Quiz questions.json (4317 practice) — newest first
{
  const quiz = read('../quiz/questions.json')
  const existingIds = new Set(quiz.map(q => q.id))
  const examFresh = (Array.isArray(p.examQuestions) ? p.examQuestions : []).map((q, i) => ({
    id: `hm-exam-${randomUUID().slice(0, 8)}`,
    topic: q.topic || p.ebbinghausQuestions[0]?.topic || '综合',
    type: 'single',
    ...q
  }))
  const fresh = [...(p.quizQuestions || []), ...examFresh]
    .filter(q => !existingIds.has(q.id))
    .map(q => ({ subject: p.subject, itemId: p.itemId, ...q }))
  write('../quiz/questions.json', [...fresh, ...quiz])
  if (examFresh.length) console.log(`Quiz: added ${examFresh.length} exam-style question(s)`)
}

console.log(`Registered "${p.itemId}": db item + knowledge + ${p.ebbinghausQuestions.length} round-1 questions + quiz sync.`)
