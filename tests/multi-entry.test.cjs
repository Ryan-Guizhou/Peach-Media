'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = pathName => fs.readFileSync(path.join(root, pathName), 'utf8');

test('three independent HTML product entrances exist and offer cross-entrance navigation', () => {
  const pages = ['prototype/index.html', 'prototype/console/index.html', 'prototype/developers/index.html', 'prototype/openapi/index.html'];
  for (const p of pages) {
    const markup = read(p);
    assert.match(markup, /<html lang="zh-CN">/);
    assert.match(markup, /Peach Media/);
    assert.ok(markup.includes('href='), p);
  }
  assert.match(read('prototype/index.html'), /console\/index\.html/);
  assert.match(read('prototype/index.html'), /developers\/index\.html/);
  assert.match(read('prototype/index.html'), /openapi\/index\.html/);
  assert.match(read('prototype/developers/index.html'), /developer\.js/);
  assert.match(read('prototype/openapi/index.html'), /explorer\.js/);
  assert.match(read('prototype/console/index.html'), /\.\.\/app\.js/);
});

test('enterprise app no longer displays developer portal routes as local sidebar sections', () => {
  const source = read('prototype/app.js');
  const start = source.indexOf('const groups=');
  const end = source.indexOf('const PAGE_META=');
  const nav = source.slice(start, end);
  for (const r of ["['api'", "['webhooks'", "['events'"]) assert.equal(nav.includes(r), false, r);
  assert.match(source, /developers\/index\.html/);
  assert.match(source, /openapi\/index\.html/);
});

test('architecture and product docs consistently use OpenFeign and standalone Peach Scheduler', () => {
  const files = [
    'README.md','README_zh-CN.md','docs/product/PRD_zh-CN.md',
    'docs/architecture/TECHNICAL_DESIGN.md','docs/architecture/WORKER_PROTOCOL.md',
    'docs/architecture/API_CONTRACT.md','prototype/app.js'
  ];
  for (const p of files) assert.doesNotMatch(read(p), /otryx[\s-]*flow/i, p);
  assert.match(read('docs/architecture/TECHNICAL_DESIGN.md'), /OpenFeign/);
  assert.match(read('docs/architecture/TECHNICAL_DESIGN.md'), /Peach Scheduler/);
  assert.match(read('docs/product/PRD_zh-CN.md'), /企业管理控制台/);
  assert.match(read('docs/product/PRD_zh-CN.md'), /开发者平台/);
  assert.match(read('docs/product/PRD_zh-CN.md'), /Open API/);
  assert.ok(fs.existsSync(path.join(root,'docs/architecture/00-three-entry-architecture.svg')));
});
