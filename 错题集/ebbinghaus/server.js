const h = require('http'), f = require('fs'), p = require('path');
const Database = require('../scripts/node_modules/better-sqlite3');
const ROOT = 'C:/data/code/ky/错题集';
const ROOT_RES = p.resolve(ROOT);
const WEB_DIR = p.join(ROOT, 'ebbinghaus');
const DB_FILE = p.join(ROOT, 'data', 'ky.db');
const LEGACY_JSON = p.join(ROOT, 'data', 'db.json');

const sqlite = new Database(DB_FILE);
sqlite.pragma('journal_mode = WAL');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, subject TEXT NOT NULL, file TEXT NOT NULL,
  firstLearned TEXT, status TEXT NOT NULL DEFAULT 'learning',
  round INTEGER NOT NULL DEFAULT 1, dueDate TEXT, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, itemId TEXT NOT NULL,
  date TEXT NOT NULL, correct INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, roundId TEXT, itemId TEXT NOT NULL,
  questionId TEXT, topic TEXT, selected TEXT, answer TEXT,
  correct INTEGER NOT NULL, at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY CHECK (id = 1), roundId TEXT,
  forceMode INTEGER NOT NULL DEFAULT 0, qi INTEGER NOT NULL DEFAULT 0,
  results TEXT, ids TEXT, at TEXT
);
`);

// JSON -> SQLite 一次性迁移（若 SQLite 为空且 legacy 存在）
function migrateFromJsonIfNeeded() {
  const hasItems = sqlite.prepare('SELECT COUNT(*) c FROM items').get().c > 0;
  if (hasItems || !f.existsSync(LEGACY_JSON)) return;
  try {
    const src = JSON.parse(f.readFileSync(LEGACY_JSON, 'utf8'));
    const tx = sqlite.transaction(() => {
      const meta = sqlite.prepare('INSERT INTO meta(key,value) VALUES (?,?)');
      meta.run('version', String(src.version || 2));
      meta.run('schedule', JSON.stringify(src.schedule || [1,2,4,7,15,30]));
      const insItem = sqlite.prepare('INSERT INTO items (id,subject,file,firstLearned,status,round,dueDate,createdAt) VALUES (?,?,?,?,?,?,?,?)');
      const insReview = sqlite.prepare('INSERT INTO reviews (itemId,date,correct) VALUES (?,?,?)');
      (src.items || []).forEach(it => {
        insItem.run(it.id, it.subject, it.file, it.firstLearned || null, it.status || 'learning', it.round || 1, it.dueDate || null, it.createdAt || null);
        (it.reviews || []).forEach(r => insReview.run(it.id, r.date, r.correct ? 1 : 0));
      });
      const insAns = sqlite.prepare('INSERT INTO answers (roundId,itemId,questionId,topic,selected,answer,correct,at) VALUES (?,?,?,?,?,?,?,?)');
      (src.answers || []).forEach(a => insAns.run(a.roundId || null, a.itemId, a.id || null, a.topic || null, a.selected || null, a.answer || null, a.correct ? 1 : 0, a.at));
      const pr = src.progress;
      if (pr) sqlite.prepare('INSERT INTO progress (id,roundId,forceMode,qi,results,ids,at) VALUES (1,?,?,?,?,?,?)')
        .run(pr.roundId || null, pr.forceMode ? 1 : 0, pr.qi || 0, JSON.stringify(pr.results || []), JSON.stringify(pr.ids || []), pr.at || null);
    });
    tx();
    console.log('[sqlite] migrated from legacy db.json');
  } catch (e) { console.error('[sqlite] migration failed:', e.message); }
}
migrateFromJsonIfNeeded();

function loadDB() {
  const items = sqlite.prepare('SELECT * FROM items ORDER BY createdAt').all().map(it => ({
    id: it.id, subject: it.subject, file: it.file, firstLearned: it.firstLearned,
    status: it.status, round: it.round, dueDate: it.dueDate, createdAt: it.createdAt,
    reviews: sqlite.prepare('SELECT date, correct FROM reviews WHERE itemId=? ORDER BY id').all(it.id).map(r => ({ date: r.date, correct: !!r.correct }))
  }));
  const answers = sqlite.prepare('SELECT * FROM answers ORDER BY id').all().map(a => ({
    roundId: a.roundId, itemId: a.itemId, id: a.questionId, topic: a.topic,
    selected: a.selected, answer: a.answer, correct: !!a.correct, at: a.at
  }));
  const pr = sqlite.prepare('SELECT * FROM progress WHERE id=1').get();
  const meta = {};
  sqlite.prepare('SELECT key,value FROM meta').all().forEach(r => meta[r.key] = r.value);
  const db = { version: Number(meta.version || 2), schedule: JSON.parse(meta.schedule || '[1,2,4,7,15,30]'), items, answers };
  if (pr) {
    db.progress = { roundId: pr.roundId, forceMode: !!pr.forceMode, qi: pr.qi, results: JSON.parse(pr.results || '[]'), ids: JSON.parse(pr.ids || '[]'), at: pr.at };
  }
  return db;
}
function saveDB(db) {
  const tx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM reviews').run();
    sqlite.prepare('DELETE FROM items').run();
    (db.items || []).forEach(it => {
      sqlite.prepare('INSERT INTO items (id,subject,file,firstLearned,status,round,dueDate,createdAt) VALUES (?,?,?,?,?,?,?,?)')
        .run(it.id, it.subject, it.file, it.firstLearned || null, it.status || 'learning', it.round || 1, it.dueDate || null, it.createdAt || null);
      (it.reviews || []).forEach(r => sqlite.prepare('INSERT INTO reviews (itemId,date,correct) VALUES (?,?,?)').run(it.id, r.date, r.correct ? 1 : 0));
    });
    // answers/progress 由专用 SQL 更新，saveDB 不覆盖
  });
  tx();
}
function insertAnswer(a) {
  sqlite.prepare('INSERT INTO answers (roundId,itemId,questionId,topic,selected,answer,correct,at) VALUES (?,?,?,?,?,?,?,?)')
    .run(a.roundId || null, a.itemId, a.id || null, a.topic || null, a.selected || null, a.answer || null, a.correct ? 1 : 0, a.at);
}
function saveProgressRow(p) {
  if (!p || !Array.isArray(p.ids) || !p.ids.length) {
    sqlite.prepare('DELETE FROM progress WHERE id=1').run();
    return;
  }
  sqlite.prepare('INSERT OR REPLACE INTO progress (id,roundId,forceMode,qi,results,ids,at) VALUES (1,?,?,?,?,?,?)')
    .run(p.roundId || null, p.forceMode ? 1 : 0, p.qi || 0, JSON.stringify(p.results || []), JSON.stringify(p.ids), p.at || todayEast8());
}
function todayEast8() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}


// ---- 启动校验：题库 JSON 重复 ID 自动去重 ----
function dedupeQuestionIds() {
  let totalRemoved = 0;
  ['ds-questions.json', 'questions.json'].forEach(name => {
    const fp = p.join(WEB_DIR, name);
    if (!f.existsSync(fp)) return;
    try {
      const data = JSON.parse(f.readFileSync(fp, 'utf8'));
      const seen = new Set();
      const before = data.questions.length;
      data.questions = data.questions.filter(q => {
        const key = String(q.id || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const removed = before - data.questions.length;
      if (removed > 0) {
        f.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log('[dedupe] ' + name + ': removed ' + removed + ' duplicate-id question(s)');
        totalRemoved += removed;
      }
    } catch (e) { console.error('[dedupe] failed for ' + name + ':', e.message); }
  });
  // 清理 db.progress 中引用已删除 id 的进度
  if (totalRemoved > 0) {
    try {
      const db = loadDB();
      const valid = new Set();
      ['ds-questions.json', 'questions.json'].forEach(name => {
        try {
          const data = JSON.parse(f.readFileSync(p.join(WEB_DIR, name), 'utf8'));
          data.questions.forEach(q => valid.add(String(q.id)));
        } catch (e) {}
      });
      const pr = sqlite.prepare('SELECT * FROM progress WHERE id=1').get();
      if (pr) {
        const ids = JSON.parse(pr.ids || '[]').filter(id => valid.has(String(id)));
        const results = JSON.parse(pr.results || '[]').slice(0, ids.length);
        const qi = Math.min(pr.qi || 0, Math.max(0, ids.length - 1));
        if (ids.length) {
          sqlite.prepare('UPDATE progress SET ids=?, results=?, qi=? WHERE id=1').run(JSON.stringify(ids), JSON.stringify(results), qi);
        } else {
          sqlite.prepare('DELETE FROM progress WHERE id=1').run();
        }
        console.log('[dedupe] db.progress filtered, remaining ids: ' + ids.length);
      }
    } catch (e) { console.error('[dedupe] progress filter failed:', e.message); }
  }
}
dedupeQuestionIds();

const server = h.createServer((req, res) => {
  // ---- API: 提交单题作答 ----
  if (req.url === '/api/answer' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        insertAnswer(item);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { console.error('API error:', e.message); res.writeHead(500); res.end('bad: ' + e.message); }
    });
    return;
  }

  // ---- API: 结束本轮，更新复习队列 ----
  if (req.url === '/api/finish' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { roundId, date } = JSON.parse(body);
        const db = loadDB();
        const today = (db.answers || []).filter(a => a.roundId === roundId);
        const todayStr = date || todayEast8();
        const itemIds = [...new Set(today.map(a => a.itemId))];
        itemIds.forEach(id => {
          const it = db.items.find(x => x.id === id);
          if (!it) return;
          const itemWrong = today.some(a => a.itemId === id && !a.correct);
          it.reviews.push({ date: todayStr, correct: !itemWrong });
          if (itemWrong) {
            it.status = 'learning';
            it.round = 1;
            it.dueDate = addDays(todayStr, 1);
          } else {
            it.round = (it.round || 1) + 1;
            const gap = db.schedule[it.round - 2] !== undefined ? db.schedule[it.round - 2] : 30;
            it.dueDate = addDays(todayStr, gap);
            // 掌握判定：完成全部 6 轮（round > 6）
            if (it.round > db.schedule.length) it.status = 'mastered';
          }
        });
        saveDB(db);
        const wrongCount = [...new Set(today.filter(a => !a.correct).map(a => a.itemId))].length;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, wrongCount }));
      } catch (e) { console.error('API error:', e.message); res.writeHead(500); res.end('bad: ' + e.message); }
    });
    return;
  }


  // ---- API: 答题进度（存服务端，跨浏览器共用） ----
  if (req.url === '/api/progress' && req.method === 'GET') {
    const db = loadDB();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(db.progress || null));
    return;
  }
  if (req.url === '/api/progress' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        saveProgressRow(p && Array.isArray(p.ids) && p.ids.length ? p : null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { console.error('progress error:', e.message); res.writeHead(500); res.end('bad: ' + e.message); }
    });
    return;
  }

  // ---- API: 读取数据库（供页面渲染） ----
  if (req.url === '/api/db' && req.method === 'GET') {
    const db = loadDB();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(db));
    return;
  }

  // ---- API: 读取错题 Markdown ----
  if (req.url.startsWith('/api/note/') && req.method === 'GET') {
    const rel = decodeURIComponent(req.url.split('/api/note/')[1]);
    if (!rel.endsWith('.md') || rel.includes('..') || p.isAbsolute(rel)) {
      res.writeHead(400); res.end('bad path'); return;
    }
    const fp = p.resolve(ROOT, rel);
    if (!fp.startsWith(ROOT_RES + p.sep)) { res.writeHead(404); res.end('not found'); return; }
    if (!f.existsSync(fp)) { res.writeHead(404); res.end('not found'); return; }
    f.readFile(fp, (e, d) => {
      if (e) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(d);
    });
    return;
  }

  // ---- API: 重置某知识点 ----
  if (req.url.startsWith('/api/reset/') && req.method === 'POST') {
    const id = decodeURIComponent(req.url.split('/api/reset/')[1]);
    const db = loadDB();
    const it = db.items.find(x => x.id === id);
    if (it) {
      it.status = 'learning';
      it.round = 1;
      it.reviews = [];
      it.dueDate = addDays(todayEast8(), 1);
      saveDB(db);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ---- 静态文件 ----
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  const fp = p.join(WEB_DIR, u);
  f.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    const ext = p.extname(fp);
    const mime = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }[ext] || 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(d);
  });
});

server.listen(4318, '0.0.0.0', () => console.log('ebbinghaus server on 0.0.0.0:4318, db at', DB_FILE));