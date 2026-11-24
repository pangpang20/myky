import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(join(root, 'ebbinghaus/index.html'), 'utf8');
const js = readFileSync(join(root, 'ebbinghaus/app.js'), 'utf8');

let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg); if (!ok) failed++; };

check(html.includes('id="trendWeekBtn"') && html.includes("setTrendMode('week')"), 'HTML: 按周按钮存在');
check(html.includes('id="trendRangeBtn"') && html.includes('id="trendRangePanel"'), 'HTML: 日期范围弹窗入口存在');
check(html.includes('id="trendCalendar"') && html.includes('id="trendCalMonth"'), 'HTML: 日历弹窗容器与月份标题存在');
check(html.includes('onclick="clearTrendRange()"'), 'HTML: 清空按钮存在');
check(html.includes('applyTrendRange()') && html.includes('toggleTrendRangePanel()'), 'HTML: 范围应用与展开入口存在');
check(!html.includes('id="trendStart"') && !html.includes('id="trendEnd"'), 'HTML: 不再使用两个独立原生日期输入');
check(js.includes('function weekStart('), 'JS: 周起始日计算函数存在');
check(js.includes('function clearTrendRange('), 'JS: 清空函数存在');
check(js.includes('function applyTrendRange(') && js.includes('function toggleTrendRangePanel('), 'JS: 范围应用与展开函数存在');
check(js.includes('function renderTrendCalendar(') && js.includes('function pickTrendDate('), 'JS: 单日历渲染与点选函数存在');
check(js.includes("let calStart='',calEnd=''") || (js.includes('let calStart=')&&js.includes('calEnd=')), 'JS: 日历内起止选点状态存在');
check(js.includes('近 3 周') && js.includes('按周汇总'), 'JS: 按周文案存在');
check(js.includes('useCustom'), 'JS: 自定义范围标记存在');
check(js.includes('const keyOf=d=>useCustom?d:'), 'JS: 自定义范围强制按天归组');
check(js.includes('useCustom?"按日汇总"'), 'JS: 自定义范围文案为按日汇总');
check(js.includes('const k=ds;') && js.includes('useCustom&&trendStart&&trendEnd'), 'JS: 自定义范围逐日生成 X 轴键');
check(js.includes('calEnd>today') || js.includes('ds>today'), 'JS: 日历中超过今天的日期不可选');
check(js.includes('function shiftTrendMonth('), 'JS: 日历可切换月份');
check(html.includes('repeat(7,minmax(0,1fr))'), 'CSS: 日历列等宽且不被空格子撑破');
check(html.includes('.cal-day.empty{background:transparent;cursor:default;min-width:0;height:30px}') || html.includes('cal-day.empty{'), 'CSS: 空格子尺寸受约束');
check(html.includes('cal-day.empty') && html.includes('padding:0'), 'CSS: 覆盖全局 .empty{padding:44px} 防止撑破日历');

check(js.includes('labelEvery') && js.includes('labelAngle'), 'JS: X 轴标签抽稀与倾斜参数存在');
check(js.includes('font-size="9"') || js.includes('font-size=\"9\"') || js.includes('fontSize'), 'JS: 长范围标签字号缩小');
check(js.includes('transform="rotate(') || js.includes('rotate('), 'JS: 标签使用旋转避免重叠');

process.exit(failed ? 1 : 0);
