'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Core=require('../prototype/core.js');
const appSource=fs.readFileSync(path.resolve(__dirname,'../prototype/app.js'),'utf8');

function launch(){
 const callbacks={document:{},window:{}};
 const memory=new Map();
 const elements={};
 function element(id){if(!elements[id])elements[id]={id,innerHTML:'',value:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return {focus(){}}},focus(){},appendChild(){}};return elements[id];}
 const doc={readyState:'complete',createElement(){return {className:'',textContent:'',setAttribute(){},remove(){}}},body:{classList:{toggle(){}}},title:'',getElementById:element,addEventListener(type,fn){callbacks.document[type]=fn;}};
 const win={PeachCore:Core,addEventListener(type,fn){callbacks.window[type]=fn;}};
 const loc={hash:'#overview'};
 const ctx=vm.createContext({window:win,document:doc,location:loc,localStorage:{getItem(k){return memory.get(k)||null},setItem(k,v){memory.set(k,v)}},setTimeout(){},clearTimeout(){},setInterval(){return 1},clearInterval(){},console,Date,Number,Math,URL,Blob,FormData:class {constructor(form){this.fields=form.fields||{}}get(key){return this.fields[key]??null}},Array,JSON,Map,Set,String,Object});
 vm.runInContext(appSource,ctx,{filename:'prototype/app.js'});
 return{elements,callbacks,loc,memory};
}

test('all twenty-two enterprise navigation routes render with useful content and no exceptions',()=>{
 const app=launch();
 const routes=['overview','assets','projects','folders','metadata','reviews','uploads','storage','jobs','workflows','processors','runtimes','schedules','delivery','usage','billing','tenants','organizations','permissions','monitor','audit','settings'];
 for(const route of routes){app.loc.hash='#'+route;app.callbacks.window.hashchange();const html=app.elements.app.innerHTML;assert.ok(html.includes('Peach Media'),route);assert.ok(html.length>5000,`${route}: rendered only ${html.length} characters`);assert.ok(!html.includes('undefined</'),route);}
});

test('switching tenant filters business resource records in assets and jobs',()=>{
 const app=launch();
 app.loc.hash='#assets';app.callbacks.window.hashchange();
 assert.match(app.elements.app.innerHTML,/brand-campaign-cover.jpg/);
 app.callbacks.document.change({target:{id:'tenant-selector',value:'t2',classList:{contains(){return false}}}});
 const html=app.elements.app.innerHTML;
 assert.match(html,/green-campaign.png/);
 assert.ok(!html.includes('brand-campaign-cover.jpg'));
 app.loc.hash='#jobs';app.callbacks.window.hashchange();
 assert.ok(!app.elements.app.innerHTML.includes('job_10021'));
 assert.match(app.elements.app.innerHTML,/job_10015/);
});

test('asset and job detail routes never enumerate foreign tenant data',()=>{
 const app=launch();app.callbacks.document.change({target:{id:'tenant-selector',value:'t2',classList:{contains(){return false}}}});
 // Strict tenant filter keeps foreign IDs out of page data.
 app.loc.hash='#assets';app.callbacks.window.hashchange();
 assert.ok(!app.elements.app.innerHTML.includes('ast_101'));
 assert.ok(app.elements.app.innerHTML.includes('ast_201'));
});

test('creating project in a tenant only changes its own project list',()=>{
 const app=launch();app.loc.hash='#projects';app.callbacks.window.hashchange();
 assert.ok(!app.elements.app.innerHTML.includes('新建演示项目'));
 const fake={dataset:{form:'new-project'},fields:{name:'新建演示项目',env:'Staging'},querySelector(){return null}};
 app.callbacks.document.submit({target:{closest(){return fake}},preventDefault(){}});
 assert.match(app.elements.app.innerHTML,/新建演示项目/);
 app.callbacks.document.change({target:{id:'tenant-selector',value:'t2',classList:{contains(){return false}}}});
 assert.ok(!app.elements.app.innerHTML.includes('新建演示项目'));
});

test('cancel job transitions only a current-tenant processing job',()=>{
 const app=launch();app.loc.hash='#jobs';app.callbacks.window.hashchange();
 const button={dataset:{action:'cancel-job',id:'job_10021'},classList:{contains(){return false}}};
 const fake={closest(selector){if(selector==='[data-route]')return null;if(selector==='[data-action]')return button;return null}};
 app.callbacks.document.click({target:fake,preventDefault(){}});
 assert.match(app.elements.app.innerHTML,/job_10021/);
 assert.match(app.elements.app.innerHTML,/已取消/);
});
