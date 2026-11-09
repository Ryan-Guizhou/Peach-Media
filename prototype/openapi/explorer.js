/* Open API explorer: a separate service-facing product entry. Works against local mock API only. */
(function(){'use strict';
const endpoints=[
 {id:'health',method:'GET',path:()=>'/openapi/v1/health',title:'服务健康',desc:'查询独立 Open API 的可用性',auth:false},
 {id:'assets',method:'GET',path:()=>'/openapi/v1/assets',title:'资产列表',desc:'按 API Key 的可信租户获取授权资产',auth:true},
 {id:'upload',method:'POST',path:()=>'/openapi/v1/uploads',title:'创建上传会话',desc:'申请模拟直传，返回 uploadId 和 assetId',auth:true,body:()=>({projectId:'pr1',filename:'demo-product-video.mp4',size:1048576,contentType:'video/mp4'})},
 {id:'complete',method:'POST',path:s=>`/openapi/v1/uploads/${encodeURIComponent(s.lastUploadId||'upl_000')}:complete`,title:'完成上传',desc:'模拟完成文件上传并进入隔离状态',auth:true,body:()=>({})},
 {id:'job',method:'POST',path:()=>'/openapi/v1/jobs',title:'创建处理任务',desc:'异步提交并获取 Job ID',auth:true,body:s=>({assetId:s.lastAssetId||'ast_101',type:'VIDEO_TRANSCODE'})},
 {id:'job-status',method:'GET',path:s=>`/openapi/v1/jobs/${encodeURIComponent(s.lastJobId||'job_10021')}`,title:'任务状态',desc:'查询 Job 和 Attempt 信息',auth:true},
 {id:'event',method:'POST',path:()=>'/openapi/v1/events:batch',title:'批量事件上报',desc:'事件去重、租户校验与用量记录',auth:true,body:s=>({events:[{eventId:`evt_${Date.now()}`,eventType:'asset.viewed',assetId:s.lastAssetId||'ast_101'}]})},
 {id:'usage',method:'GET',path:()=>'/openapi/v1/usage/summary',title:'用量统计',desc:'查询当前 API Key 作用域内的调用统计',auth:true}
];
const byId=id=>endpoints.find(x=>x.id===id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let chosen='assets',token='pm_demo_stellar',live=false,busy=false,requestBody='',lastResult=null,history=[],lastUploadId='',lastAssetId='',lastJobId='',fullFlow=[];
const current=()=>byId(chosen);
const jsonPre=(obj)=>JSON.stringify(obj,null,2);
function setEndpoint(id){if(!byId(id))return;chosen=id;requestBody=current().body?jsonPre(current().body({lastAssetId,lastUploadId,lastJobId})):' ';lastResult=null;render();}
function callout(){return live?`<div class="portal-alert success">本地 Node 模拟 API 已连接。以下操作会产生实际 HTTP 请求，并更新演示服务的内存数据；不会上传真实文件或启动容器。</div>`:`<div class="portal-alert">当前处于静态预览，无法实际执行 API 请求。请在项目根目录运行 <code>node prototype/mock-server.cjs</code> 后访问 <code>http://127.0.0.1:8080/openapi/</code>。</div>`;}
function render(){const e=current();const path=e.path({lastAssetId,lastUploadId,lastJobId});document.title=`${e.title} · Peach Media Open API`;
  const side=`<aside class="openapi-side"><a class="entry-brand" href="../index.html"><span class="brand-peach">◉</span><span>Peach Media<small>OPEN API / V1</small></span></a><div class="portal-eyebrow" style="color:#9cacf1">REST ENDPOINTS</div><nav class="api-list" aria-label="Open API 端点">${endpoints.map(x=>`<button type="button" data-endpoint="${x.id}" class="${chosen===x.id?'active':''}" ${chosen===x.id?'aria-current="true"':''}><span class="verb ${x.method==='POST'?'post':''}">${x.method}</span><strong>${esc(x.title)}</strong><small>${esc(x.path({lastUploadId,lastAssetId,lastJobId}))}</small></button>`).join('')}</nav><p style="font-size:10px;color:#a5afd5;margin-top:27px">MOCK DATA ONLY · NO REAL FILE BYTES</p></aside>`;
  const header=`<header class="openapi-head"><div><strong>Open API</strong> <span class="api-meta">/ ${esc(e.title)}</span></div><nav style="display:flex;gap:8px;flex-wrap:wrap" aria-label="其他产品入口"><a class="portal-link" href="../console/index.html">企业控制台 ↗</a><a class="portal-link" href="../developers/index.html">开发者平台 ↗</a><a class="portal-link" href="../index.html">入口导航 ↗</a></nav></header>`;
  const work=`<main id="api-main" class="openapi-main"><div class="portal-eyebrow">PEACH MEDIA / PUBLIC REST CONTRACT</div><h1 class="portal-title">Open API 实时调试器</h1><p class="portal-subtitle">独立服务入口 <code>/openapi/v1/*</code> · API Key 的租户和 Scope 权限在服务端校验 · ${live?'<span class="pill">HTTP Mock 已连接</span>':'<span class="pill warn">离线静态预览</span>'}</p>${callout()}
  <div class="portal-panel" style="margin-top:19px"><div class="portal-grid two">${['开发者平台创建凭证','调用 Upload API','提交 Job 与事件上报','回到企业台查看活动'].map((s,i)=>`<div class="portal-list-row"><b style="color:#6355e8">0${i+1}</b><span>${s}</span></div>`).join('')}</div></div>
  <section class="portal-panel portal-card"><div class="panel-head"><h3>完整数据闭环 · 一键验证</h3><span class="pill blue">HTTP / 上传 → 处理 → 上报 → 用量</span></div><p class="portal-inline">使用下方的演示 API Key 依次发送五次 HTTP 请求，观察不同入口共享的服务状态。</p><div class="api-flow">${['上传会话','完成并创建资产','异步处理任务','事件上报 + 用量'].map((n,i)=>`<div class="api-flow-item"><span class="circle">0${i+1}</span><strong>${n}</strong><small>${['UPLOADS','QUARANTINE','JOBS','EVENTS'][i]}</small></div>`).join('')}</div><div class="portal-toolbar" style="margin-bottom:0">${button('▶ 运行完整 HTTP 演示','run-flow','primary',busy||!live?'disabled':'')}${button('打开企业控制台核对','go-enterprise','', '')}</div>${fullFlow.length?`<div class="portal-panel"><div class="portal-list">${fullFlow.map(x=>`<div class="portal-list-row"><span>${esc(x.step)}</span><span class="pill ${x.ok?'':'warn'}">HTTP ${x.status}</span></div>`).join('')}</div></div>`:''}</section>
  <section class="portal-panel"><div class="portal-eyebrow">REQUEST LAB / AUTHENTICATED API</div><h2 style="margin:8px 0 15px;font-size:21px">${esc(e.title)} <small style="font-weight:400;color:#8892ab">· ${esc(e.desc)}</small></h2><div class="api-endpoint"><span class="method ${e.method==='POST'?'post':''}">${e.method}</span><span>${esc(path)}</span></div><div class="api-workbench"><div class="portal-card"><h3>请求配置</h3><div class="portal-form"><label>Authorization: Bearer API Key<input class="portal-input" id="api-token" aria-label="API Key" type="password" autocomplete="off" value="${esc(token)}"></label><div class="api-inline">演示预置：<code>pm_demo_stellar</code>（t1）和 <code>pm_demo_lime</code>（t2）；也可以粘贴开发者平台创建的 Key。</div>${e.body?`<label>请求 JSON<textarea id="request-json" class="portal-textarea" spellcheck="false">${esc(requestBody.trim()||jsonPre(e.body({lastUploadId,lastAssetId,lastJobId})))}</textarea></label>`:'<div class="portal-alert info">该请求不包含 JSON Body。</div>'}<div class="api-run">${button(busy?'正在请求…':'发送 HTTP 请求','send','primary',busy||!live?'disabled':'')}${button('复制 cURL','copy-curl')}</div></div></div><div class="portal-card"><div class="panel-head"><h3>响应</h3>${lastResult?`<span class="api-result-status ${lastResult.status>=400?'error':''}">HTTP ${lastResult.status}</span>`:'<span class="pill muted">尚未发送</span>'}</div>${codeBlock(lastResult?jsonPre(lastResult.body):'{\n  "message": "选择接口，填写参数后发送请求。"\n}')}</div></div></section>
  <section class="portal-panel portal-card"><div class="panel-head"><h3>最近的 API 调试请求</h3>${button('清空本页记录','clear-history','sm')}</div>${history.length?`<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>方法</th><th>路径</th><th>响应</th><th>时间</th></tr></thead><tbody>${history.map(x=>`<tr><td><b>${esc(x.method)}</b></td><td><code>${esc(x.path)}</code></td><td><span class="pill ${x.status<400?'':'warn'}">${x.status}</span></td><td>${esc(x.time)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="portal-empty">还没有 HTTP 请求记录</div>'}</section>
  <p style="font-size:11px;color:#8a94aa;margin:22px 0">此页面是可运行的 Mock API 调试器。生产版本须独立部署 Open API Gateway、鉴权、限流、签名上传与持久化服务，不依赖浏览器会话。</p></main>`;
  document.getElementById('explorer-root').innerHTML=`<div class="openapi-layout">${side}<div>${header}${work}</div></div>`;
}
function button(label,action,cls='',attrs=''){return `<button type="button" data-action="${action}" class="portal-button ${cls}" ${attrs}>${label}</button>`;}
function codeBlock(text){return `<pre class="portal-code" id="response-panel" aria-live="polite"><code>${esc(text)}</code></pre>`;}
async function req(endpoint,{bodyOverride}={}){
  const path=endpoint.path({lastUploadId,lastAssetId,lastJobId});
  const method=endpoint.method;
  const body=method==='POST'?bodyOverride??endpoint.body?.({lastUploadId,lastAssetId,lastJobId})??{}:undefined;
  const r=await fetch(path,{method,headers:{...(endpoint.auth?{'Authorization':`Bearer ${token}`} :{}),'Content-Type':'application/json','Idempotency-Key':`demo-${Date.now()}-${Math.random().toString(16).slice(2)}`},body:method==='POST'?JSON.stringify(body):undefined});
  const response=await r.json();
  history.unshift({method,path,status:r.status,time:new Date().toLocaleTimeString('zh-CN')});if(history.length>20)history.pop();
  if(response.data?.uploadId)lastUploadId=response.data.uploadId;
  if(response.data?.assetId)lastAssetId=response.data.assetId;
  if(response.data?.jobId)lastJobId=response.data.jobId;
  return {status:r.status,body:response,ok:r.ok};
}
async function send(){if(busy||!live)return;busy=true;let e=current();
  try{let b;if(e.body){try{b=JSON.parse(document.getElementById('request-json').value);}catch{throw Error('请求 Body 必须是有效 JSON');}}
    token=document.getElementById('api-token')?.value.trim()||token;
    lastResult=await req(e,{bodyOverride:b});requestBody=e.body?jsonPre(b):' ';
  }catch(err){lastResult={status:0,body:{code:'REQUEST_ERROR',message:err.message}};}finally{busy=false;render();}}
async function runFlow(){if(busy||!live)return;token=document.getElementById('api-token')?.value.trim()||token;busy=true;fullFlow=[];lastResult=null;render();
  try{
    const steps=[['创建上传会话','upload'],['完成分片上传','complete'],['提交异步处理任务','job'],['模拟数据事件上报','event'],['查询资源使用量','usage']];
    for(const [step,id] of steps){const r=await req(byId(id));fullFlow.push({step,ok:r.ok,status:r.status});lastResult=r;render();if(!r.ok)break;}
  }catch(e){lastResult={status:0,body:{code:'NETWORK_ERROR',message:e.message}};fullFlow.push({step:'网络请求失败',ok:false,status:0});}
  finally{busy=false;render();}
}
function curl(){const e=current(),path=e.path({lastUploadId,lastAssetId,lastJobId});const json=e.body?(document.getElementById('request-json')?.value||requestBody):'';return `curl -X ${e.method} 'http://127.0.0.1:8080${path}'${e.auth?` \\\n  -H 'Authorization: Bearer ${token}'`:''}${e.method==='POST'?` \\\n  -H 'Content-Type: application/json' \\\n  -d '${json}'`:''}`;}
async function probe(){if(!/^https?:$/.test(location.protocol)){live=false;render();return;}try{const r=await fetch('/openapi/v1/health',{signal:AbortSignal.timeout(2500)});const body=await r.json();live=r.ok&&body.data?.status==='DEMO_READY';}catch{live=false;}render();}
document.addEventListener('click',e=>{const endpoint=e.target.closest('[data-endpoint]');if(endpoint){setEndpoint(endpoint.dataset.endpoint);return;}const a=e.target.closest('[data-action]');if(!a)return;switch(a.dataset.action){case 'send':send();break;case 'run-flow':runFlow();break;case 'copy-curl':{const t=curl();navigator.clipboard?.writeText(t).then(()=>{a.textContent='已复制';setTimeout(()=>a.textContent='复制 cURL',1500)}).catch(()=>{lastResult={status:0,body:{message:'剪贴板不可用，请手动复制请求代码'}};render()});break;}case 'clear-history':history=[];render();break;case 'go-enterprise':location.href='../console/index.html';break;}});
document.addEventListener('change',e=>{if(e.target.id==='api-token')token=e.target.value.trim();});
document.addEventListener('input',e=>{if(e.target.id==='api-token')token=e.target.value;});
setEndpoint('assets');probe();
})();
