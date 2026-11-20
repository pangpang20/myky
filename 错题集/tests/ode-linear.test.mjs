import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const note = readFileSync(join(root, '高等数学/一阶线性微分方程特解错题.md'), 'utf8');
const payload = read('scripts/payload-ode-linear.json');
const quizQuestions = read('quiz/questions.json');
const quizKnowledge = read('quiz/knowledge.json');
const ebKnowledge = read('ebbinghaus/knowledge.json');
const ebQuestions = read('ebbinghaus/questions.json');
const itemId = '高等数学-一阶线性微分方程特解';
const expected = { quizQuestions: ['B', 'C', 'D', 'D', 'C'], examQuestions: ['D', 'B', 'D'] };
const B = String.fromCharCode(92);

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

check(note.includes('## 错题信息') && note.includes('我的答案：未作答'), '错题档案存在且标记未作答');
check(note.includes('## 考研速记规律（一看就会）') && (note.match(/### 规律 \d/g) || []).length >= 3, '档案包含至少 3 条考研速记规律');
check(note.includes('#### A. 仍是线性') && note.includes('#### B. 非线性') && note.includes('#### C. 对 $y$ 不线性') && note.includes('#### D. 常数系数') && note.includes('#### E. 一阶线性') && note.includes('#### F. 不是线性'), '常见变形对照补全 A~F 六类');
check(note.includes('Bernoulli') && note.includes('z=y^{1-n}') && note.includes(String.raw`\dfrac{e^{bx}}{a+b}`) && note.includes(String.raw`(\mu M)_y=(\mu N)_x`), '变形表含 Bernoulli、常系数特解、恰当方程判据');
check((note.match(/### 规律 \d/g) || []).length >= 6 && note.includes('规律 6：常见变形'), '速记规律新增规律 6 且总数 >= 6');
check(note.includes('deepseek-v4-pro') && note.includes('8/8 一致'), '档案记录第二模型复核结论');
check(note.includes('为什么乘 $x$') && note.includes('乘积求导法则') && note.includes('正好就是 $(xy)'), '第三步解释积分因子来源与乘积求导');
const nl = String.fromCharCode(10);
const crossLineQuad = note.split(nl).some(function(line, i, arr){
  if (line.indexOf('$$') !== 0 || line.lastIndexOf('$$') > 0) return false;
  let j = i + 1;
  while (j < arr.length && arr[j].indexOf('$$') < 0) {
    if (arr[j].indexOf('quad') >= 0) return true;
    j++;
  }
  return false;
});
check(!crossLineQuad, '公式无跨行 quad 泄漏');
check(note.includes('$' + B + 'int') && !note.includes('$' + B + B + 'int'), '档案 LaTeX 命令为单层反斜杠');
check(!note.includes(B + B), '档案不含任何连续双反斜杠');
check(note.includes('### 举一反三 5 题') && note.includes('### 历年真题风格练习'), '档案包含 5 道举一反三与真题风格练习');
check(payload.itemId === itemId && payload.subject === '高等数学', 'payload 指向本知识点');
check(payload.knowledge.includes('## 考研速记规律（一看就会）'), '知识点卡包含速记规律章节');
check(payload.knowledge.includes('规律 6：常见变形') && quizKnowledge[itemId].knowledge.includes('规律 6：常见变形') && ebKnowledge[itemId].knowledge.includes('Bernoulli'), '双端知识点卡同步常见变形与规律 6');

const quiz = quizQuestions.filter((q) => q.itemId === itemId);
const eb = ebQuestions.questions.filter((q) => q.itemId === itemId && q.round === 1);
check(quiz.length === 8, `4317 新题共 8 道（实际 ${quiz.length}）`);
check(eb.length === 8, `4318 第 1 轮共 8 道（实际 ${eb.length}）`);
check(quiz.filter((q) => q.id.startsWith('hm-ode-')).length === 5, '4317 复刷 5 题 id 正确');
check(quiz.filter((q) => q.id.startsWith('hm-exam-')).length === 3, '4317 真题风格 3 题已入库');
check(quiz.every((q) => q.subject === '高等数学' && q.type === 'single' && Object.keys(q.options).sort().join('') === 'ABCD'), '4317 题目结构合法');
check(eb.every((q) => q.subject === '高等数学' && Object.keys(q.options).sort().join('') === 'ABCD'), '4318 题目结构合法');
check(quizQuestions[0].itemId === itemId, '新题置顶加入 4317');
check(quizQuestions.slice(0, 8).every((q) => q.itemId === itemId), '4317 前 8 题均属于新知识点');

const quizDrill = quiz.filter((q) => q.id.startsWith('hm-ode-')).map((q) => q.answer).join('');
const quizExam = quiz.filter((q) => q.id.startsWith('hm-exam-')).map((q) => q.answer).join('');
const ebAll = eb.map((q) => q.answer).join('');
check(quizDrill === expected.quizQuestions.join(''), '4317 举一反三答案与代数验证一致');
check(quizExam === expected.examQuestions.join(''), '4317 真题风格答案与代数验证一致');
check(ebAll === [...expected.quizQuestions, ...expected.examQuestions].join(''), '4318 第 1 轮答案与代数验证一致');
check(JSON.stringify(quizKnowledge[itemId]) === JSON.stringify(ebKnowledge[itemId]), '双端知识点卡完全一致');
check(quizQuestions.every((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i), '题库 ID 无重复');

process.exit(failed ? 1 : 0);
