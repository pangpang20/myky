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

const md = read('高等数学/旋转体体积正弦曲线错题.md'.replace('高等数学', '高等数学'))
check(md.includes('```svg'), 'rotvol note must embed ```svg 3d figure')
check(/<svg[^>]*viewBox/.test(md), 'embedded svg must carry viewBox')
check((md.match(/```svg/g) || []).length === (md.match(/^```$/gm) || []).length / 2, 'svg fence must be balanced')

process.exit(failed ? 1 : 0)
