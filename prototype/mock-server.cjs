'use strict';
/** Local-only prototype server. DO NOT deploy to a public network. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Core = require('./core.js');
const prototypeRoot = __dirname;
const repositoryRoot = path.resolve(__dirname, '..');
const fileTypes = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.md':'text/markdown; charset=utf-8','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const builtins = [
  ['pm_demo_stellar','t1'],['pm_demo_lime','t2'],['pm_demo_sail','t3']
];
function createDemoServer(){
  const state=Core.createSeed();
  const uploads=new Map(),credentials=new Map(),eventIds=new Set(),activity=[],calls=new Map();
  for(const [token,tenantId] of builtins)credentials.set(crypto.createHash('sha256').update(token).digest('hex'),{id:`demo_${tenantId}`,tenantId,name:'内置演示凭证',prefix:token.slice(0,12)+'…',scopes:['*'],status:'ACTIVE',createdAt:Core.now()});
  let sequence=1000;
  const nextId=prefix=>`${prefix}_${++sequence}`;
  const hashKey=key=>crypto.createHash('sha256').update(key).digest('hex');
  const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({...body,requestId:nextId('req')}));};
  const fail=(res,status,code,message)=>json(res,status,{code,message});
  const ok=(res,status,data)=>json(res,status,{data});
  const record=(tenantId,category,detail)=>{activity.unshift({id:nextId('act'),tenantId,category,detail,createdAt:Core.now()});if(activity.length>250)activity.pop();};
  const readBody=async req=>{
    let size=0,text='';
    for await(const chunk of req){size+=chunk.length;if(size>1048576){const e=new Error('BODY_TOO_LARGE');e.status=413;throw e;}text+=chunk.toString('utf8');}
    if(!text)return{};
    try { const parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('INVALID_JSON');return parsed; }
    catch {const e=new Error('INVALID_JSON');e.status=400;throw e;}
  };
  const serveFile=(req,res,pathname)=>{
    const route={'/':'index.html','/console/':'console/index.html','/developers/':'developers/index.html','/openapi/':'openapi/index.html'}[pathname] || pathname.replace(/^\//,'');
    const fromDocs=route.startsWith('docs/');
    const root=fromDocs?repositoryRoot:prototypeRoot;
    const local=path.resolve(root,route);
    if(!local.startsWith(root+path.sep)||local.includes('\0'))return fail(res,403,'FORBIDDEN','无效访问路径');
    if(!fs.existsSync(local)||!fs.statSync(local).isFile())return fail(res,404,'NOT_FOUND','页面不存在');
    const ext=path.extname(local);
    if(!Object.hasOwn(fileTypes,ext))return fail(res,415,'UNSUPPORTED','不支持的文件类型');
    res.writeHead(200,{'Content-Type':fileTypes[ext],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(local).pipe(res);
  };
  return http.createServer(async (req,res)=>{
    const raw=req.url||'/';
    let u;
    try{u=new URL(raw,'http://localhost');}catch{return fail(res,400,'BAD_URL','无效请求地址');}
    const route=u.pathname,method=req.method;
    if(!route.startsWith('/openapi/v1/')&&!route.startsWith('/demo/v1/')){
      if(method!=='GET'&&method!=='HEAD')return fail(res,405,'METHOD_NOT_ALLOWED','只读静态资源');
      return serveFile(req,res,route);
    }
    if(route==='/openapi/v1/health'&&method==='GET')return ok(res,200,{status:'DEMO_READY',note:'Local mock only. Not a production API.'});
    if(route.startsWith('/demo/v1/')){
      // These controls are purposely local-only and unauthenticated for prototype exploration.
      // The server CLI listens on loopback; never expose it to a public interface.
      if(route==='/demo/v1/activity'&&method==='GET'){
        const tenantId=u.searchParams.get('tenantId')||'t1';
        if(!state.tenants.some(t=>t.id===tenantId))return fail(res,404,'TENANT_NOT_FOUND','租户不存在');
        return ok(res,200,{items:activity.filter(x=>x.tenantId===tenantId).slice(0,20),totalCalls:calls.get(tenantId)||0,assets:state.assets.filter(x=>x.tenantId===tenantId&&x.createdViaApi),jobs:state.jobs.filter(x=>x.tenantId===tenantId&&x.createdViaApi)});
      }
      if(route==='/demo/v1/credentials'&&method==='GET'){
        const tenantId=u.searchParams.get('tenantId')||'t1';
        return ok(res,200,[...credentials.values()].filter(x=>x.tenantId===tenantId).map(({id,name,prefix,scopes,status,createdAt})=>({id,name,prefix,scopes,status,createdAt})));
      }
      if(route==='/demo/v1/credentials'&&method==='POST'){
        try{
          const body=await readBody(req);
          if(!state.tenants.some(x=>x.id===body.tenantId))return fail(res,400,'INVALID_TENANT','请选择有效演示租户');
          if(typeof body.name!=='string'||!body.name.trim()||body.name.length>64)return fail(res,400,'INVALID_NAME','凭证名称为必填且不超过64字');
          const permitted=['assets:read','uploads:write','jobs:create','jobs:read','events:write','usage:read'];
          const scopes=Array.isArray(body.scopes)?body.scopes.filter(s=>permitted.includes(s)):[];
          if(!scopes.length)return fail(res,400,'INVALID_SCOPE','至少指定一个许可范围');
          const secret=`pm_demo_${crypto.randomBytes(15).toString('hex')}`;
          const info={id:nextId('key'),tenantId:body.tenantId,name:body.name.trim(),prefix:secret.slice(0,12)+'…',scopes,status:'ACTIVE',createdAt:Core.now()};
          credentials.set(hashKey(secret),info); record(body.tenantId,'credential',`创建 API Key ${info.name}`);
          return json(res,201,{data:{...info,secret}});
        }catch(e){return fail(res,e.status||500,e.message,'无效请求');}
      }
      const revoke=route.match(/^\/demo\/v1\/credentials\/([^/]+):revoke$/);
      if(revoke&&method==='POST'){
        const tenantId=u.searchParams.get('tenantId')||'t1';
        const info=[...credentials.values()].find(x=>x.id===revoke[1]&&x.tenantId===tenantId);
        if(!info||info.id.startsWith('demo_'))return fail(res,404,'NOT_FOUND','找不到可撤销的凭证');
        info.status='REVOKED';record(tenantId,'credential',`撤销 API Key ${info.name}`);
        return ok(res,200,{id:info.id,status:'REVOKED'});
      }
      return fail(res,404,'NOT_FOUND','演示管理接口不存在');
    }
    const header=req.headers.authorization||'';
    const token=header.startsWith('Bearer ')?header.slice(7).trim():'';
    const credential=credentials.get(hashKey(token));
    if(!credential||credential.status!=='ACTIVE')return fail(res,401,'UNAUTHORIZED','演示 API Key 无效，请到开发者平台创建凭证');
    const tenantId=credential.tenantId;
    const must=(scope)=>credential.scopes.includes('*')||credential.scopes.includes(scope);
    const denied=()=>fail(res,403,'FORBIDDEN','当前 API Key 缺少所需的 Scope');
    calls.set(tenantId,(calls.get(tenantId)||0)+1);
    const assets=()=>Core.onlyTenant(state.assets,tenantId);
    try {
      if(route==='/openapi/v1/assets'&&method==='GET'){
        if(!must('assets:read'))return denied();
        return ok(res,200,assets().map(({id,name,type,size,status,project,createdAt})=>({id,name,type,size,status,project,createdAt})));
      }
      const getAsset=route.match(/^\/openapi\/v1\/assets\/([^/]+)$/);
      if(getAsset&&method==='GET'){
        if(!must('assets:read'))return denied();
        const asset=Core.requireOwned(state.assets,tenantId,getAsset[1]);
        return asset?ok(res,200,asset):fail(res,404,'NOT_FOUND','资产不存在');
      }
      if(route==='/openapi/v1/uploads'&&method==='POST'){
        if(!must('uploads:write'))return denied();
        const b=await readBody(req);
        if(typeof b.filename!=='string'||!b.filename.trim()||b.filename.length>180||!Number.isSafeInteger(b.size)||b.size<0||!/^[-+\w.]+\/[-+\w.]+$/.test(b.contentType||''))return fail(res,422,'INVALID_UPLOAD','需要有效的 filename、非负整数字节 size、contentType');
        const session={uploadId:nextId('upl'),assetId:nextId('ast'),tenantId,filename:b.filename.trim(),size:b.size,contentType:b.contentType,project:b.projectId||'默认项目',status:'PENDING_UPLOAD',createdAt:Core.now()};
        uploads.set(session.uploadId,session);record(tenantId,'upload',`创建上传会话 ${session.filename}`);
        return ok(res,202,{uploadId:session.uploadId,assetId:session.assetId,status:session.status,mode:'SIMULATED_MULTIPART',note:'不接收真实文件字节'});
      }
      const complete=route.match(/^\/openapi\/v1\/uploads\/([^/]+):complete$/);
      if(complete&&method==='POST'){
        if(!must('uploads:write'))return denied();
        const session=uploads.get(complete[1]);
        if(!session||session.tenantId!==tenantId)return fail(res,404,'NOT_FOUND','上传会话不存在');
        if(session.status==='COMPLETED')return ok(res,200,{uploadId:session.uploadId,assetId:session.assetId,status:'QUARANTINED',replay:true});
        session.status='COMPLETED';
        const type=session.contentType.startsWith('video/')?'video':session.contentType.startsWith('image/')?'image':session.contentType.startsWith('audio/')?'audio':'document';
        const asset=Core.createAsset({name:session.filename,size:session.size,type,project:session.project},tenantId);
        asset.id=session.assetId;asset.createdViaApi=true;state.assets.unshift(asset);
        record(tenantId,'upload',`上传完成 ${session.filename}（模拟隔离区）`);
        return ok(res,200,{uploadId:session.uploadId,assetId:asset.id,status:asset.status});
      }
      if(route==='/openapi/v1/jobs'&&method==='POST'){
        if(!must('jobs:create'))return denied();
        const b=await readBody(req);
        const asset=Core.requireOwned(state.assets,tenantId,b.assetId);
        if(!asset)return fail(res,404,'NOT_FOUND','资源不存在或不在当前租户');
        const type=typeof b.type==='string'&&/^[A-Z_]{3,40}$/.test(b.type)?b.type:'IMAGE_RESIZE';
        const job=Core.createJob(tenantId,asset.id,type,state.assets);job.createdViaApi=true;state.jobs.unshift(job);
        record(tenantId,'job',`提交处理任务 ${job.id} (${type})`);
        return ok(res,202,{jobId:job.id,status:job.status,statusUrl:`/openapi/v1/jobs/${job.id}`});
      }
      const getJob=route.match(/^\/openapi\/v1\/jobs\/([^/]+)$/);
      if(getJob&&method==='GET'){
        if(!must('jobs:read'))return denied();
        const job=Core.requireOwned(state.jobs,tenantId,getJob[1]);
        return job?ok(res,200,job):fail(res,404,'NOT_FOUND','任务不存在');
      }
      if(route==='/openapi/v1/events:batch'&&method==='POST'){
        if(!must('events:write'))return denied();
        const b=await readBody(req),list=b.events;
        if(!Array.isArray(list)||!list.length||list.length>100)return fail(res,422,'INVALID_EVENTS','events 需要为 1~100 条事件');
        let accepted=0,duplicates=0;
        for(const event of list){
          if(!event||typeof event.eventId!=='string'||!event.eventId||!Core.requireOwned(state.assets,tenantId,event.assetId))return fail(res,422,'INVALID_EVENT','事件格式或资产归属无效');
          const key=tenantId+':'+event.eventId;
          if(eventIds.has(key)){duplicates++;continue;}
          eventIds.add(key);accepted++;record(tenantId,'event',`${String(event.eventType||'event.reported').slice(0,64)} · ${event.assetId}`);
        }
        return ok(res,202,{accepted,duplicates});
      }
      if(route==='/openapi/v1/usage/summary'&&method==='GET'){
        if(!must('usage:read'))return denied();
        const s=Core.summarize(state.assets,state.jobs,tenantId);
        return ok(res,200,{...s,apiCalls:calls.get(tenantId)||0,events:activity.filter(x=>x.tenantId===tenantId&&x.category==='event').length});
      }
      return fail(res,404,'NOT_FOUND','接口不存在或方法不受支持');
    }catch(e){return fail(res,e.status||500,e.status?e.message:'INTERNAL_ERROR',e.status?'请求体或参数无效':'演示服务处理失败');}
  });
}
if(require.main===module){
  const port=Number(process.env.PORT)||8080;
  const server=createDemoServer();
  server.listen(port,'127.0.0.1',()=>{
    console.log(`Peach Media demo at http://127.0.0.1:${port}/`);
    console.log('Local-only in-memory mock. Never expose this server to the Internet.');
  });
}
module.exports={createDemoServer};
