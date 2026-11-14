'use strict';
let DB=null,QS=[],KB={},page=1,pageSize=10,queue=[],qi=0,roundId='',forceMode=false,results=[];
let trendMode='day';

function nowEast8Iso(){const d=new Date(Date.now()+8*3600*1000);return d.toISOString().replace('Z','+08:00')}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

async function init(){
  document.documentElement.dataset.theme=localStorage.getItem('eb_theme')||'dark';
  updateThemeBtn();
  const [dbR,q1,q2,kbR]=await Promise.all([fetch('/api/db'),fetch('/questions.json'),fetch('/ds-questions.json'),fetch('/knowledge.json')]);
  DB=await dbR.json();
  const a=await q1.json(),b=await q2.json();
  QS=[...(a.questions||[]),...(b.questions||[])];
  KB=await kbR.json();
  const t=today();
  document.getElementById('todayBadge').textContent='今天 '+t;
  renderStats();renderCurve();renderTrend();fillSubjectFilter();renderAll();renderDueBar();
  bindDrillClicks();
}

function updateThemeBtn(){
  const dark=document.documentElement.dataset.theme==='dark';
  document.getElementById('themeBtn').textContent=dark?'☀️ 浅色':'🌙 深色';
}
function toggleTheme(){
  document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  localStorage.setItem('eb_theme',document.documentElement.dataset.theme);
  updateThemeBtn();renderCurve();renderTrend();
}

