'use strict';
let DB=null,QS=[],page=1,pageSize=10,queue=[],qi=0,roundId='',forceMode=false;

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

async function init(){
  document.documentElement.dataset.theme=localStorage.getItem('eb_theme')||'dark';
  updateThemeBtn();
  const [dbR,q1,q2]=await Promise.all([fetch('/api/db'),fetch('/questions.json'),fetch('/ds-questions.json')]);
  DB=await dbR.json();
  const a=await q1.json(),b=await q2.json();
  QS=[...(a.questions||[]),...(b.questions||[])];
  const t=today();
  document.getElementById('todayBadge').textContent='今天 '+t;
  renderStats();renderCurve();fillSubjectFilter();renderAll();renderDueBar();
}

function updateThemeBtn(){
  const dark=document.documentElement.dataset.theme==='dark';
  document.getElementById('themeBtn').textContent=dark?'☀️ 浅色':'🌙 深色';
}
function toggleTheme(){
  document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  localStorage.setItem('eb_theme',document.documentElement.dataset.theme);
  updateThemeBtn();renderCurve();
}

function dueItems(){const t=today();return DB.items.filter(i=>i.status==='learning'&&i.dueDate<=t)}
function renderStats(){
  const t=today();
  const due=DB.items.filter(i=>i.status==='learning'&&i.dueDate<=t).length;
  const learn=DB.items.filter(i=>i.status==='learning').length;
  const mast=DB.items.filter(i=>i.status==='mastered').length;
  const rev=(DB.answers||[]).length;
  const s=document.getElementById('stats');
  s.innerHTML=
    '<div class="stat orange"><div class="num">'+due+'</div><div class="label">今日到期</div></div>'+
    '<div class="stat blue"><div class="num">'+learn+'</div><div class="label">学习中</div></div>'+
    '<div class="stat green"><div class="num">'+mast+'</div><div class="label">已掌握</div></div>'+
    '<div class="stat purple"><div class="num">'+rev+'</div><div class="label">累计作答</div></div>';
}
function renderDueBar(){
  const due=dueItems();const d=document.getElementById('quizDesc');
  const btn=document.getElementById('startBtn');
  if(due.length){d.textContent='今天有 '+due.length+' 个知识点到期，答错将重置记忆周期。';btn.disabled=false;}
  else{d.textContent='今天没有到期复习，可以用「全部练习」巩固全部知识点。';btn.disabled=true;}
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
  return DB.items.filter(i=>{
    if(kw&&!i.id.toLowerCase().includes(kw))return false;
    if(sub&&i.subject!==sub)return false;
    if(st==='learning'&&i.status!=='learning')return false;
    if(st==='mastered'&&i.status!=='mastered')return false;
    if(st==='due'&&!(i.status==='learning'&&i.dueDate<=t))return false;
    if(rev&&(i.reviews||[]).length<rev)return false;
    return true;
  });
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
    const due=i.status==='learning'&&i.dueDate<=t;
    const tag=i.status==='mastered'?'<span class="tag mastered">已掌握</span>':due?'<span class="tag due">今日到期</span>':'<span class="tag learning">学习中</span>';
    return '<tr><td style="text-align:left;font-weight:600">'+esc(i.id)+'</td><td>'+esc(i.subject)+'</td><td>'+tag+'</td><td>'+qCount+' 题</td><td>第 '+i.round+' 轮</td><td>'+(i.status==='mastered'?'—':i.dueDate)+'</td><td>'+(i.reviews||[]).length+' 次</td><td><button class="btn ghost" onclick="resetItem(\''+i.id+'\')">重置</button></td></tr>';
  }).join(''):'<tr><td colspan="8" class="empty">没有符合条件的数据</td></tr>';
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
  queue=[];qi=0;
  items.forEach(it=>{
    const pool=QS.filter(q=>q.itemId===it.id);
    if(!pool.length)return;
    const shuffled=pool.slice().sort(()=>Math.random()-.5);
    shuffled.forEach(q=>queue.push(q));
  });
  if(!queue.length){document.getElementById('quizDesc').textContent='题库为空，暂无可用练习。';return;}
  document.getElementById('mainView').style.display='none';
  document.getElementById('quizView').style.display='';
  renderQ();
}
function exitQuiz(){
  document.getElementById('quizView').style.display='none';
  document.getElementById('mainView').style.display='';
  document.getElementById('quizLog').textContent='';
  init();
}
function renderQ(){
  if(qi>=queue.length){finishRound();return;}
  const q=queue[qi];
  const card=document.getElementById('quizCard');
  card.innerHTML='<div class="meta">第 '+(qi+1)+' / '+queue.length+' 题 · '+esc(q.subject)+' · '+esc(q.topic)+' · 单选</div>'+
    '<div class="q">'+renderQuestion(q.question)+'</div>'+
    '<div id="opts">'+Object.keys(q.options).map(k=>'<div class="opt" data-k="'+k+'" onclick="choose(\''+k+'\')"><span class="badge">'+k+'</span>'+renderQuestion(q.options[k])+'</div>').join('')+'</div>'+
    '<div class="analysis" id="ana"></div><div id="nextWrap"></div>';
}
const FENCE='```';
function renderQuestion(text){
  const parts=String(text).split(FENCE);
  let out='';
  parts.forEach((part,i)=>{
    if(i%2===0){out+=esc(part).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/([^`]|^)`([^`]+)`([^`]|$)/g,'$1<code>$2</code>$3');}
    else{const nl=part.replace(/^\n/,'').replace(/\n$/,'');out+='<pre><code>'+esc(nl)+'</code></pre>';}
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
  fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roundId:roundId,itemId:q.itemId,id:q.id,topic:q.topic,selected:k,answer:q.answer,correct:ok,at:new Date().toISOString()})});
  const ana=document.getElementById('ana');
  ana.innerHTML='<b>解析：</b>'+renderQuestion(q.analysis);
  ana.style.display='block';
  const nw=document.getElementById('nextWrap');
  nw.innerHTML='<button class="btn-next" onclick="nextQ()">'+(qi===queue.length-1?'完成本轮 →':'下一题 →')+'</button>';
}
function nextQ(){qi++;renderQ()}
async function finishRound(){
  const r=await fetch('/api/finish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roundId:roundId,date:today()})});
  const res=await r.json();
  document.getElementById('quizCard').innerHTML='<div style="text-align:center;padding:36px 0">'+
    '<div style="font-size:44px">'+(res.wrongCount?'💪':'🎉')+'</div>'+
    '<h2 style="margin:12px 0">本轮完成</h2>'+
    '<p style="color:var(--muted);font-size:14px">'+(res.wrongCount?res.wrongCount+' 个知识点答错，已重置到第 1 轮（明天到期）':'全部正确！记忆周期已推进到下一轮')+'</p></div>';
  document.getElementById('quizLog').textContent='';
}

init();document.getElementById('startBtn').onclick=()=>startQuiz(false);document.getElementById('forceBtn').onclick=()=>startQuiz(true);
