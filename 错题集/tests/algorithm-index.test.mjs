import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const indexFile = `${repo}doc/数据结构算法模型与历年真题索引.md`
const text = readFileSync(indexFile, 'utf8')

let errors = 0
const fail = (msg) => { console.log(`FAIL: ${msg}`); errors++ }

// 1. 索引必须包含五个一级栏目
for (const heading of ['## 一、数组与线性表算法', '## 二、链表算法', '## 三、查找与排序算法', '## 四、树与图的算法', '## 五、历年算法设计题主线', '## 六、其他常考算法']) {
  if (!text.includes(heading)) fail(`missing section: ${heading}`)
}

// 2. 所有相对链接必须指向真实存在的文件
const links = [...text.matchAll(/\]\((\.\.\/错题集\/数据结构\/[^)]+)\)/g)].map((m) => m[1])
if (links.length === 0) fail('no错题档案 links found')
for (const rel of links) {
  const abs = `${repo}doc/${rel}`.replace(/\//g, '\\')
  if (!existsSync(abs)) fail(`broken link: ${rel}`)
}

// 3. 标注「✅」的行，其链接必须存在；标注「未收录」的行不得带链接
for (const line of text.split('\n')) {
  const hasCheck = line.includes('✅')
  const lineLinks = [...line.matchAll(/\]\((\.\.\/错题集\/数据结构\/([^)]+))\)/g)]
  if (hasCheck && lineLinks.length === 0) fail(`✅ row without档案 link: ${line.slice(0, 60)}`)
  if (line.includes('未收录') && lineLinks.length > 0) fail(`未收录 row with link: ${line.slice(0, 60)}`)
  for (const [, , name] of lineLinks) {
    if (!existsSync(`${repo}错题集/数据结构/${name}`)) fail(`missing档案: ${name}`)
  }
}

// 4. 已收录题目数必须与实际 ✅ 行数一致
const claimed = text.match(/\*\*已收录 (\d+) \/ (\d+) 题\*\*/)
if (!claimed) fail('missing 已收录 X / Y 题 summary')
else {
  const actual = (text.match(/✅/g) || []).length
  if (Number(claimed[1]) !== actual) fail(`summary says ${claimed[1]} but found ${actual} ✅ marks`)
}

if (errors) { console.log(`Index validation failed: ${errors} error(s).`); process.exit(1) }
console.log(`Index validation passed: ${links.length} link(s), ${(text.match(/✅/g) || []).length} recorded question(s).`)
