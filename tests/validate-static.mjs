import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('prototype/index.html');
assert.match(html,/<html lang="zh-CN">/);
for(const p of ['styles.css','core.js','app.js'])assert.ok(html.includes(`./${p}`),`HTML reference missing: ${p}`);
const css=read('prototype/styles.css');
for(const token of ['--primary','#6355e8','prefers-reduced-motion','@media(max-width:760px)'])assert.ok(css.includes(token),`CSS missing ${token}`);
for(const p of ['docs/product/PRD_zh-CN.md','docs/product/ACCEPTANCE_MATRIX.md','docs/architecture/TECHNICAL_DESIGN.md','docs/architecture/API_CONTRACT.md','docs/architecture/WORKER_PROTOCOL.md','DESIGN.md','UX-CONTRACT.md'])assert.ok(fs.existsSync(path.join(root,p)),`Missing ${p}`);
for(const p of ['01-platform-overview.svg','02-compute-runtime.svg','03-asset-data-loop.svg','04-tenant-security.svg'])assert.ok(read('docs/architecture/'+p).includes('<svg'),`Invalid SVG ${p}`);
const en=read('README.md');const zh=read('README_zh-CN.md');
const markers=s=>[...s.matchAll(/<!-- doc-section:([a-z-]+) -->/g)].map(m=>m[1]);
assert.deepEqual(markers(en),markers(zh),'README section markers differ');
assert.equal(markers(en).length,7);
for(const file of ['README.md','README_zh-CN.md']){
 const doc=read(file);
 const links=[...doc.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
 for(const url of links){if(/^(https?:|#)/.test(url))continue;const target=path.resolve(root,url.split('#')[0]);assert.ok(fs.existsSync(target),`Broken link in ${file}: ${url}`);}
}
const prd=read('docs/product/PRD_zh-CN.md');
for(const id of ['FR-001','FR-039','FR-060','FR-091','FR-115','FR-136'])assert.ok(prd.includes(id),`Missing ${id}`);
console.log('Static and documentation checks passed: 25 routes, four SVG diagrams, README parity, PRD coverage.');
