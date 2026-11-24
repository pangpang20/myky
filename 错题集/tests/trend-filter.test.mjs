import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(join(root, 'ebbinghaus/index.html'), 'utf8');
const js = readFileSync(join(root, 'ebbinghaus/app.js'), 'utf8');

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

check(html.includes('id="trendWeekBtn"') && html.includes("setTrendMode('week')"), 'HTML: 按周按钮存在');
check(html.includes('id="trendRangeBtn"') && html.includes('id="trendRangePanel"'), 'HTML: 单个日期范围控件存在');
check(html.includes('id="trendStart"') && html.includes('id="trendEnd"'), 'HTML: 范围内起止日期输入存在');
check(html.includes('onclick="clearTrendRange()"'), 'HTML: 清空按钮存在');
check(html.includes('applyTrendRange()') && html.includes('toggleTrendRangePanel()'), 'HTML: 范围应用与展开入口存在');
check(js.includes('function weekStart('), 'JS: 周起始日计算函数存在');
check(js.includes('function onTrendRangeChange(') && js.includes('function clearTrendRange('), 'JS: 日期筛选与清空函数存在');
check(js.includes('function applyTrendRange(') && js.includes('function toggleTrendRangePanel('), 'JS: 范围应用与展开函数存在');
check(js.includes('近 3 周') && js.includes('按周汇总'), 'JS: 按周文案存在');
check(js.includes('useCustom'), 'JS: 自定义范围标记存在');
check(js.includes('const keyOf=d=>useCustom?d:') || js.includes('const keyOf=d=>useCustom ? d :'), 'JS: 自定义范围强制按天归组');
check(js.includes('useCustom?"按日汇总"') || js.includes('useCustom ? "按日汇总"'), 'JS: 自定义范围文案为按日汇总');
check(js.includes('.max=') && js.includes('today()'), 'JS: 结束日期上限设置为今天');
check(js.includes('const k=ds;') && js.includes('useCustom&&trendStart&&trendEnd'), 'JS: 自定义范围逐日生成 X 轴键（不随日/周/月模式聚合）');
check(js.includes('if(end>todayStrV){end=todayStrV') && js.includes('function clampTrendEnd'), 'JS: 结束日期在今天之后会被截断');

process.exit(failed ? 1 : 0);
