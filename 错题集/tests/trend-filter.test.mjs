import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(join(root, 'ebbinghaus/index.html'), 'utf8');
const js = readFileSync(join(root, 'ebbinghaus/app.js'), 'utf8');

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

check(html.includes('id="trendWeekBtn"') && html.includes('setTrendMode(\'week\')'), 'HTML: 按周按钮存在');
check(html.includes('id="trendStart"') && html.includes('id="trendEnd"'), 'HTML: 起止日期输入存在');
check(html.includes('onclick="clearTrendRange()"'), 'HTML: 清空按钮存在');
check(js.includes('function weekStart('), 'JS: 周起始日计算函数存在');
check(js.includes('function onTrendRangeChange(') && js.includes('function clearTrendRange('), 'JS: 日期筛选与清空函数存在');
check(js.includes('近 3 周') && js.includes('按周汇总'), 'JS: 按周文案存在');
check(js.includes('trendStart') && js.includes('trendEnd'), 'JS: 使用自定义日期范围');
check(js.includes("trendMode === 'week'") || js.includes('trendMode==="week"') || js.includes('trendMode===\'week\''), 'JS: week 模式参与 key 计算');

process.exit(failed ? 1 : 0);
