'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../prototype/core.js');

test('seed includes tenant-isolated DAM, jobs, integrations, organization and quotas views',()=>{
 const s=C.createSeed();assert.equal(s.version,2);assert.equal(s.tenants.length,3);assert.ok(s.assets.length>10);
 assert.equal(C.onlyTenant(s.assets,'t1').length,12);
 assert.equal(C.onlyTenant(s.assets,'t2').length,1);
 assert.equal(C.onlyTenant(s.assets,'t3').length,1);
 assert.ok(C.onlyTenant(s.jobs,'t1').length>3);assert.ok(C.onlyTenant(s.orgs,'t1').length>2);
 assert.ok(s.workers.some(w=>w.runtime==='Docker'));
 assert.ok(s.workers.some(w=>w.runtime==='Kubernetes'));
});

test('tenant boundary requires matching tenant even for known resource ID',()=>{
 const s=C.createSeed();
 assert.equal(C.requireOwned(s.assets,'t2','ast_101'),null);
 assert.equal(C.requireOwned(s.assets,'t1','ast_201'),null);
 assert.equal(C.requireOwned(s.assets,'t1','ast_101').name,'brand-campaign-cover.jpg');
 assert.throws(()=>C.createJob('t2','ast_101','IMAGE_RESIZE',s.assets),/ASSET_NOT_OWNED/);
});

test('job transitions prevent illegal mutation and retain attempt history',()=>{
 const s=C.createSeed();const job=s.jobs.find(j=>j.id==='job_10017');
 let r=C.transitionJob(job,'RUNNING');assert.equal(r.ok,true);assert.equal(r.job.status,'RUNNING');
 r=C.transitionJob(r.job,'SUCCEEDED');assert.equal(r.ok,true);assert.equal(r.job.progress,100);
 assert.equal(C.transitionJob(r.job,'FAILED').ok,false);
 const failed=s.jobs.find(j=>j.status==='FAILED');const retry=C.transitionJob(failed,'QUEUED');
 assert.equal(retry.ok,true);assert.equal(retry.job.attempt,failed.attempt+1);assert.equal(retry.job.progress,0);
 assert.equal(C.transitionJob(job,'WHATEVER').ok,false);
});

test('new asset starts quarantined and new job is queueable only with ownership',()=>{
 const asset=C.createAsset({name:'素材 <demo>.mp4',size:2**31,type:'video',project:'视频平台'},'t9');
 assert.equal(asset.status,'QUARANTINED');assert.equal(asset.tenantId,'t9');
 assert.equal(asset.name,'素材 <demo>.mp4');
 const job=C.createJob('t9',asset.id,'VIDEO_TRANSCODE',[asset]);
 assert.equal(job.status,'QUEUED');assert.equal(job.progress,0);
 assert.equal(job.attempt,1);
 assert.throws(()=>C.createAsset({name:'',size:5},'t9'),/INVALID_ASSET/);
});

test('aggregate respects tenant filtering; URL protocol policy rejects script schemes',()=>{
 const s=C.createSeed();const x=C.summarize(s.assets,s.jobs,'t2');
 assert.equal(x.totalAssets,1);assert.equal(x.totalBytes,8400000);
 assert.equal(C.safeHref('javascript:alert(1)'),null);
 assert.equal(C.safeHref('file:///etc/passwd'),null);
 assert.ok(C.safeHref('https://example.org/callback'));
 assert.equal(C.percentage(50,200),25);
 assert.equal(C.percentage(100,0),0);
 assert.equal(C.bytes(0),'0 B');
});
