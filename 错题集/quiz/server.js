const h=require('http'),f=require('fs'),p=require('path');
const root='C:/data/code/ky/错题集/quiz';
const resultsFile=p.join(root,'results.json');
h.createServer((req,res)=>{
  if(req.url==='/api/answer'&&req.method==='POST'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      try{
        const item=JSON.parse(body);
        let list=[];
        if(f.existsSync(resultsFile)) list=JSON.parse(f.readFileSync(resultsFile,'utf8'));
        list.push(item);
        f.writeFileSync(resultsFile,JSON.stringify(list,null,2),'utf8');
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true,count:list.length}));
      }catch(e){res.writeHead(500);res.end('bad request')}
    });
    return;
  }
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/'||u==='')u='/index.html';
  const fp=p.join(root,u);
  f.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);res.end('not found');return;}
    const ext=p.extname(fp);
    const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'}[ext]||'text/plain; charset=utf-8';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});
    res.end(d);
  });
}).listen(4317,'0.0.0.0',()=>console.log('quiz server on 0.0.0.0:4317'));