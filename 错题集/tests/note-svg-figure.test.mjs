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
check(app.includes("isFig3d=/^```fig3d/i"), 'mdToHtml must parse ```fig3d dynamic blocks')
check(app.includes("class Rot3d"), 'app must ship Rot3d interactive renderer')
check(app.includes("new Function('return '+s)"), 'fig3d must convert string arrow functions to callables')
check(app.includes("mountFig3d(body)"), 'openNote must mount fig3d canvases')

const html = read('ebbinghaus/index.html')
check(html.includes('.note-body .svg-figure'), 'note modal must style svg-figure blocks')
check(html.includes('.note-body .fig3d'), 'note modal must style fig3d canvas blocks')

const md = read('高等数学/旋转体体积正弦曲线错题.md')
const svgCount = (md.match(/```svg/g) || []).length
const fences = (md.match(/^```/gm) || []).length
check(svgCount >= 1, 'rotvol note must embed overview ```svg figure (formula sections use fig3d)')
check(fences % 2 === 0, 'all code fences must be balanced')
check((md.match(/^\*\*推导\*\*/gm) || []).length === 4, 'each of 4 formulas must have detailed derivation')
check((md.match(/^#### [①②③④]/gm) || []).length === 4, 'all 4 volume formulas must have their own section')
const svgBlocks = md.split(/```svg\n/).slice(1).map(s => s.split(/```\n/)[0])
check(svgBlocks.length === svgCount && svgBlocks.every(b => /<svg[^>]*viewBox/.test(b) && b.trim().endsWith('</svg>')), 'each svg block must carry viewBox and close properly')
const fig3dCount = (md.match(/```fig3d/g) || []).length
check(fig3dCount === 4, 'all 4 formula sections must carry one ```fig3d dynamic block')
const fig3dBlocks = md.split(/```fig3d\n/).slice(1).map(s => s.split(/```\n/)[0])
check(fig3dBlocks.length === 4 && fig3dBlocks.every(b => { try { const c = JSON.parse(b); return !!c.type } catch { return false } }), 'each fig3d block must be valid JSON with type')
check(fig3dBlocks.every(b => /"(f|g|y1|y2)":"[^"]*=>/.test(b)), 'fig3d functions must be serialisable arrow strings')

process.exit(failed ? 1 : 0)
