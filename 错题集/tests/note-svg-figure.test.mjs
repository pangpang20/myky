import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (rel) => readFileSync(join(root, rel), 'utf8')

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } else { console.log('PASS: ' + msg) } }

const app = read('ebbinghaus/app.js')
check(app.includes("isSvg=/^```svg/i"), 'mdToHtml must parse ```svg blocks')
check(app.includes("svg-figure"), 'mdToHtml must emit svg-figure div')

const html = read('ebbinghaus/index.html')
check(html.includes('.note-body .svg-figure'), 'note modal must style svg-figure blocks')

const md = read('高等数学/旋转体体积正弦曲线错题.md')
const svgCount = (md.match(/```svg/g) || []).length
const fences = (md.match(/^```/gm) || []).length
check(svgCount >= 5, 'rotvol note must embed 5 ```svg 3d figures (4 formulas + 1 overview)')
check(fences % 2 === 0, 'all code fences must be balanced')
check((md.match(/^\*\*推导\*\*/gm) || []).length === 4, 'each of 4 formulas must have detailed derivation')
check((md.match(/^#### [①②③④]/gm) || []).length === 4, 'all 4 volume formulas must have their own section')
const svgBlocks = md.split(/```svg\n/).slice(1).map(s => s.split(/```\n/)[0])
check(svgBlocks.length === svgCount && svgBlocks.every(b => /<svg[^>]*viewBox/.test(b) && b.trim().endsWith('</svg>')), 'each svg block must carry viewBox and close properly')

process.exit(failed ? 1 : 0)