function fmtTs(v){
  if(!v)return '—';
  const d=new Date(v);
  if(isNaN(d))return String(v);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

function dueItems(){const t=today();return DB.items.filter(i=>i.status==='learning'&&i.dueDate<=t)}
function renderStats(){
  const t=today();
  const due=DB.items.filter(i=>i.status==='learning'&&i.dueDate<=t).length;
  const learn=DB.items.filter(i=>i.status==='learning').length;
  const mast=DB.items.filter(i=>i.status==='mastered').length;
  const totalQ=QS.length;
  const rev=(DB.answers||[]).length;
  const s=document.getElementById('stats');
  s.innerHTML=
    '<div class="stat cyan"><div class="stat-top"><div class="stat-ico"><span>📚</span></div><div class="stat-label">总题数</div></div><div class="num link" onclick="drillQuestions()" title="按科目查看题数">'+totalQ+'<span class="unit">题</span></div><div class="stat-hint">'+DB.items.length+' 个知识点</div></div>'+
    '<div class="stat orange"><div class="stat-top"><div class="stat-ico"><span>⏰</span></div><div class="stat-label">今日到期</div></div><div class="num link" onclick="drillStatus(\'due\')" title="按科目查看知识点数">'+due+'<span class="unit">个</span></div><div class="stat-hint">'+(due?'需要立即复习':'暂无到期任务')+'</div></div>'+
    '<div class="stat blue"><div class="stat-top"><div class="stat-ico"><span>📖</span></div><div class="stat-label">学习中</div></div><div class="num link" onclick="drillStatus(\'learning\')" title="按科目查看知识点数">'+learn+'<span class="unit">个</span></div><div class="stat-hint">按遗忘曲线推进中</div></div>'+
    '<div class="stat green"><div class="stat-top"><div class="stat-ico"><span>✅</span></div><div class="stat-label">已掌握</div></div><div class="num link" onclick="drillStatus(\'mastered\')" title="按科目查看知识点数">'+mast+'<span class="unit">个</span></div><div class="stat-hint">完成全部 6 轮复习</div></div>'+
    '<div class="stat purple"><div class="stat-top"><div class="stat-ico"><span>✏️</span></div><div class="stat-label">累计作答</div></div><div class="num link" onclick="drillAnswersByDay()" title="按日期查看答题数">'+rev+'<span class="unit">次</span></div><div class="stat-hint">含即时练习与复习</div></div>';
}
function bindDrillClicks(){
  const body=document.getElementById('drillBody');
  if(!body||body.dataset.bound)return;
  body.dataset.bound='1';
  body.addEventListener('click',e=>{
    const td=e.target.closest('td[data-filter]');
    if(!td)return;
    try{filterTable(JSON.parse(td.dataset.filter))}catch(err){console.error(err)}
  });
}
function openDrill(title,rowsHtml){
  document.getElementById('drillTitle').textContent=title;
  document.getElementById('drillBody').innerHTML=rowsHtml;
  document.getElementById('drillModal').classList.add('open');
}
function closeDrill(){
  document.getElementById('drillModal').classList.remove('open');
}
function drillRows(rows){
  if(!rows.length)return '<div class="empty">暂无数据</div>';
  return '<table><tbody>'+rows.map(r=>'<tr><td class="'+(r.filter?'clickable':'')+'"'+(r.filter?' data-filter="'+esc(JSON.stringify(r.filter))+ '"':'')+'><div class="row-main">'+esc(r.main)+'</div>'+(r.sub?'<div class="row-sub">'+esc(r.sub)+'</div>':'')+'</td><td style="text-align:right;white-space:nowrap;color:var(--muted)">'+esc(r.count)+'</td></tr>').join('')+'</tbody></table>';
}
function drillQuestions(){
  const map={};
  QS.forEach(q=>{map[q.subject]=(map[q.subject]||0)+1});
  const rows=Object.keys(map).sort((a,b)=>map[b]-map[a]).map(sub=>({
    main:sub||'未分类',
    sub:'点击筛选下方知识点表',
    count:map[sub]+' 题',
    filter:{subject:sub}
  }));
  openDrill('📚 总题数 · 按科目',drillRows(rows));
}
function drillStatus(status){
  const t=today();
  const items=DB.items.filter(i=>{
    if(status==='learning')return i.status==='learning';
    if(status==='mastered')return i.status==='mastered';
    if(status==='due')return i.status==='learning'&&i.dueDate<=t;
    return true;
  });
  const map={};
  items.forEach(i=>{map[i.subject]=(map[i.subject]||0)+1});
  const label={due:'今日到期',learning:'学习中',mastered:'已掌握'}[status]||'知识点';
  const rows=Object.keys(map).sort((a,b)=>map[b]-map[a]).map(sub=>({
    main:sub||'未分类',
    sub:'点击筛选下方知识点表',
    count:map[sub]+' 个',
    filter:{subject:sub,status:status}
  }));
  openDrill('📊 '+label+' · 按科目知识点数',drillRows(rows));
}
function drillAnswersByDay(){
  const map={};
  (DB.answers||[]).forEach(a=>{const d=String(a.at||'').slice(0,10)||'日期未知';map[d]=(map[d]||0)+1});
  const keys=Object.keys(map).sort((a,b)=>a==='日期未知'?1:b==='日期未知'?-1:b.localeCompare(a));
  const rows=keys.map(d=>({main:d,count:map[d]+' 次'}));
  openDrill('✏️ 累计作答 · 按日期（共 '+((DB.answers||[]).length)+' 次）',drillRows(rows));
}
function filterTable(opt){
  if(opt.subject!==undefined)document.getElementById('fSubject').value=opt.subject;
  document.getElementById('fStatus').value=opt.status||'';
  document.getElementById('fKeyword').value='';
  document.getElementById('fReviews').value='0';
  page=1;closeDrill();renderAll();
  document.getElementById('mainView').scrollIntoView({behavior:'smooth'});
}
function renderDueBar(){
  const due=dueItems();const d=document.getElementById('quizDesc');
  const btn=document.getElementById('startBtn');
  const pct=document.getElementById('duePct');
  if(due.length){
    d.textContent='今天有 '+due.length+' 个知识点到期，答错将重置记忆周期。建议先完成到期复习，再做全部练习巩固。';
    pct.textContent='到期率 '+Math.round(due.length/Math.max(1,DB.items.filter(i=>i.status!=='mastered').length)*100)+'%';
    btn.disabled=false;
  }else{
    d.textContent='今天没有到期复习，可以用「全部练习」巩固全部知识点，巩固轮次不计入记忆周期。';
    pct.textContent='进度良好';
    btn.disabled=true;
  }
}

const SCHEDULE=[1,2,4,7,15,30];
function renderCurve(){
  const svg=document.getElementById('curveSvg');
  const W=960,H=300,PL=64,PR=32,PT=30,PB=54;
  const iw=W-PL-PR,ih=H-PT-PB;
  const dark=document.documentElement.dataset.theme==='dark';
  const grid=dark?'rgba(148,163,184,.14)':'rgba(71,85,105,.14)';
  const axis=dark?'#475569':'#cbd5e1';
  const labelC=dark?'#94a3b8':'#475569';
  const g=d=>d/30*ih;
  const pts=SCHEDULE.map((d,i)=>({x:PL+i*(iw/(SCHEDULE.length-1)),y:PT+ih-g(d),d:d}));
  let area='M '+pts[0].x+' '+(PT+ih);
  pts.forEach(p=>{area+=' L '+p.x+' '+p.y});
  area+=' L '+pts[pts.length-1].x+' '+(PT+ih)+' Z';
  let line='';
  pts.forEach((p,i)=>{line+=(i?' L ':'M ')+p.x+' '+p.y});
  let out='<defs><linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(37,99,235,.28)"/><stop offset="1" stop-color="rgba(37,99,235,0)"/></linearGradient></defs>';
  [25,50,75,100].forEach(v=>{const y=PT+ih-(v/100*ih);out+='<line x1="'+PL+'" y1="'+y+'" x2="'+(W-PR)+'" y2="'+y+'" stroke="'+grid+'" stroke-width="1"/><text x="'+(PL-10)+'" y="'+(y+4)+'" fill="'+labelC+'" font-size="11" text-anchor="end">'+v+'%</text>'});
  out+='<path d="'+area+'" fill="url(#curveGrad)"/>';
  out+='<path d="'+line+'" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  pts.forEach((p,i)=>{
    out+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+p.x+'" y2="'+(PT+ih)+'" stroke="'+grid+'" stroke-width="1" stroke-dasharray="3 3"/>';
    out+='<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="var(--bg2)" stroke="var(--blue)" stroke-width="2.5"/>';
    out+='<text x="'+p.x+'" y="'+(p.y-14)+'" fill="var(--blue)" font-size="13" font-weight="700" text-anchor="middle"'+(i%2?'':'')+'>'+p.d+'天</text>';
    out+='<text x="'+p.x+'" y="'+(PT+ih+24)+'" fill="'+labelC+'" font-size="12" text-anchor="middle">第'+(i+1)+'轮</text>';
    out+='<text x="'+p.x+'" y="'+(PT+ih+42)+'" fill="'+labelC+'" font-size="10" text-anchor="middle">'+p.d+'天</text>';
  });
  out+='<text x="'+(PL+iw/2)+'" y="'+(H-6)+'" fill="'+labelC+'" font-size="12" text-anchor="middle">间隔天数</text>';
  svg.innerHTML=out;
}

