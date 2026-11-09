'use strict';
(async function(){
  const text=document.getElementById('live-health');
  if(!text)return;
  if(!/^https?:$/.test(location.protocol)){text.textContent='静态预览 · 使用本地模拟服务可体验 API 联动';return;}
  try{const r=await fetch('/openapi/v1/health',{signal:AbortSignal.timeout(2200)});const data=await r.json();text.textContent=r.ok&&data.data?.status==='DEMO_READY'?'● 本地 API 已连接，可体验跨入口联动':'静态服务 · API 模拟服务未启动';}
  catch{text.textContent='静态服务 · 请运行 node prototype/mock-server.cjs';}
})();
