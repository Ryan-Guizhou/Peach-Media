'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createDemoServer} = require('../prototype/mock-server.cjs');
async function withServer(fn){
  const server = createDemoServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const json=async(r)=>({status:r.status,body:await r.json()});
const call=(base,uri,method='GET',body,token='pm_demo_stellar')=>fetch(base+uri,{
  method,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':'it-test'},body:body?JSON.stringify(body):undefined
});

test('server serves all three standalone entries and rejects path traversal',async()=>withServer(async base=>{
  for(const p of ['/','/console/','/developers/','/openapi/']){
    const r=await fetch(base+p); assert.equal(r.status,200,p);
    assert.match(await r.text(),/Peach Media/);
  }
  const result=await fetch(base+'/%2e%2e/%2e%2e/etc/passwd');
  assert.notEqual(result.status,200);
}));

test('tenant-scoped API needs a key and cannot disclose foreign assets',async()=>withServer(async base=>{
  assert.equal((await fetch(base+'/openapi/v1/assets')).status,401);
  const a=await json(await call(base,'/openapi/v1/assets'));
  const b=await json(await call(base,'/openapi/v1/assets','GET',undefined,'pm_demo_lime'));
  assert.equal(a.status,200);assert.equal(b.status,200);
  assert.ok(a.body.data.some(v=>v.name==='brand-campaign-cover.jpg'));
  assert.ok(!b.body.data.some(v=>v.name==='brand-campaign-cover.jpg'));
}));

test('developer-created key can call API and uploads, jobs, events appear in enterprise activity',async()=>withServer(async base=>{
  const createKey=await json(await fetch(base+'/demo/v1/credentials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:'t1',name:'Integration Test',scopes:['assets:read','uploads:write','jobs:create','jobs:read','events:write']})}));
  assert.equal(createKey.status,201); const token=createKey.body.secret;
  const upload=await json(await call(base,'/openapi/v1/uploads','POST',{filename:'big-video.mp4',size:1048576,contentType:'video/mp4',projectId:'pr1'},token));
  assert.equal(upload.status,202);
  assert.match(upload.body.data.uploadId,/^upl_/);
  const completed=await json(await call(base,`/openapi/v1/uploads/${upload.body.data.uploadId}:complete`,'POST',{},token));
  assert.equal(completed.status,200);
  const assetId=completed.body.data.assetId;
  const job=await json(await call(base,'/openapi/v1/jobs','POST',{assetId,type:'VIDEO_TRANSCODE'},token));
  assert.equal(job.status,202);
  const event=await json(await call(base,'/openapi/v1/events:batch','POST',{events:[{eventId:'e2e-1',eventType:'asset.viewed',assetId}]},token));
  assert.equal(event.status,202);
  const activity=await json(await fetch(base+'/demo/v1/activity?tenantId=t1'));
  assert.equal(activity.status,200);
  assert.ok(activity.body.data.items.some(v=>v.category==='upload'));
  assert.ok(activity.body.data.items.some(v=>v.category==='job'));
  assert.ok(activity.body.data.items.some(v=>v.category==='event'));
  assert.equal(activity.body.data.totalCalls>=4,true);
  assert.equal((await call(base,'/openapi/v1/assets','GET',undefined,'pm_demo_lime')).status,200);
  assert.equal((await call(base,`/openapi/v1/jobs/${job.body.data.jobId}`,'GET',undefined,'pm_demo_lime')).status,404);
}));

test('API rejects wrong scope and repeated event does not double-count',async()=>withServer(async base=>{
  const token='pm_demo_stellar';
  const first=await json(await call(base,'/openapi/v1/events:batch','POST',{events:[{eventId:'x-1',eventType:'asset.viewed',assetId:'ast_101'}]},token));
  const second=await json(await call(base,'/openapi/v1/events:batch','POST',{events:[{eventId:'x-1',eventType:'asset.viewed',assetId:'ast_101'}]},token));
  assert.equal(first.status,202);assert.equal(second.status,202);
  assert.equal(second.body.data.accepted,0);
  const resp=await call(base,'/openapi/v1/jobs','POST',{assetId:'ast_201',type:'VIDEO_TRANSCODE'},token);
  assert.equal(resp.status,404);
}));