function filteredItems(){
  const kw=document.getElementById('fKeyword').value.trim().toLowerCase();
  const sub=document.getElementById('fSubject').value;
  const st=document.getElementById('fStatus').value;
  const rev=parseInt(document.getElementById('fReviews').value)||0;
  const t=today();
  const list=DB.items.filter(i=>{
    if(kw&&!i.id.toLowerCase().includes(kw))return false;
    if(sub&&i.subject!==sub)return false;
    if(st==='learning'&&i.status!=='learning')return false;
    if(st==='mastered'&&i.status!=='mastered')return false;
    if(st==='due'&&!(i.status==='learning'&&i.dueDate<=t))return false;
    if(rev&&(i.reviews||[]).length<rev)return false;
    return true;
  });
  return list.slice().sort((a,b)=>(b.createdAt||b.firstLearned||'').localeCompare(a.createdAt||a.firstLearned||'')||(b.id||'').localeCompare(a.id||''));
}
function clearFilters(){
  document.getElementById('fKeyword').value='';
  document.getElementById('fSubject').value='';
  document.getElementById('fStatus').value='';
  document.getElementById('fReviews').value='0';
  page=1;renderAll();
}
function fillSubjectFilter(){
  const subs=[...new Set(DB.items.map(i=>i.subject))];
  const sel=document.getElementById('fSubject');
  sel.innerHTML='<option value="">全部科目</option>'+subs.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
}
function renderAll(){
  const items=filteredItems();
  const total=items.length;
  const tp=Math.max(1,Math.ceil(total/pageSize));
  if(page>tp)page=tp;
  const slice=items.slice((page-1)*pageSize,page*pageSize);
  const t=today();
  const body=document.getElementById('allBody');
  body.innerHTML=slice.length?slice.map(i=>{
    const qCount=QS.filter(q=>q.itemId===i.id).length;
    const addedAt=fmtTs(i.createdAt||i.firstLearned);
    const due=i.status==='learning'&&i.dueDate<=t;
    const tag=i.status==='mastered'?'<span class="tag mastered">已掌握</span>':due?'<span class="tag due">今日到期</span>':'<span class="tag learning">学习中</span>';
    return '<tr><td style="color:var(--muted2);font-size:12px;white-space:nowrap">'+esc(addedAt)+'</td><td style="text-align:left;font-weight:600">'+esc(i.id)+'</td><td>'+esc(i.subject)+'</td><td>'+tag+'</td><td>'+qCount+' 题</td><td>第 '+i.round+' 轮</td><td>'+(i.status==='mastered'?'—':i.dueDate)+'</td><td>'+(i.reviews||[]).length+' 次</td><td><button class="btn ghost" onclick="resetItem(\''+i.id+'\')">重置</button></td></tr>';
  }).join(''):'<tr><td colspan="9" class="empty">没有符合条件的数据</td></tr>';
  renderPager(total,tp);
}
function renderPager(total,tp){
  const pg=document.getElementById('pager');
  let btns='';
  const first=Math.max(1,Math.min(page-3,tp-6));
  for(let n=first;n<=Math.min(tp,first+6);n++){
    btns+='<button class="'+(n===page?'active':'')+'" onclick="gotoPage('+n+')">'+n+'</button>';
  }
  pg.innerHTML='<span class="info">共 '+total+' 条 · 每页 '+pageSize+' 条</span>'+
    '<button '+(page<=1?'disabled':'')+' onclick="gotoPage('+(page-1)+')">← 上一页</button>'+btns+
    '<button '+(page>=tp?'disabled':'')+' onclick="gotoPage('+(page+1)+')">下一页 →</button>'+
    '<select onchange="pageSize=parseInt(this.value);page=1;renderAll()">'+
    [10,20,30,50,100].map(v=>'<option value="'+v+'"'+(v===pageSize?' selected':'')+'>'+v+' 条/页</option>').join('')+'</select>'+
    '<span>跳转</span><input type="number" min="1" max="'+tp+'" value="'+page+'" onchange="gotoPage(parseInt(this.value))"><span class="info">/ '+tp+' 页</span>';
}
function gotoPage(n){
  const tp=Math.max(1,Math.ceil(filteredItems().length/pageSize));
  page=Math.min(Math.max(1,n),tp);renderAll();
}

