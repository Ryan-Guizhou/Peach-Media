'use strict';

/**
 * Peach Media deterministic code-generation kernel.
 * No model calls, file reads, network access, or arbitrary code execution.
 */
const TYPES = Object.freeze({
  String: { sql: length => `VARCHAR(${length})`, java: 'String', openapi: 'string' },
  Long: { sql: () => 'BIGINT', java: 'Long', openapi: 'integer', format: 'int64' },
  Integer: { sql: () => 'INT', java: 'Integer', openapi: 'integer', format: 'int32' },
  Boolean: { sql: () => 'TINYINT', java: 'Boolean', openapi: 'boolean' },
  BigDecimal: { sql: () => 'DECIMAL(18,4)', java: 'BigDecimal', openapi: 'number', format: 'double' },
  LocalDateTime: { sql: () => 'DATETIME', java: 'LocalDateTime', openapi: 'string', format: 'date-time' }
});
const RESERVED = new Set(['id','tenantId','projectId','createdAt','updatedAt','class','public','private','static','final','interface','enum','new','null','true','false','default','switch','return','package','import','extends','implements','void','int','long','short','boolean','byte','double','float','char','this','super','throws','throw','try','catch','finally','while','for','if','else','do','break','continue']);
const VERSION='0.1.0';
class SchemaError extends Error {constructor(message){super(message);this.code='INVALID_SCHEMA';this.status=422;}}
const check=(condition, message)=>{if(!condition)throw new SchemaError(message);};
const kebab=s=>s.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();
const htmlEscape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const yamlQuote=s=>JSON.stringify(String(s));
function normalizeSchema(raw){
  check(raw&&typeof raw==='object'&&!Array.isArray(raw),'需要一个 JSON Schema 对象');
  const entityName=raw.entityName;
  check(typeof entityName==='string'&&/^[A-Z][A-Za-z0-9]{1,49}$/.test(entityName),'实体名应为 PascalCase，例如 AssetTag');
  check(!['String','Long','Integer','Boolean','BigDecimal','LocalDateTime','List'].includes(entityName),'实体名不能与标准 Java 类型冲突');
  const packageName=raw.packageName;
  check(typeof packageName==='string'&&/^(?:[a-z][a-z0-9]*\.)+[a-z][a-z0-9]*$/.test(packageName)&&!packageName.split('.').some(s=>RESERVED.has(s)),'packageName 必须是合法的小写 Java 包名');
  const tableName=raw.tableName;
  check(typeof tableName==='string'&&/^[a-z][a-z0-9_]{2,62}$/.test(tableName),'表名只能使用小写字母、数字和下划线');
  const description=raw.description;
  check(typeof description==='string'&&description.trim().length>0&&description.length<=100&&!/[\r\n\u0000-\u001f]/.test(description)&&!description.includes('*/')&&!description.includes('--'),'业务描述必填，长度不超过100字符，不能含换行或注释终止符');
  check(Array.isArray(raw.fields)&&raw.fields.length>=1&&raw.fields.length<=24,'字段数量必须在 1～24 个之间');
  const seen=new Set();
  const fields=raw.fields.map((f,i)=>{
    check(f&&typeof f==='object'&&!Array.isArray(f),`第 ${i+1} 个字段格式错误`);
    check(typeof f.name==='string'&&/^[a-z][A-Za-z0-9]{0,39}$/.test(f.name)&&!RESERVED.has(f.name),`第 ${i+1} 个字段名不合法或与内置字段冲突`);
    check(!seen.has(f.name),`重复字段：${f.name}`);seen.add(f.name);
    check(Object.hasOwn(TYPES,f.type),`字段 ${f.name} 的类型不受支持`);
    check(typeof f.required==='boolean',`字段 ${f.name} 的 required 必须是布尔值`);
    const length=f.type==='String'?(f.length===undefined?255:f.length):undefined;
    if(f.type==='String')check(Number.isInteger(length)&&length>=1&&length<=1024,`字段 ${f.name} 的字符长度应为 1～1024`);
    return {name:f.name,type:f.type,required:f.required,...(length?{length}:{})};
  });
  const slug=kebab(entityName);
  return {entityName,packageName,tableName,description:description.trim(),fields,slug,resource:`media.${slug}`};
}
const imports=fields=>['BigDecimal','LocalDateTime'].filter(x=>fields.some(f=>f.type===x)).map(x=>`import java.${x==='BigDecimal'?'math':'time'}.${x};`).join('\n');
const fieldSource=field=>`    /** ${field.name} */\n    private ${field.type} ${field.name};`;
const typeOpenapi=f=>`          type: ${TYPES[f.type].openapi}${TYPES[f.type].format?`\n          format: ${TYPES[f.type].format}`:''}${f.type==='String'?`\n          maxLength: ${f.length}`:''}`;
function render(schema){
  const s=normalizeSchema(schema), {entityName:e,packageName:p,tableName:t,description:d,fields:f,slug,resource:r}=s;
  const javaRoot=`src/main/java/${p.replaceAll('.','/')}`;
  const base=`${javaRoot}/generated/${slug.replaceAll('-','')}`;
  const imp=imports(f);
  const propFields=f.map(fieldSource).join('\n\n');
  const entity=`package ${p}.generated.${slug.replaceAll('-','')};\n\nimport lombok.Data;\nimport java.time.LocalDateTime;${imp?'\n'+imp.replace('import java.time.LocalDateTime;','').trim():''}\n\n/**\n * ${d}（生成的领域对象，仅为骨架，非持久化实体映射）。\n */\n@Data\npublic class ${e} {\n    private Long id;\n    private Long tenantId;\n    private Long projectId;\n\n${propFields}\n\n    private LocalDateTime createdAt;\n    private LocalDateTime updatedAt;\n}\n`;
  const dto=`package ${p}.generated.${slug.replaceAll('-','')};\n\nimport lombok.Data;${imp?'\n'+imp:''}\n\n/**\n * 创建${d}请求。租户和项目身份由后端可信上下文解析，禁止客户端指定。\n */\n@Data\npublic class ${e}CreateRequest {\n${propFields}\n}\n`;
  const permissionPort=`package ${p}.generated.${slug.replaceAll('-','')};\n\n/**\n * 必须由 Peach Cloud Auth/数据权限适配器实现。\n * 不能提供默认放行的实现；缺失 Bean 时业务应拒绝启动。\n */\npublic interface ${e}AccessPort {\n    Long trustedTenantId();\n    Long trustedProjectId();\n    void requireAction(String permissionCode);\n    void requireResource(String resourceType, String action, Long resourceId);\n}\n`;
  const service=`package ${p}.generated.${slug.replaceAll('-','')};\n\nimport java.util.List;\n\n/**\n * ${d}服务接口。实现层必须对所有查询强制租户、项目与数据范围过滤。\n */\npublic interface ${e}Service {\n    List<${e}> listVisible(Long tenantId, Long projectId);\n    ${e} getVisible(Long id, Long tenantId, Long projectId);\n    ${e} create(${e}CreateRequest request, Long tenantId, Long projectId);\n}\n`;
  const controller=`package ${p}.generated.${slug.replaceAll('-','')};\n\nimport java.util.List;\nimport lombok.RequiredArgsConstructor;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.PathVariable;\nimport org.springframework.web.bind.annotation.PostMapping;\nimport org.springframework.web.bind.annotation.RequestBody;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.ResponseStatus;\nimport org.springframework.web.bind.annotation.RestController;\n\n/**\n * ${d}管理接口。权限检查不能只依赖前端按钮状态。\n */\n@RestController\n@RequestMapping("/api/media/${slug}s")\n@RequiredArgsConstructor\npublic class ${e}Controller {\n    private final ${e}Service service;\n    private final ${e}AccessPort accessPort;\n\n    @GetMapping\n    public List<${e}> list() {\n        accessPort.requireAction("${r}:list");\n        return service.listVisible(accessPort.trustedTenantId(), accessPort.trustedProjectId());\n    }\n\n    @GetMapping("/{id}")\n    public ${e} get(@PathVariable("id") Long id) {\n        accessPort.requireAction("${r}:read");\n        accessPort.requireResource("${r}", "read", id);\n        return service.getVisible(id, accessPort.trustedTenantId(), accessPort.trustedProjectId());\n    }\n\n    @PostMapping\n    @ResponseStatus(HttpStatus.CREATED)\n    public ${e} create(@RequestBody ${e}CreateRequest request) {\n        accessPort.requireAction("${r}:create");\n        return service.create(request, accessPort.trustedTenantId(), accessPort.trustedProjectId());\n    }\n}\n`;
  const toColumn=name=>name.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());
  const sql=`-- ${d}\n-- 仅提供表结构骨架；租户、项目必须来自可信服务端身份。\nCREATE TABLE \`${t}\` (\n    id BIGINT NOT NULL,\n    tenant_id BIGINT NOT NULL,\n    project_id BIGINT NOT NULL,\n${f.map(x=>`    \`${toColumn(x.name)}\` ${TYPES[x.type].sql(x.length)} ${x.required?'NOT NULL':'NULL'},`).join('\n')}\n    created_at DATETIME NOT NULL,\n    updated_at DATETIME NOT NULL,\n    PRIMARY KEY (id),\n    INDEX \`idx_${t.slice(0,40)}_tenant_project\` (tenant_id, project_id)\n);\n`;
  const permissions={resource:r,description:d,actions:['list','read','create','update','delete','export'].map(a=>({code:`${r}:${a}`,description:a,requiresDataScope:a==='list'||a==='read'||a==='update'||a==='delete'||a==='export'})),policyNote:'角色授权决定动作，租户边界、项目范围与资源关系由服务器逐操作校验。'};
  const schemaProps=f.map(field=>`        ${field.name}:\n${typeOpenapi(field)}`).join('\n');
  const openapi=`openapi: 3.0.3\ninfo:\n  title: ${yamlQuote(d)}\n  version: 0.1.0\npaths:\n  /api/media/${slug}s:\n    get:\n      operationId: list${e}s\n      responses:\n        '200':\n          description: Authorized resource list\n    post:\n      operationId: create${e}\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: '#/components/schemas/${e}CreateRequest'\n      responses:\n        '201':\n          description: Created after server authorization\n  /api/media/${slug}s/{id}:\n    get:\n      operationId: get${e}\n      parameters:\n        - in: path\n          name: id\n          required: true\n          schema:\n            type: integer\n            format: int64\n      responses:\n        '200':\n          description: Authorized resource\n        '404':\n          description: Resource unavailable or not visible\ncomponents:\n  schemas:\n    ${e}CreateRequest:\n      type: object\n${f.filter(x=>x.required).length?`      required:\n${f.filter(x=>x.required).map(x=>'        - '+x.name).join('\n')}\n`:''}      properties:\n${schemaProps}\n`;
  const formFields=f.map(x=>{
    const label=`${htmlEscape(x.name)} (${htmlEscape(x.type)})`;
    if(x.type==='Boolean')return `<label>${label}<select name="${x.name}"><option value="true">true</option><option value="false">false</option></select></label>`;
    const inputType=x.type==='LocalDateTime'?'datetime-local':['Long','Integer','BigDecimal'].includes(x.type)?'number':'text';
    const step=x.type==='BigDecimal'?' step="0.0001"':['Long','Integer'].includes(x.type)?' step="1"':'';
    return `<label>${label}<input name="${x.name}" type="${inputType}"${step} ${x.required?'required':''} placeholder="${htmlEscape(x.name)}"></label>`;
  }).join('\n');
  const front=`<!doctype html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(d)}</title>\n<style>body{font:14px/1.6 system-ui,sans-serif;margin:40px auto;max-width:760px;padding:0 20px;color:#24304e}label{display:block;margin:10px 0}input{display:block;padding:9px;width:100%;box-sizing:border-box}button{padding:10px 16px;cursor:pointer}pre{background:#f2f4fb;padding:16px;white-space:pre-wrap;overflow-wrap:anywhere}.note{padding:12px;background:#fff4e8}</style></head>\n<body><h1>${htmlEscape(d)}</h1><p class="note">模板页面：需接入真实鉴权的 BFF，才能访问后端业务接口。此页面不会模拟授权成功。</p>\n<form id="form">\n${formFields}\n<button type="submit">提交创建请求</button></form>\n<pre id="result" role="status">尚未提交</pre>\n<script>\nconst API='/api/media/${slug}s';\ndocument.getElementById('form').addEventListener('submit',async event=>{\n event.preventDefault();const form=new FormData(event.currentTarget);const body=Object.fromEntries(form.entries());\n for(const key of ${JSON.stringify(f.filter(x=>['Long','Integer','BigDecimal'].includes(x.type)).map(x=>x.name))}){if(body[key]!=='')body[key]=Number(body[key]);}\n for(const key of ${JSON.stringify(f.filter(x=>x.type==='Boolean').map(x=>x.name))})body[key]=body[key]==='true';\n const result=document.getElementById('result');result.textContent='请求中…';\n try{const response=await fetch(API,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});\n const text=await response.text();result.textContent=response.ok?'创建成功：'+text:'接口未授权或不可用（'+response.status+'）：'+text;}\n catch{result.textContent='无法连接真实业务 API，检查 BFF 与权限配置。';}\n});\n</script></body></html>\n`;
  const readme=`# ${d} · 代码生成骨架\n\n来源：Peach Media Code Generator ${VERSION}（确定性模板生成，不包含模型推理）。\n\n## 已生成\n\n- Spring Web Controller、Service Interface、AccessPort Interface、Lombok DTO/Domain\n- MySQL DDL、权限编码、OpenAPI 草案、前端 HTML 交互样例\n\n## 必须由开发者补充的内容\n\n1. 按实际 Peach Cloud 版本接入 Maven 模块、Spring 与 Lombok 依赖。\n2. 实现 Service 与 AccessPort：强制 tenant_id、project_id、资源 ACL/数据权限过滤；禁止默认放行。\n3. 实现服务端字段校验、数据映射、分页、异常处理、日志、测试和审计。\n4. 执行 SQL 之前审查索引、唯一约束、字段长度和业务归属。\n5. Controller 只有 list/get/create 骨架；update/delete/export 为预留权限编码，未生成运行代码。\n6. OpenAPI 合同与真实接口需持续同步，当前不是已经部署的 API。\n\n**安全限制：** 生成结果不可未经审查直接合并生产，也不得让模型拥有无条件执行 SQL、写入仓库或合并 PR 权限。\n`;
  const files=[
    {path:`${base}/${e}.java`,content:entity},
    {path:`${base}/${e}CreateRequest.java`,content:dto},
    {path:`${base}/${e}AccessPort.java`,content:permissionPort},
    {path:`${base}/${e}Service.java`,content:service},
    {path:`${base}/${e}Controller.java`,content:controller},
    {path:`sql/mysql/${t}.sql`,content:sql},
    {path:`permissions/${slug}.json`,content:JSON.stringify(permissions,null,2)+'\n'},
    {path:`openapi/${slug}.yaml`,content:openapi},
    {path:`frontend/${slug}.html`,content:front},
    {path:'README.md',content:readme},
    {path:'schema.json',content:JSON.stringify(s,null,2)+'\n'}
  ];
  return {version:VERSION,normalizedSchema:s,files,warning:'生成的是可审查的代码骨架，不包含实际 Service/AccessPort 实现和生产权限校验。'};
}
function zipStore(files){
  check(Array.isArray(files)&&files.length<=100,'ZIP 文件数超出限制');
  const local=[],central=[];let offset=0;
  let table=null;
  if(!table){table=Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});}
  const crc32=b=>{let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  for(const file of files){
    check(typeof file.path==='string'&&/^[A-Za-z0-9_.\/\-]+$/.test(file.path)&&!file.path.includes('..')&&!file.path.startsWith('/'),'拒绝不安全的 ZIP 路径');
    const name=Buffer.from(file.path,'utf8'),data=Buffer.from(file.content,'utf8'),crc=crc32(data);
    check(name.length<65535&&data.length<524288,'文件过大');
    const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50,0);l.writeUInt16LE(20,4);l.writeUInt16LE(0x800,6);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(data.length,22);l.writeUInt16LE(name.length,26);
    local.push(l,name,data);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
    central.push(c,name);offset+=l.length+name.length+data.length;
  }
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  const cSize=central.reduce((n,b)=>n+b.length,0);end.writeUInt32LE(cSize,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,...central,end]);
}
module.exports={render,zipStore,normalizeSchema,SchemaError,VERSION};
