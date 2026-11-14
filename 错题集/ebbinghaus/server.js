const h = require('http'), f = require('fs'), p = require('path');
const ROOT = 'C:/data/code/ky/错题集';
const WEB_DIR = p.join(ROOT, 'ebbinghaus');
const DB_FILE = p.join(ROOT, 'data', 'db.json');

function loadDB() {
  return JSON.parse(f.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) {
  f.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}
function todayEast8() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const server = h.createServer((req, res) => {
  // ---- API: 提交单题作答 ----
  if (req.url === '/api/answer' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        const db = loadDB();
        db.answers = db.answers || [];
        db.answers.push(item);
        saveDB(db);
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

  // ---- API: 读取数据库（供页面渲染） ----
  if (req.url === '/api/db' && req.method === 'GET') {
    const db = loadDB();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(db));
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