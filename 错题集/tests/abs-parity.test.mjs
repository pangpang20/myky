import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ITEM = "高等数学-绝对值函数奇偶性与性质判断";
const read = rel => JSON.parse(readFileSync(join(root, rel), "utf8"));

let failed = 0;
const check = (ok, msg) => { console.log((ok ? "PASS" : "FAIL") + ": " + msg); if (!ok) failed++; };

// ---- 1. 错题档案结构 ----
const md = readFileSync(join(root, "高等数学/绝对值函数奇偶性与性质判断错题.md"), "utf8");
for (const h of ["## 错题信息", "## 题目", "## 解答", "## 根因分析", "## 完整知识点梳理", "## 考研速记规律（一看就会）", "## 复刷清单", "### 举一反三 5 题", "### 历年真题风格练习", "## 复习记录"]) {
  check(md.includes(h), "档案含章节 " + h);
}
check(md.includes("我的答案：未作答"), "档案记录我的答案为未作答");
check(md.includes("正确答案：D"), "档案记录正确答案 D（偶函数）");
check(md.includes("deepseek-v4-pro"), "档案记录大模型二次验证所用模型");
check(md.includes("mismatches=0"), "档案记录二次验证结论一致");

// LaTeX 反斜杠单层、无控制字符
const FF = String.fromCharCode(12);
check(!md.includes(FF), "档案无换页符等控制字符");
check(md.includes("\\lvert x\\rvert"), "档案表格内绝对值使用 \\lvert/\\rvert 转义");
check(!/\$\s+\$/.test(md), "档案无空公式");
check((md.match(/### 规律 /g) || []).length >= 3, "考研速记规律至少 3 条");

// 表格列数一致（跳过代码块）
{
  const lines = md.split("\n");
  let inFence = false, expected = null, mismatch = 0;
  lines.forEach(l => {
    if (/^\s*```/.test(l)) { inFence = !inFence; expected = null; return; }
    if (inFence) return;
    if (/^\s*\|/.test(l)) {
      const n = (l.match(/\|/g) || []).length;
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) { expected = n; return; }
      if (expected !== null && n !== expected) mismatch++;
    } else expected = null;
  });
  check(mismatch === 0, "档案所有表格列数一致");
}

// ---- 2. quiz 端 ----
const quiz = read("quiz/questions.json");
const qq = quiz.filter(q => q.itemId === ITEM);
check(qq.length === 10, "4317 题目数量为 10（5 复刷 + 5 真题风格），实际 " + qq.length);
check(quiz[0].itemId === ITEM, "4317 新题置顶");
const ids = qq.map(q => q.id);
check(new Set(ids).size === ids.length, "4317 题目 id 无重复");
for (const q of qq) {
  const letters = Object.keys(q.options || {});
  check(letters.length === 4, q.id + " 有 4 个选项");
  check(letters.includes(q.answer), q.id + " 答案字母有效");
  check(typeof q.analysis === "string" && q.analysis.length > 10, q.id + " 解析非空");
}

// 关键题答案核对（与档案一致）
const byId = id => qq.find(q => q.id === id);
check(byId("hm-abs-parity-1")?.answer === "D", "hm-abs-parity-1（原题）答案为 D 偶函数");
check(byId("hm-abs-parity-2")?.answer === "C", "hm-abs-parity-2（|x cos x|e^{sin x}）答案为 C 非奇非偶");
check(byId("hm-abs-parity-3")?.answer === "A", "hm-abs-parity-3（|x| sin x）答案为 A 奇函数");
check(byId("hm-abs-parity-4")?.answer === "B", "hm-abs-parity-4（sin x / x）答案为 B 偶函数");
check(byId("hm-abs-parity-5")?.answer === "C", "hm-abs-parity-5（性质联动）答案为 C 偶函数");

// ---- 3. 艾宾浩斯端 ----
const eb = read("ebbinghaus/questions.json");
const eq = eb.questions.filter(q => q.itemId === ITEM);
check(eq.length === 10, "4318 第 1 轮题目数量为 10，实际 " + eq.length);
check(eq.every(q => q.round === 1), "4318 题目均为第 1 轮");
for (const q of eq) {
  check(Object.keys(q.options || {}).length === 4, q.id + " 有 4 个选项");
  check(Object.keys(q.options || {}).includes(q.answer), q.id + " 答案字母有效");
}

// ---- 4. 知识卡 ----
for (const kf of ["quiz/knowledge.json", "ebbinghaus/knowledge.json"]) {
  const kb = read(kf);
  const entry = kb[ITEM];
  check(!!entry, kf + " 含本知识点卡");
  if (entry) {
    check(entry.knowledge.includes("考研速记规律"), kf + " 知识卡含考研速记规律");
    check(entry.knowledge.includes("|x\\sin x|=|x|\\cdot|\\sin x|"), kf + " 知识卡含拆绝对值核心结论");
    check(Array.isArray(entry.keyPoints) && entry.keyPoints.length >= 3, kf + " 关键点至少 3 条");
    check(!!entry.mnemonic && entry.mnemonic.length > 5, kf + " 含记忆口诀");
    check(Object.keys(entry.rootCauses || {}).length >= 3, kf + " 根因分析至少 3 条");
    check(!entry.knowledge.includes(String.fromCharCode(12)), kf + " 知识卡无控制字符");
    check(entry.knowledge.includes("\\frac{\\pi}{2}"), kf + " 知识卡 LaTeX 反斜杠单层");
  }
}

// ---- 5. 数值自验证：偶性/无界/非单调 ----
{
  const f = x => Math.abs(x * Math.sin(x)) * Math.exp(Math.cos(x));
  let worst = 0;
  for (let i = 1; i <= 100; i++) {
    const x = i * 0.11 + 0.07;
    worst = Math.max(worst, Math.abs(f(-x) - f(x)) / (Math.abs(f(x)) || 1));
  }
  check(worst < 1e-12, "f(-x)=f(x) 数值成立（偶函数），最大相对误差 " + worst.toExponential(2));
  let ok = true;
  for (let k = 0; k < 20; k++) {
    const x = Math.PI / 2 + 2 * k * Math.PI;
    if (Math.abs(f(x) - x) > 1e-9) ok = false;
  }
  check(ok, "特殊点 x_k=π/2+2kπ 处 f(x_k)=x_k（无界）");
  check(Math.abs(f(0)) < 1e-15 && Math.abs(f(Math.PI)) < 1e-15 && Math.abs(f(Math.PI / 2) - Math.PI / 2) < 1e-9,
    "f(0)=f(π)=0 且 f(π/2)=π/2（非单调、无最大值）");
}

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log("Absolute-value parity wrong-question validation passed.");
