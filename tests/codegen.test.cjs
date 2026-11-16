'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {render,normalizeSchema,zipStore}=require('../skills/peach-media-codegen/scripts/generate.cjs');
const example=require('../skills/peach-media-codegen/references/example-schema.json');
const {createDemoServer}=require('../prototype/mock-server.cjs');
const gen=()=>render(example);

test('deterministic generation produces 11 reviewable artifacts with tenant-safe request DTO',()=>{
  const first=gen(),second=gen();
  assert.deepEqual(first,second);
  assert.equal(first.files.length,11);
  const entity=first.files.find(f=>f.path.endsWith('/AssetTag.java'));
  assert.ok(entity.path.includes('/generated/assettag/'));
  assert.match(entity.content,/package com\.peachsoft\.media\.generated\.assettag;/);
  const dto=first.files.find(f=>f.path.endsWith('/AssetTagCreateRequest.java')).content;
  assert.doesNotMatch(dto,/private Long tenantId|private Long projectId/);
  const ctrl=first.files.find(f=>f.path.endsWith('/AssetTagController.java')).content;
  assert.match(ctrl,/accessPort\.requireAction\("media\.asset-tag:create"\)/);
  assert.match(ctrl,/accessPort\.requireResource\("media\.asset-tag", "read", id\)/);
  assert.match(ctrl,/accessPort\.trustedTenantId\(\)/);
  assert.match(first.files.find(f=>f.path.endsWith('.sql')).content,/tenant_id BIGINT NOT NULL/);
});

test('codegen rejects invalid names, duplicates, dangerous description, and tenant override',()=>{
  for(const edits of [
    {entityName:'../Exploit'},
    {packageName:'com.foo..evil'},
    {tableName:'tags;DROP'},
    {description:'hello\nDROP TABLE'},
    {fields:[{name:'tenantId',type:'Long',required:true}]},
    {fields:[{name:'name',type:'String',required:true},{name:'name',type:'Long',required:true}]},
    {fields:[{name:'id',type:'Long',required:true}]},
    {fields:[{name:'tagName',type:'Runtime',required:true}]}
  ])assert.throws(()=>normalizeSchema({...example,...edits}),{code:'INVALID_SCHEMA'});
});

test('MySQL DDL does not inject engine/collation, and entity fields import expected types',()=>{
  const result=render({...example,fields:[...example.fields,{name:'quota',type:'BigDecimal',required:false},{name:'activeAt',type:'LocalDateTime',required:false}]});
  const sql=result.files.find(f=>f.path.endsWith('.sql')).content;
  for(const disallowed of ['ENGINE=','CHARACTER SET','COLLATE'])assert.equal(sql.includes(disallowed),false);
  const entity=result.files.find(f=>f.path.endsWith('AssetTag.java')).content;
  assert.match(entity,/import java\.math\.BigDecimal;/);
  assert.equal(entity.split('import java.time.LocalDateTime;').length,2);
});

test('ZIP export is valid UTF-8 archive with all generated files',()=>{
  const files=gen().files,archive=zipStore(files);
  assert.equal(archive.readUInt32LE(0),0x04034b50);
  assert.equal(archive.readUInt32LE(archive.length-22),0x06054b50);
  assert.equal(archive.readUInt16LE(archive.length-14),files.length);
});

test('local codegen preview and ZIP endpoints return validated contents',async t=>{
  const server=createDemoServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(endpoint,body)=>fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schema:body})});
  const preview=await post('/demo/v1/codegen/preview',example);
  assert.equal(preview.status,200);
  const payload=await preview.json();assert.equal(payload.data.files.length,11);
  const zip=await post('/demo/v1/codegen/export',example);assert.equal(zip.status,200);assert.match(zip.headers.get('content-type'),/application\/zip/);
  const bytes=Buffer.from(await zip.arrayBuffer());assert.equal(bytes.readUInt32LE(0),0x04034b50);
  const bad=await post('/demo/v1/codegen/preview',{...example,fields:[{name:'tenantId',type:'String',required:true}]});
  assert.equal(bad.status,422);const err=await bad.json();assert.equal(err.code,'INVALID_SCHEMA');
});

test('developer console links to codegen workbench and UI is included',()=>{
  const root=path.resolve(__dirname,'..');const developer=fs.readFileSync(path.join(root,'prototype/developers/developer.js'),'utf8');
  assert.match(developer,/codegen\.html/);
  for(const file of ['prototype/developers/codegen.html','prototype/developers/codegen.js','prototype/developers/codegen.css','skills/peach-media-codegen/SKILL.md'])assert.ok(fs.existsSync(path.join(root,file)));
});
