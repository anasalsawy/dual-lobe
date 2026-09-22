import http from 'node:http';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const upstream = (process.env.DUAL_LOBE_BACKEND_URL || '').replace(/\/$/, '');
const apiKey = process.env.DUAL_LOBE_API_KEY || '';

if (!upstream) {
  console.error('DUAL_LOBE_BACKEND_URL is required, e.g. https://proxy.example.com');
  process.exit(1);
}

const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};

function send(res, code, body, type='text/plain; charset=utf-8') { res.writeHead(code, {'content-type':type}); res.end(body); }

async function proxy(req, res) {
  const targetPath = req.url.slice('/api'.length) || '/';
  const target = upstream + targetPath;
  const headers = {...req.headers};
  delete headers.host; delete headers.connection; delete headers['content-length'];
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const chunks=[]; for await (const c of req) chunks.push(c); const body=chunks.length?Buffer.concat(chunks):undefined;
  let out;
  try { out = await fetch(target,{method:req.method,headers,body,redirect:'manual'}); }
  catch (err) { return send(res,502,`Upstream connection failed: ${err.message}`); }
  const responseHeaders={}; out.headers.forEach((v,k)=>{if(!['content-encoding','transfer-encoding','connection'].includes(k.toLowerCase()))responseHeaders[k]=v;});
  responseHeaders['x-content-type-options']='nosniff';
  res.writeHead(out.status,responseHeaders);
  if (!out.body) return res.end();
  const reader=out.body.getReader();
  try { while(true){const {done,value}=await reader.read();if(done)break;if(!res.write(Buffer.from(value)))await new Promise(r=>res.once('drain',r));} }
  catch { try{await reader.cancel()}catch{} }
  finally { res.end(); }
}

function serveStatic(req,res){
  let pathname; try { pathname = decodeURIComponent(new URL(req.url,'http://local').pathname); } catch { return send(res,400,'Bad request'); }
  if (pathname === '/') pathname='/index.html';
  const safe=normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/,'');
  let file=join(root,safe);
  if(!existsSync(file)||!statSync(file).isFile()) file=join(root,'index.html');
  const type=mime[extname(file).toLowerCase()]||'application/octet-stream';
  res.writeHead(200,{'content-type':type,'cache-control':file.endsWith('index.html')||file.endsWith('config.js')?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff'});
  createReadStream(file).pipe(res);
}

http.createServer((req,res)=>{
  if(req.url?.startsWith('/api/')) return proxy(req,res);
  if(req.url==='/healthz') return send(res,200,'ok');
  return serveStatic(req,res);
}).listen(port,()=>console.log(`Cognitive playground listening on :${port}, proxying /api -> ${upstream}`));
