const h=require('http'),f=require('fs'),p=require('path');
const root='C:/data/code/ky/错题集';
const quizDir=p.join(root,'ebbinghaus');
const stateFile=p.join(quizDir,'state.json');

function loadState(){
  if(f.existsSync(stateFile)){try{return JSON.parse(f.readFileSync(stateFile,'utf8'))}catch(e){}}
  return {answers:[]};
}
function saveState(s){f.writeFileSync(stateFile,JSON.stringify(s,null,2),'utf8');}

h.createServer((req,res)=>{
  if(req.url==='/api/answer'&&req.method==='POST'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      try{
        const item=JSON.parse(body);
        const state=loadState();
        state.answers.push(item);
        saveState(state);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true}));
      }catch(e){res.writeHead(500);res.end('bad')}
    });
    return;
  }
  if(req.url==='/api/finish'&&req.method==='POST'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      try{
        const {roundId,date}=JSON.parse(body);
        const state=loadState();
        const today=state.answers.filter(a=>a.roundId===roundId);
        const wrongIds=[...new Set(today.filter(a=>!a.correct).map(a=>a.id))];
        const itemIds=[...new Set(today.map(a=>a.itemId))];
        // 找到对应 queue 条目，更新
        const qf=p.join(quizDir,'queue.json');
        const q=JSON.parse(f.readFileSync(qf,'utf8'));
        const sched=q.schedule||[0,1,2,4,7,15,30];
        itemIds.forEach(id=>{
          const it=q.items.find(x=>x.id===id);
          if(!it)return;
          const itemWrong=today.some(a=>a.itemId===id&&!a.correct);
          const todayStr=date||new Date().toISOString().slice(0,10);
          it.reviews.push({date:todayStr,wrong:itemWrong});
          if(itemWrong){
            // 答错重置：下次复习 1 天后
            const d=new Date(todayStr); d.setDate(d.getDate()+1);
            it.dueDate=d.toISOString().slice(0,10);
            it.nextRound=1;
          }else{
            // 答对进入下一轮
            const r=it.nextRound||1;
            const gap=sched[r]!==undefined?sched[r]:30;
            const d=new Date(todayStr); d.setDate(d.getDate()+gap);
            it.dueDate=d.toISOString().slice(0,10);
            it.nextRound=r+1;
          }
        });
        f.writeFileSync(qf,JSON.stringify(q,null,2),'utf8');
        saveState(state);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true,wrongCount:wrongIds.length}));
      }catch(e){res.writeHead(500);res.end('bad')}
    });
    return;
  }
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/'||u==='')u='/index.html';
  const fp=p.join(quizDir,u);
  f.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);res.end('not found');return;}
    const ext=p.extname(fp);
    const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8'}[ext]||'text/plain; charset=utf-8';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});
    res.end(d);
  });
}).listen(4318,()=>console.log('ebbinghaus server on 4318'));