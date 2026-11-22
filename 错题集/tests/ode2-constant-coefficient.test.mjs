import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const note = readFileSync(join(root, '高等数学/二阶常系数非齐次线性微分方程错题.md'), 'utf8');
const payload = read('scripts/payload-ode2.json');
const quizQuestions = read('quiz/questions.json');
const quizKnowledge = read('quiz/knowledge.json');
const ebKnowledge = read('ebbinghaus/knowledge.json');
const ebQuestions = read('ebbinghaus/questions.json');
const itemId = '高等数学-二阶常系数非齐次线性微分方程';
const expected = { drill: ['A','B','C','A','C'], exam: ['A','B','A'] };
const B = String.fromCharCode(92);

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

check(note.includes('## 错题信息') && note.includes('我的答案：未作答'), '档案存在且标记未作答');
const BS = String.fromCharCode(92);
check(note.includes('(C_1+C_2x)e^{-x}') && note.includes('(x-1)e^{x}') && note.includes(BS + 'frac{1}{4}'), '档案给出正确通解');
check(note.includes('## 考研速记规律（一看就会）') && (note.match(/### 规律 \d/g) || []).length >= 3, '档案含至少 3 条考研速记规律');
check(note.includes('共振例题：右端') && note.includes('为什么乘 $x^{2}$ 而不是 $x$'), '共振（λ等于特征根）完整例题已补充');
check(note.includes('每求一次导，括号里就多一个') && note.includes('不是新公式，就是乘积求导法则算了两次') && note.includes('平移公式的一般形式'), '平移算子推导已逐步展开');
check(note.includes('为什么要代入 $x=0') && note.includes('二次保险') && note.includes('恒成立'), '回代验证选点理由已解释');
check(note.includes('共振') && note.includes('$k$'), '速记规律覆盖共振判定');
check(note.includes('deepseek-v4-pro') && note.includes('8 道题'), '档案记录第二模型复核结论');
// LaTeX 反斜杠单层（解析后字符串里不应有连续两个反斜杠）
let dbl = 0;
for (let i = 0; i < note.length - 1; i++) if (note.charCodeAt(i) === B && note.charCodeAt(i+1) === B) dbl++;
check(dbl === 0, '档案 LaTeX 反斜杠单层');
check(payload.itemId === itemId && payload.subject === '高等数学', 'payload 指向本知识点');
check(payload.knowledge.includes('考研速记规律') && payload.knowledge.includes('特征方程'), 'payload knowledge 含完整梳理与速记规律');
check(payload.keyPoints.length >= 5 && Object.keys(payload.rootCauses).length >= 3, 'payload 要点与根因齐全');

const quiz = quizQuestions.filter((q) => q.itemId === itemId);
const eb = ebQuestions.questions.filter((q) => q.itemId === itemId && q.round === 1);
check(quiz.length === 8, `4317 新题共 8 道（实际 ${quiz.length}）`);
check(eb.length === 8, `4318 第 1 轮共 8 道（实际 ${eb.length}）`);
check(quiz.filter((q) => q.id.startsWith('hm-ode2-')).length === 5, '4317 复刷 5 题 id 正确');
check(quiz.filter((q) => q.id.startsWith('hm-exam-')).length === 3, '4317 真题风格 3 题已入库');
check(quiz.every((q) => q.subject === '高等数学' && q.type === 'single' && Object.keys(q.options).sort().join('') === 'ABCD'), '4317 题目结构合法');
check(eb.every((q) => q.subject === '高等数学' && Object.keys(q.options).sort().join('') === 'ABCD'), '4318 题目结构合法');
check(quizQuestions.some((q) => q.itemId === itemId) && quiz.slice(0,8).every((q) => q.itemId === itemId), '本知识点 8 题连续成组且在题库中');

const quizDrill = quiz.filter((q) => q.id.startsWith('hm-ode2-')).map((q) => q.answer).join('');
const quizExam = quiz.filter((q) => q.id.startsWith('hm-exam-')).map((q) => q.answer).join('');
const ebAll = eb.map((q) => q.answer).join('');
check(quizDrill === expected.drill.join(''), '4317 举一反三答案与代数验证一致');
check(quizExam === expected.exam.join(''), '4317 真题风格答案与代数验证一致');
check(ebAll === [...expected.drill, ...expected.exam].join(''), '4318 第 1 轮答案与代数验证一致');
check(JSON.stringify(quizKnowledge[itemId]) === JSON.stringify(ebKnowledge[itemId]), '双端知识点卡完全一致');
check(JSON.stringify(quizKnowledge[itemId].knowledge) === JSON.stringify(payload.knowledge), '知识点卡与 payload 同步');
check(quizQuestions.every((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i), '题库 ID 无重复');

process.exit(failed ? 1 : 0);
