import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const subjects = ['数据结构', '计算机组成原理', '操作系统', '计算机网络']
const requiredHeadings = ['## 错题信息', '## 根因分析', '## 完整知识点梳理', '## 复刷清单', '## 复习记录']
const wrongBookFields = ['科目：', '我的答案：', '正确答案：']
const wrongBookExercises = ['### 举一反三 5 题', '### 历年真题风格练习']

let checked = 0

for (const subject of subjects) {
  const subjectDir = join(root, subject)
  if (!statSync(subjectDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Missing subject directory: ${subject}`)
  }

  for (const name of readdirSync(subjectDir)) {
    if (!name.endsWith('.md')) continue
    const file = join(subjectDir, name)
    const text = readFileSync(file, 'utf8')
    checked += 1

    for (const heading of requiredHeadings) {
      if (!text.includes(heading)) throw new Error(`${file}: missing ${heading}`)
    }
    for (const field of wrongBookFields) {
      if (!text.includes(field)) throw new Error(`${file}: missing ${field}`)
    }
    for (const heading of wrongBookExercises) {
      if (!text.includes(heading)) throw new Error(`${file}: missing ${heading}`)
    }
  }
}

console.log(`Wrong-book validation passed: ${checked} file(s).`)
