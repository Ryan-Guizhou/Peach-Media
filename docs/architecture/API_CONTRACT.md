# Peach Media Open API 合同草案（Proposed）

> 版本 V1.0；示例 URL、ID 与响应都用于方案评审，**没有部署实际 API**。正式开发后必须同步 OpenAPI 3.1 Schema 和真实合同测试。

## 独立 Open API 服务入口

产品提供三个独立入口：**企业管理控制台**、**开发者平台**、**Open API**。本文件定义第三个入口的 REST 合同，不代表开发者门户的 HTML 路由。未来部署建议将 Open API 独立于 Console/Developer BFF 网关进行限流、版本化、认证与扩缩容；服务内部同步依赖使用 OpenFeign，异步通过 RocketMQ。

本地原型可运行 `node prototype/mock-server.cjs`，访问 `/openapi/v1/*` 进行有限的模拟 HTTP 调用。它只有健康、资产列表/详情、模拟 Upload/Complete、Job 提交/查询、批量事件、用量等部分端点；**不接收真实文件、不可用于生产**。示例密钥仅供 loopback 体验。完整合同表中其他 API 仍属于未来需求。

## 1. 通用协议

- 基础路径 `/openapi/v1`，只通过 HTTPS；`Authorization: Bearer <server-api-key>`，浏览器直传使用另一套有约束的短时签名策略。
- 所有资源以可信凭据解析 tenant/project/environment，不接受外部任意指定 tenantId 作为授权依据。
- 长时操作返回 `202 Accepted`、`jobId`、状态 URL；重复写请求使用 `Idempotency-Key`，以 tenant+project+operation+bodyDigest 为幂等作用域。
- 列表接口采用 `cursor/limit` 与排序白名单，禁止跨租户直接 ID 枚举。
- 成功结果包含资源对象或 `{data,requestId}`；失败统一 `{code,message,requestId,details,retryAfter?}`；`details` 必须脱敏。

## 2. 资源与关键端点

| Method | 路径 | 用途/响应 | 权限 Scope |
|---|---|---|---|
| POST | `/uploads` | 创建上传会话与配额预留 | `uploads:write` |
| GET | `/uploads/{uploadId}` | 进度与分片状态 | `uploads:read` |
| POST | `/uploads/{uploadId}/parts:sign` | 生成指定分片上传授权 | `uploads:write` |
| POST | `/uploads/{uploadId}:complete` | 完成并核验分片，进入隔离区 | `uploads:write` |
| POST | `/uploads/{uploadId}:abort` | 取消会话并释放配额 | `uploads:write` |
| GET | `/assets` | 条件搜索与游标分页 | `assets:read` |
| GET | `/assets/{assetId}` | 资产、版本、状态与权限范围 | `assets:read` |
| PATCH | `/assets/{assetId}` | 更新元数据/标签，支持 ETag | `assets:write` |
| DELETE | `/assets/{assetId}` | 发起异步删除 Saga | `assets:delete` |
| POST | `/assets/{assetId}/versions` | 新版本上传关联 | `assets:write` |
| POST | `/assets/{assetId}/transformations` | 创建处理任务 | `jobs:create` |
| POST | `/jobs` | 提交处理器执行 | `jobs:create` |
| GET | `/jobs/{jobId}` | 查询状态、进度、Attempt 和错误 | `jobs:read` |
| POST | `/jobs/{jobId}:cancel` | 发起取消 | `jobs:cancel` |
| POST | `/jobs/{jobId}:retry` | 失败任务重试，创建新 Attempt | `jobs:retry` |
| POST | `/delivery/sign` | 私有资源签名访问 | `delivery:read` |
| POST | `/events:batch` | 事件批量上报与逐条回执 | `events:write` |
| GET | `/usage/summary` | 配额与用量聚合 | `usage:read` |
| POST | `/webhooks` | 创建订阅端点 | `webhooks:write` |
| GET | `/webhooks/{id}/deliveries` | 回调记录与重试情况 | `webhooks:read` |
| POST | `/webhooks/{id}/deliveries/{deliveryId}:retry` | 手工重放 | `webhooks:write` |
| POST | `/credentials` | 创建项目级凭据，仅一次返回 Secret | `keys:write` |
| POST | `/credentials/{id}:revoke` | 吊销已有密钥 | `keys:revoke` |

## 3. 上传示例

```http
POST /openapi/v1/uploads HTTP/1.1
Authorization: Bearer <secret>
Idempotency-Key: req_001
Content-Type: application/json
```

