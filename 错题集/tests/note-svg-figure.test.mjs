import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (rel) => readFileSync(join(root, rel), 'utf8')

let failed = 0
const check = (ok, msg) => { if (!ok) { console.error('FAIL: ' + msg); failed++ } else { console.log('PASS: ' + msg) } }

const app = read('ebbinghaus/app.js')
check(app.includes('isSvg=/^```svg/i'), 'mdToHtml must parse ```svg blocks')
check(app.includes('svg-figure'), 'mdToHtml must emit svg-figure div')
check(app.includes('katex.render(tex,span'), 'openNote must fallback-render multiline $$ blocks via KaTeX')

const html = read('ebbinghaus/index.html')
check(html.includes('.note-body .svg-figure'), 'note modal must style svg-figure blocks')

const md = read('高等数学/旋转体体积正弦曲线错题.md')
const svgCount = (md.match(/```svg/g) || []).length
const fences = (md.match(/^```/gm) || []).length
check(svgCount >= 6, 'rotvol note must embed 6+ ```svg figures (5 formulas + 1 overview)')
check(fences % 2 === 0, 'all code fences must be balanced')
check((md.match(/^\*\*推导\*\*/gm) || []).length === 5, 'each of 5 formulas must have detailed derivation')
check((md.match(/^#### [①②③④⑤]/gm) || []).length === 5, 'all 5 volume formulas must have their own section')
const mdN = md.replace(/\r\n/g, '\n')
const svgBlocks = mdN.split(/```svg\n/).slice(1).map(s => s.split(/```\n/)[0])
check(svgBlocks.length === svgCount && svgBlocks.every(b => /<svg[^>]*viewBox/.test(b) && b.trim().endsWith('</svg>')), 'each svg block must carry viewBox and close properly')
check(md.includes('## 考研速记规律'), 'rotvol note must include exam-speed pattern section')
check((md.match(/^### 规律 \d/gm) || []).length >= 6, 'exam patterns must cover at least 6 rules')
check(md.includes('## 考研常考旋转体题型汇总'), 'rotvol note must include exam-type summary table')
check(md.includes('#### ⑤ 绕任意直线'), 'rotvol note must cover rotated-around-arbitrary-line formulas')
check(md.includes('Pappus 定理'), 'rotvol note must cover Pappus theorem for torus')
check(md.includes('怎么选 ② 还是 ③'), 'rotvol note must explain disc-vs-shell selection rule')

const caption = md.split(/\r?\n/).find(l => l.includes('图中蓝色区域')) || ''
const goodDv = String.raw`$\mathrm{d}V=\pi r^{2}\,\mathrm{d}x$`
check(caption.includes(goodDv), 'figure caption must keep single-backslash LaTeX commands')
const broken = [
  String.raw`$r=sin x+1$`,
  String.raw`$x=pi/2$`,
  String.raw`$mathrm{d}V=pi r^{2},mathrm{d}x$`,
  '[0,pi]',
]
check(broken.every(b => !caption.includes(b)), 'caption must not contain broken slash-less LaTeX')

process.exit(failed ? 1 : 0)
