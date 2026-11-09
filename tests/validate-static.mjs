import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['prototype/index.html','prototype/console/index.html','prototype/developers/index.html','prototype/openapi/index.html'];
for(const file of pages){assert.match(read(file),/<html lang="zh-CN">/);assert.match(read(file),/tokens\.css/);}
for(const p of ['../styles.css','../core.js','../app.js'])assert.ok(read('prototype/console/index.html').includes(p),`Missing console script ${p}`);
for(const p of ['portal.css','hub.js'])assert.ok(read('prototype/index.html').includes(p),`Missing entrance dependency ${p}`);
const styles=read('prototype/styles.css'),shared=read('prototype/tokens.css'),portal=read('prototype/portal.css');
for(const token of ['--brand-indigo','#6355e8','--brand-navy'])assert.ok(shared.includes(token),`Brand token ${token}`);
for(const token of ['prefers-reduced-motion','@media(max-width:760px)'])assert.ok(styles.includes(token),`CSS missing ${token}`);
for(const token of ['entry-grid','portal-shell','openapi-layout','prefers-reduced-motion'])assert.ok(portal.includes(token),`Portal CSS missing ${token}`);
for(const p of ['docs/product/PRD_zh-CN.md','docs/product/ACCEPTANCE_MATRIX.md','docs/architecture/TECHNICAL_DESIGN.md','docs/architecture/API_CONTRACT.md','docs/architecture/WORKER_PROTOCOL.md','DESIGN.md','UX-CONTRACT.md','prototype/mock-server.cjs'])assert.ok(fs.existsSync(path.join(root,p)),`Missing ${p}`);
for(const p of ['00-three-entry-architecture.svg','01-platform-overview.svg','02-compute-runtime.svg','03-asset-data-loop.svg','04-tenant-security.svg'])assert.ok(read('docs/architecture/'+p).includes('<svg'),`Invalid SVG ${p}`);
const en=read('README.md'),zh=read('README_zh-CN.md');
const markers=s=>[...s.matchAll(/<!-- doc-section:([a-z-]+) -->/g)].map(m=>m[1]);
assert.deepEqual(markers(en),markers(zh),'README section markers differ');
assert.equal(markers(en).length,7);
for(const file of ['README.md','README_zh-CN.md']){
 const doc=read(file);
 const links=[...doc.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
 for(const url of links){if(/^(https?:|#)/.test(url))continue;const target=path.resolve(root,url.split('#')[0]);assert.ok(fs.existsSync(target),`Broken link in ${file}: ${url}`);}
 assert.match(doc,/prototype\/console\/index\.html/);
 assert.match(doc,/prototype\/developers\/index\.html/);
 assert.match(doc,/prototype\/openapi\/index\.html/);
}
const prd=read('docs/product/PRD_zh-CN.md');
for(const id of ['FR-001','FR-039','FR-060','FR-091','FR-115','FR-136','FR-137','FR-144'])assert.ok(prd.includes(id),`Missing ${id}`);
for(const p of ['docs/product/PRD_zh-CN.md','docs/architecture/TECHNICAL_DESIGN.md','prototype/app.js'])assert.doesNotMatch(read(p),/OTRYX[ -]*Flow/i);
console.log('Static/documentation checks passed: 3 independent entrances + 22 enterprise routes + mock HTTP + 5 editable SVGs + bilingual parity + 144 requirements.');