async function resetItem(id){
  await fetch('/api/reset/'+encodeURIComponent(id),{method:'POST'});
  const r=await fetch('/api/db');DB=await r.json();
  renderStats();renderAll();renderDueBar();
}

function startQuiz(force){
  forceMode=!!force;
  const items=forceMode?DB.items.filter(i=>i.status!=='mastered'):dueItems();
  if(!items.length){renderDueBar();return;}
  roundId='eb-'+Date.now();
  queue=[];qi=0;results=[];
  results=new Array();
  items.forEach(it=>{
    const pool=QS.filter(q=>q.itemId===it.id);
    if(!pool.length)return;
    const shuffled=pool.slice().sort(()=>Math.random()-.5);
    shuffled.forEach(q=>queue.push(q));
  });
  if(!queue.length){document.getElementById('quizDesc').textContent='题库为空，暂无可用练习。';return;}
  document.getElementById('mainView').style.display='none';
  document.getElementById('quizView').style.display='';
  document.getElementById('quizView').classList.add('main-with-side');
  renderQ();
  renderSide();
}
function exitQuiz(){
  document.getElementById('quizView').style.display='none';
  document.getElementById('mainView').style.display='';
  document.getElementById('quizLog').textContent='';
  results=[];
  init();
}
function renderQ(){
  if(qi>=queue.length){finishRound();return;}
  const q=queue[qi];
  const card=document.getElementById('quizCard');
  card.innerHTML='<div class="meta">第 '+(qi+1)+' / '+queue.length+' 题 · '+esc(q.subject)+' · '+esc(q.topic)+' · 单选</div>'+
    '<div class="q">'+renderQuestion(q.question)+'</div>'+
    '<div id="opts">'+Object.keys(q.options).map(k=>'<div class="opt" data-k="'+k+'" onclick="choose(\''+k+'\')"><span class="badge">'+k+'</span>'+renderQuestion(q.options[k])+'</div>').join('')+'</div>'+
    '<div class="nav-bar" id="navWrap"></div>'+
    '<div class="analysis" id="ana"></div>';
  renderNavBar();
  renderSide();
}
const FENCE='```';
function toMath(tex){
  return tex
    .replace(/log_\{?2\}?/g,'\\log_{2}')
    .replace(/log_\{?(\d+)\}?/g,'\\log_{$1}')
    .replace(/sqrt/g,'\\sqrt')
    .replace(/\^\{?\(1\/2\)\}?/g,'^{1/2}')
    .replace(/\^\{?\(1\/3\)\}?/g,'^{1/3}')
    .replace(/\^\{?\(2\/3\)\}?/g,'^{2/3}')
    .replace(/\^\{?\(3\/2\)\}?/g,'^{3/2}')
    .replace(/n\/2/g,'\\\\frac{n}{2}')
    .replace(/²/g,'^2').replace(/³/g,'^3').replace(/⁴/g,'^4');
}
function katexO(inner){
  try{
    return katex.renderToString('O(' + toMath(inner) + ')',{throwOnError:false,output:'html'});
  }catch(e){
    return 'O(' + inner + ')';
  }
}
function renderQuestion(text){
  const parts=String(text).split(FENCE);
  let out='';
  parts.forEach((part,i)=>{
    const seg0=part.replace(/\\n/g,'\n');
    if(i%2===0){
      let seg=esc(seg0).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
      seg=seg.replace(/O\(([^)<]+)\)/g,function(m,inner){return katexO(inner);});
      out+=seg;
    }
    else{
      const code=seg0.replace(/^\n/,'').replace(/\n$/,'').replace(/^\s*c\n/,'');
      out+='<pre><code>'+esc(code)+'</code></pre>';
    }
  });
  return out;
}
function choose(k){
  const q=queue[qi];
  const opts=document.querySelectorAll('#opts .opt');
  opts.forEach(o=>{o.classList.add('disabled');o.onclick=null});
  const picked=document.querySelector('#opts .opt[data-k="'+k+'"]');
  const ok=k===q.answer;
  const ansEl=document.querySelector('#opts .opt[data-k="'+q.answer+'"]');
  if(ansEl)ansEl.classList.add('correct');
  if(!ok&&picked)picked.classList.add('wrong');
  fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roundId:roundId,itemId:q.itemId,id:q.id,topic:q.topic,selected:k,answer:q.answer,correct:ok,at:nowEast8Iso()})});
  const ana=document.getElementById('ana');
  const kb=KB[q.itemId]||{};
  const rootCause=(kb.rootCauses||{})[q.topic]||'暂无针对此题的根因分析。';
  let html='<div class="analysis-block"><h4>🔍 解析</h4><p>'+renderQuestion(q.analysis)+'</p></div>';
  html+='<div class="analysis-block"><h4>⚠️ 根因分析</h4><p>'+renderQuestion(rootCause)+'</p></div>';
  if(kb.knowledge)html+='<div class="analysis-block"><h4>📚 完整知识点梳理</h4><p>'+renderQuestion(kb.knowledge)+'</p></div>';
  if(kb.mnemonic)html+='<div class="analysis-mnemonic">🧠 记忆口诀：'+renderQuestion(kb.mnemonic)+'</div>';
  if(kb.keyPoints&&kb.keyPoints.length)html+='<div class="analysis-block analysis-kp"><h4>🔑 关键点</h4><ul>'+kb.keyPoints.map(p=>'<li>'+renderQuestion(p)+'</li>').join('')+'</ul></div>';
  ana.innerHTML=html;
  ana.style.display='block';
  if(window.renderMathInElement){renderMathInElement(ana,{delimiters:[{left:'\$',right:'\$',display:false}],throwOnError:false});}
  results[qi]={selected:k,correct:ok};
  renderSide();
  renderNavBar();
  if(window.renderMathInElement)renderMathInElement(document.getElementById('quizCard'),{delimiters:[{left:'\$',right:'\$',display:false}],throwOnError:false});
}
function renderNavBar(){
  const nw=document.getElementById('navWrap');
  if(!nw)return;
  nw.innerHTML=
    '<button class="btn btn-prev" onclick="prevQ()"'+(qi===0?' disabled':'')+'>← 上一题</button>'+
    '<button class="btn btn-next2" onclick="nextQ()"'+(qi===queue.length-1?' disabled':'')+'>'+(qi===queue.length-1?'完成本轮':'下一题 →')+'</button>';
}
function nextQ(){if(qi<queue.length-1){qi++;renderQ()}else{finishRound()}}
function prevQ(){if(qi>0){qi--;renderQ()}}
function renderSide(){
  const el=document.getElementById('sideList');
  el.innerHTML=queue.map((q,i)=>{
    const r=results[i];
    const cls=r?(r.correct?'correct':'wrong'):'';
    return '<div class="side-cell'+(i===qi?' active':'')+' '+cls+'" onclick="jumpTo('+i+')">'+(i+1)+'</div>';
  }).join('');
}
function jumpTo(i){qi=i;renderQ()}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const m=document.getElementById('drillModal');if(m&&m.classList.contains('open')){closeDrill();return}}
  if(document.getElementById('quizView').style.display==='none')return;
  if(e.key==='ArrowRight'&&qi<queue.length-1){e.preventDefault();nextQ()}
  if(e.key==='ArrowLeft'&&qi>0){e.preventDefault();prevQ()}
  if(e.key===' '){const ana=document.getElementById('ana');if(ana&&ana.style.display==='block'){e.preventDefault();nextQ()}}
});
async function finishRound(){
  const r=await fetch('/api/finish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roundId:roundId,date:today()})});
  const res=await r.json();
  document.getElementById('quizCard').innerHTML='<div style="text-align:center;padding:36px 0">'+
    '<div style="font-size:44px">'+(res.wrongCount?'💪':'🎉')+'</div>'+
    '<h2 style="margin:12px 0">本轮完成</h2>'+
    '<p style="color:var(--muted);font-size:14px">'+(res.wrongCount?res.wrongCount+' 个知识点答错，已重置到第 1 轮（明天到期）':'全部正确！记忆周期已推进到下一轮')+'</p></div>';
  document.getElementById('quizLog').textContent='';
}

function toggleCurve(){
  const sec=document.getElementById('curveSection');
  sec.classList.toggle('collapsed');
  if(!sec.classList.contains('collapsed'))renderCurve();
}
function setTrendMode(mode){
  trendMode=mode;
  document.getElementById('trendDayBtn').classList.toggle('active',mode==='day');
  document.getElementById('trendMonthBtn').classList.toggle('active',mode==='month');
  renderTrend();
}
function pad2(n){return String(n).padStart(2,"0")}
function east8TodayStr(){const d=new Date(Date.now()+8*3600*1000);return d.toISOString().slice(0,10)}
function trendBuckets(){
  const perDay={};
  (DB.answers||[]).forEach(a=>{const d=String(a.at||'').slice(0,10);if(!d)return;perDay[d]=(perDay[d]||0)+1});
  const addDay={};
  const qAddDay={};
  DB.items.forEach(i=>{
    const d=String(i.createdAt||i.firstLearned||'').slice(0,10);
    if(!d)return;
    addDay[d]=(addDay[d]||0)+1;
    qAddDay[d]=(qAddDay[d]||0)+QS.filter(q=>q.itemId===i.id).length;
  });
  const keys=[];
  if(trendMode==='month'){
    const todayStr=east8TodayStr();
    let [y,m]=todayStr.slice(0,7).split("-").map(Number);
    for(let i=5;i>=0;i--){let mm=m-i,yy=y;while(mm<=0){mm+=12;yy--}keys.push(yy+"-"+pad2(mm))}
  } else {
    const end=new Date(east8TodayStr()+"T00:00:00Z");
    for(let i=6;i>=0;i--){const d=new Date(end);d.setUTCDate(d.getUTCDate()-i);keys.push(d.toISOString().slice(0,10))}
  }
  const keyOf=d=>trendMode==='month'?d.slice(0,7):d;
  const sums={};
  const bump=(d,f)=>{const k=keyOf(d);const b=sums[k]||(sums[k]={ans:0,kp:0,q:0});b[f]+=1};
  Object.keys(perDay).forEach(d=>{for(let i=0;i<perDay[d];i++)bump(d,"ans")});
  Object.keys(addDay).forEach(d=>{for(let i=0;i<addDay[d];i++)bump(d,"kp")});
  Object.keys(qAddDay).forEach(d=>{for(let i=0;i<qAddDay[d];i++)bump(d,"q")});
  return keys.map(k=>({key:k,ans:sums[k]?sums[k].ans:0,kp:sums[k]?sums[k].kp:0,q:sums[k]?sums[k].q:0}));
}
function clampY(y,pt,pb){return Math.max(pt,Math.min(pb,y))}
function smoothPath(pts){
  if(!pts||pts.length<2)return "";
  let d="M "+pts[0].x+" "+pts[0].y;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i>0?i-1:i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6;
    const c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
    d+=" C "+c1x+" "+c1y+", "+c2x+" "+c2y+", "+p2.x+" "+p2.y;
  }
  return d;
}
function renderTrend(){
  const svg=document.getElementById("trendSvg");
  if(!svg)return;
  const data=trendBuckets();
  const W=960,H=330,PL=58,PR=40,PT=36,PB=56;
  const iw=W-PL-PR,ih=H-PT-PB;
  const dark=document.documentElement.dataset.theme==="dark";
  const grid=dark?"rgba(148,163,184,.15)":"rgba(71,85,105,.14)";
  const labelC=dark?"#94a3b8":"#64748b";
  const axisC=dark?"#475569":"#cbd5e1";
  if(!data.length){svg.innerHTML='<text x="'+(W/2)+'" y="'+(H/2)+'" fill="'+labelC+'" font-size="14" text-anchor="middle">暂无数据</text>';return}
  const COLORS={ans:"#2563eb",kp:"#16a34a",q:"#f59e0b"};
  const maxV=Math.max(4,...data.map(d=>Math.max(d.ans,d.kp,d.q)));
  const step=Math.pow(10,Math.floor(Math.log10(maxV)));
  const niceMax=Math.max(step,Math.ceil(maxV/step)*step);
  const xOf=i=>PL+(data.length===1?iw/2:i*(iw/(data.length-1)));
  const yOf=v=>PT+ih-(v/niceMax)*ih;
  let out='<defs>';
  out+='<linearGradient id="ansGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(37,99,235,.26)"/><stop offset="1" stop-color="rgba(37,99,235,0)"/></linearGradient>';
  out+='<filter id="trendShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="'+(dark?"#0b1220":"#334155")+'" flood-opacity="'+(dark?0.35:0.2)+'"/></filter>';
  out+='</defs>';
  for(let g=0;g<=4;g++){
    const v=niceMax*g/4,y=yOf(v);
    out+='<line x1="'+PL+'" y1="'+y+'" x2="'+(PL+iw)+'" y2="'+y+'" stroke="'+grid+'" stroke-width="1"/>';
    out+='<text x="'+(PL-12)+'" y="'+(y+4)+'" fill="'+labelC+'" font-size="11" text-anchor="end">'+(Math.round(v*10)/10)+'</text>';
  }
  const pts={ans:[],kp:[],q:[]};
  ["ans","kp","q"].forEach(s=>{pts[s]=data.map((d,i)=>({x:xOf(i),y:clampY(yOf(d[s]),PT,PT+ih),v:d[s]}))});
  const areaOf=p=>smoothPath(p)+' L '+p[p.length-1].x+' '+(PT+ih)+' L '+p[0].x+' '+(PT+ih)+' Z';
  out+='<path d="'+areaOf(pts.ans)+'" fill="url(#ansGrad)" stroke="none"/>';
  ["kp","q","ans"].forEach(s=>{out+='<path d="'+smoothPath(pts[s])+'" fill="none" stroke="'+COLORS[s]+'" stroke-width="2.4" stroke-linecap="round" filter="url(#trendShadow)"/>'});
  data.forEach((d,i)=>{
    const x=xOf(i);
    const lab=trendMode==="month"?(d.key.slice(0,4)+"年"+Number(d.key.slice(5))+"月"):d.key.slice(5).replace("-","/");
    out+='<text x="'+x+'" y="'+(PT+ih+24)+'" fill="'+labelC+'" font-size="11.5" text-anchor="middle">'+lab+'</text>';
    const entries=[{s:"ans",y:pts.ans[i].y,v:d.ans},{s:"kp",y:pts.kp[i].y,v:d.kp},{s:"q",y:pts.q[i].y,v:d.q}];
    entries.forEach(e=>{out+='<circle cx="'+x+'" cy="'+e.y+'" r="4" fill="var(--bg2)" stroke="'+COLORS[e.s]+'" stroke-width="2.2"/>'});
    const order=[0,1,2].map(i=>({i,y:entries[i].y})).sort((a,b)=>b.y-a.y);
    const placed=[];
    order.forEach(o=>{const e=entries[o.i];let ly=e.y-12;while(placed.some(p=>Math.abs(p-ly)<13))ly-=14;placed.push(ly);out+='<text x="'+x+'" y="'+ly+'" fill="'+COLORS[e.s]+'" font-size="11" font-weight="700" text-anchor="middle">'+e.v+'</text>'});
  });
  out+='<line x1="'+PL+'" y1="'+(PT+ih)+'" x2="'+(PL+iw)+'" y2="'+(PT+ih)+'" stroke="'+axisC+'" stroke-width="1"/>';
  out+='<text x="'+(PL+iw)+'" y="'+(PT+ih+46)+'" fill="'+labelC+'" font-size="11" text-anchor="end">'+(trendMode==="month"?"近 6 个月":"近 7 天")+" · "+(trendMode==="month"?"按月汇总":"按日汇总")+'</text>';
  ["ans","kp","q"].forEach((s,si)=>{
    out+='<circle class="trend-runner" r="3.5" fill="'+COLORS[s]+'" stroke="var(--bg2)" stroke-width="1.5"><animateMotion dur="6s" begin="'+(si*0.6)+'s" repeatCount="indefinite" path="'+smoothPath(pts[s])+'"/></circle>';
  });
  svg.innerHTML=out;
}
init();document.getElementById('startBtn').onclick=()=>startQuiz(false);document.getElementById('forceBtn').onclick=()=>startQuiz(true);
