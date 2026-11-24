import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const FF = String.fromCharCode(12);
const B = String.fromCharCode(92);

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

const files = [
  'quiz/questions.json', 'quiz/knowledge.json',
  'ebbinghaus/questions.json', 'ebbinghaus/knowledge.json',
];
let totalStrings = 0;
for (const f of files) {
  const j = read(f);
  let ctrlCount = 0, fracrCount = 0, bareLambda = 0, badFrac = 0;
  const walk = (o) => {
    if (typeof o === 'string') {
      totalStrings++;
      for (let i = 0; i < o.length; i++) if (o.charCodeAt(i) === FF) ctrlCount++;
      if (o.includes(B + 'fracrac')) fracrCount++;
      if (o.includes('e^{lambda') || o.includes('$lambda=')) bareLambda++;
      // rac{14}/rac{16}/rac{12} 本意是 1/4、1/6、1/2，必须写成 rac{1}{4} 等
      for (const d of ['14','16','12']) {
        const needle = B + 'frac{' + d + '}';
        let pos = 0;
        while ((pos = o.indexOf(needle, pos)) >= 0) {
          const after = o[pos + needle.length];
          if (after !== '{') badFrac++;
          pos += needle.length;
        }
      }
      return;
    }
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(j);
  check(ctrlCount === 0, `${f}: 无换页符等控制字符（原 \f 被吞导致 rac 外露）`);
  check(fracrCount === 0, `${f}: 无 fracr 畸形命令`);
  check(bareLambda === 0, `${f}: 无裸 lambda（均已带反斜杠）`);
  check(badFrac === 0, `${f}: 无 \frac{14}/\frac{16}/\frac{12} 畸形分子`);
}
check(totalStrings > 1000, `扫描覆盖足够多的字符串字段（${totalStrings}）`);

process.exit(failed ? 1 : 0);
