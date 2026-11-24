import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const note = readFileSync(join(root, '高等数学/函数不等式与导数积分性质辨析错题.md'), 'utf8');
const payload = read('scripts/payload-deriv-prop.json');
const quizQuestions = read('quiz/questions.json');
const quizKnowledge = read('quiz/knowledge.json');
const ebKnowledge = read('ebbinghaus/knowledge.json');
const ebQuestions = read('ebbinghaus/questions.json');
const itemId = '高等数学-函数不等式与导数积分性质辨析';
const expected = { drill: ['C','A','B','B','B'], exam: ['B','A','A'] };
const B = String.fromCharCode(92);

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

check(note.includes('## 错题信息') && note.includes('我的答案：未作答'), '档案存在且标记未作答');
check(note.includes('正确答案：C') && note.includes('可导必连续'), '档案给出正确答案与核心理由');
check(note.includes('## 考研速记规律（一看就会）') && (note.match(/### 规律 \d/g)||[]).length>=3, '档案含考研速记规律');
check(note.includes('反例法') && note.includes('x<0'), '档案覆盖反例法与积分限方向');
check(note.includes('deepseek-v4-pro') && note.includes('8/8 一致'), '档案记录大模型二次验证');
let dbl=0; for(let i=0;i<note.length-1;i++)if(note.charCodeAt(i)===B&&note.charCodeAt(i+1)===B)dbl++;
check(dbl===0, '档案 LaTeX 反斜杠单层');
check(payload.itemId===itemId && payload.quizQuestions.length===5 && payload.examQuestions.length===3, 'payload 结构正确');
const quiz=quizQuestions.filter(q=>q.itemId===itemId);
const eb=ebQuestions.questions.filter(q=>q.itemId===itemId&&q.round===1);
check(quiz.length===8, `4317 新题共 8 道（实际 ${quiz.length}）`);
check(eb.length===8, `4318 第 1 轮共 8 道（实际 ${eb.length}）`);
check(quiz.filter(q=>q.id.startsWith('hm-prop-')).length===5, '4317 复刷 5 题 id 正确');
check(quiz.filter(q=>q.id.startsWith('hm-exam-')).length===3, '4317 真题风格 3 题已入库');
check(quiz.every(q=>q.subject==='高等数学'&&q.type==='single'&&Object.keys(q.options).sort().join('')==='ABCD'), '4317 题目结构合法');
check(eb.every(q=>q.subject==='高等数学'&&Object.keys(q.options).sort().join('')==='ABCD'), '4318 题目结构合法');
const qd=quiz.filter(q=>q.id.startsWith('hm-prop-')).map(q=>q.answer).join('');
const qe=quiz.filter(q=>q.id.startsWith('hm-exam-')).map(q=>q.answer).join('');
const ea=eb.map(q=>q.answer).join('');
check(qd===expected.drill.join(''), '4317 举一反三答案与代数验证一致');
check(qe===expected.exam.join(''), '4317 真题风格答案与代数验证一致');
check(ea===[...expected.drill,...expected.exam].join(''), '4318 第 1 轮答案与代数验证一致');
check(JSON.stringify(quizKnowledge[itemId])===JSON.stringify(ebKnowledge[itemId]), '双端知识点卡一致');
// 关键公式反斜杠完整
const q1=quiz.find(q=>q.id==='hm-prop-1');
check(q1 && q1.options.C.includes(B+'lim') && q1.question.includes(B+'mathbb'), '极限/集合命令反斜杠完整');
check(quiz.every((q,i,arr)=>arr.findIndex(x=>x.id===q.id)===i), '题库 ID 无重复');
process.exit(failed ? 1 : 0);