```json
{
  "projectId": "project_123",
  "filename": "product.mp4",
  "contentType": "video/mp4",
  "size": 1073741824,
  "sha256": "<optional-sha256>"
}
```

```json
{
  "data": {
    "uploadId": "upl_123",
    "assetId": "ast_123",
    "uploadMode": "MULTIPART_DIRECT",
    "partSize": 10485760,
    "expiresAt": "2026-11-06T22:00:00+08:00",
    "partsSignUrl": "/openapi/v1/uploads/upl_123/parts:sign"
  },
  "requestId": "req_001"
}
```

上传完成返回资产处于 `QUARANTINED` 状态；后续扫描和处理必须通过异步任务查询或 Webhook 知道。`uploads:complete` 对同会话同分片清单幂等；清单不匹配返回 409。

## 4. 媒体处理请求与异步结果

```json
{
  "assetId": "ast_123",
  "processorCode": "VIDEO_TRANSCODE",
  "processorVersion": "1.0.0",
  "priority": "NORMAL",
  "parameters": {"outputs":["720p","1080p"],"format":"hls"},
  "webhookEventTypes": ["job.succeeded","job.failed"]
}
```

`POST /jobs` 返回 HTTP 202：

```json
{
  "data": {
    "jobId": "job_001",
    "status": "QUEUED",
    "statusUrl": "/openapi/v1/jobs/job_001"
  },
  "requestId": "req_002"
}
```

`GET /jobs/{jobId}` 除了 Job `status`，需返回 `progress`, `attempt`, `runtimeStatus`, `startedAt`, `finishedAt`, `errorCode`, `outputManifestRef`（只在可授权情况下）。禁止让调用方读取另一个租户的任何 Job 信息。

## 5. 批量事件上报与 Webhook

```json
{
  "events": [
    {"eventId":"evt_001","eventType":"asset.viewed","assetId":"ast_123","timestamp":"2026-11-06T10:00:00Z"},
    {"eventId":"evt_002","eventType":"asset.downloaded","assetId":"ast_123","timestamp":"2026-11-06T10:00:01Z"}
  ]
}
```

上报接口约束：事件数量、Body 大小、支持类型、项目资源范围、timestamp 偏差、去重窗口都以服务端配置为准；逐条结果记录 accepted/duplicate/rejected，返回批次 `requestId`。不可把客户端自报下载量直接作为计费结算凭据。

Webhook 推荐 HTTP Header：`X-Peach-Event`, `X-Peach-Delivery-Id`, `X-Peach-Timestamp`, `X-Peach-Signature`，签名基于 `timestamp + raw-body` 的 HMAC-SHA256；端点按租户配置，验签需支持时钟偏差、密钥轮换和重放窗口。生产前需写出形式化签名 Canonicalization 测试向量。

## 6. 错误与幂等策略

| HTTP | code | 含义 | 处理 |
|---|---|---|---|
| 401 | `UNAUTHENTICATED` | 凭据缺失/失效 | 重新认证 |
| 403 | `PERMISSION_DENIED` | Scope 或资源关系不足 | 不允许换 ID 重试 |
| 404 | `ASSET_NOT_FOUND` | 不可见或不存在 | 不泄露其他租户存在性 |
| 409 | `IDEMPOTENCY_CONFLICT` | 同幂等键，不同输入 | 更换正确幂等键或重用原请求 |
| 409 | `INVALID_STATE` | 状态不允许转换 | 查询最新任务状态 |
| 413 | `FILE_TOO_LARGE` | 文件超规格 | 降低文件大小或升级配额 |
| 422 | `FILE_REJECTED` | 安全扫描或文件格式失败 | 检查资源与格式 |
| 429 | `RATE_LIMITED` | 触发租户/API 限流 | 遵循 Retry-After |
| 503 | `STORAGE_UNAVAILABLE` | 对象存储暂不可用 | 退避重试，避免重复提交 |
| 503 | `PROCESSOR_UNAVAILABLE` | Worker 池不可用 | 任务维持队列或重试 |

## 7. SDK 和契约测试

Java/JavaScript SDK 首版：创建会话、分片上传/续传、资产查询、提交任务、轮询状态、Webhook 验签、批量事件上报、取消/幂等重试。SDK 的 API 路径、错误、类型从 OpenAPI Schema 生成或经过合约测试验证，禁止手工维护两套互相偏离的接口。
