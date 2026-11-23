import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire('C:/data/code/ky/错题集/scripts/x.js');
const Database = require('better-sqlite3');
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

const olds = ['英语-阅读隐含原因与作者态度','英语-阅读细节理解','英语-阅读推理判断','英语-阅读细节理解2','英语-阅读推理判断2','英语-阅读作者态度2'];
const news = ['英语-2000阅读Text1美国经济兴衰','英语-2000阅读Text2人类进化停滞'];

for (const [label, f] of [['4318','ebbinghaus'],['4317','quiz']]) {
  const kb = read(`${f}/knowledge.json`);
  const qf = read(`${f}/questions.json`);
  const list = Array.isArray(qf) ? qf : qf.questions;
  for (const id of olds) {
    check(!(id in kb), `${label} 旧知识点已移除: ${id}`);
    check(!list.some(q => q.itemId === id), `${label} 旧 itemId 已清除: ${id}`);
  }
  for (const id of news) {
    check(id in kb, `${label} 新知识点存在: ${id}`);
    check(list.filter(q => q.itemId === id).length === 24, `${label} 新知识点有 24 题: ${id}`);
  }
  check(JSON.stringify(kb[news[0]]) === JSON.stringify(read('quiz/knowledge.json')[news[0]]), `${label} 新知识点卡双端一致（Text1）`);
}
// SQLite
const db = new Database(join(root, 'data/ky.db'), { readonly: true });
const items = db.prepare("SELECT id FROM items WHERE id LIKE '英语%'").all().map(r=>r.id);
db.close();
for (const id of olds) check(!items.includes(id), `SQLite 旧知识点已移除: ${id}`);
for (const id of news) check(items.includes(id), `SQLite 新知识点存在: ${id}`);
check(items.filter(id=>id.startsWith('英语')).length === 3, '英语知识点总数为 3（完形1 + 阅读Text1/Text2各1）');

process.exit(failed ? 1 : 0);
