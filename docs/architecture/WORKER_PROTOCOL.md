# Peach Compute — Docker/Kubernetes + Python/Go Worker 执行协议（Proposed）

> 当前仅有交互原型和协议设计，尚未编写实际 Worker SDK、Docker Agent 或 Kubernetes 控制器。

## 1. 统一执行模型

一次业务处理任务 `Job` 可以包含多个 `Step`，每次实际尝试是 `Attempt`。Runtime Task 是一次容器实例，两者不能混淆。

| 对象 | 唯一 ID | 职责 | 可重试性 |
|---|---|---|---|
| Job | `jobId` | 对外业务请求/最终状态 | 可创建新 Attempt |
| Step | `stepId` | DAG 中的一个处理节点 | 由策略决定 |
| Attempt | `attemptId` | 一次执行，输出独立 | 独立，旧 Attempt 不发布 |
| Runtime Task | `runtimeTaskId` | Docker Container / K8s Job | 由 Runtime 控制器重建 |
| Processor | `processorCode+digest` | 允许执行的镜像及参数 Schema | 版本不可变 |

## 2. Job Manifest v1

```json
{
  "schemaVersion":"v1",
  "jobId":"job_001",
  "attemptId":"attempt_001",
  "tenantId":"tenant_001",
  "projectId":"project_001",
  "processor":{"code":"VIDEO_TRANSCODE","version":"1.0.0","digest":"sha256:<digest>"},
  "input":{"assetVersionId":"av_001","objectRef":"obj_001","sha256":"<hash>"},
  "parameters":{"format":"hls","resolutions":["1080p","720p"]},
  "output":{"prefix":"processing/job_001/attempt_001/"},
  "runtime":{"deadlineSeconds":7200,"cpuCores":2,"memoryMiB":4096,"ephemeralStorageMiB":20480},
  "telemetry":{"traceId":"trace_demo"},
  "credentialRef":"task-credential:short-lived"
}
```

Manifest 由可信调度服务签名或存于受保护的内部接口，Worker 不应信任任意传入租户 ID。MinIO/S3 访问使用由调度器提供的**任务级短期访问授权**；签名内容和长期 Secret 不能写入任务日志。

## 3. Worker 执行协议

1. 启动时获取 `attemptId` 与 Manifest Ref，检查版本、任务租约、处理器镜像 Digest。
2. 拉取输入对象到**受限临时目录**；可流式处理的任务优先流式读取，避免整个大文件进入 JVM/Python 内存。
3. 使用受审查的参数模板执行处理器，禁 shell 拼接/任意输入脚本执行。
4. 每固定时间（建议 10–30 秒，最终由运行时配置）上报 heartbeat、stage、progress、inputBytes/outputBytes、资源占用。
5. 产物仅写入 `processing/{jobId}/{attemptId}/`；与业务 READY 目录隔离。
6. Worker 上传 `Output Manifest`：对象引用、字节数、Hash、MIME、处理器 Digest、处理参数摘要、执行耗时。
7. Worker 提交完成事件后退出，**业务控制面仍需重新校验产物**并 CAS 发布有效 Attempt。
8. 如果取消/超时，Worker 应停止后续处理并尽量清理临时数据；强制终止后由对账/清理作业收尾。

### Output Manifest

```json
{
  "jobId":"job_001",
  "attemptId":"attempt_001",
  "status":"SUCCEEDED",
  "processorDigest":"sha256:<digest>",
  "outputs":[
    {"role":"hls_master","objectRef":"out_001","contentType":"application/vnd.apple.mpegurl","size":2120,"sha256":"<hash>"},
    {"role":"thumbnail","objectRef":"out_002","contentType":"image/jpeg","size":120300,"sha256":"<hash>"}
  ],
  "metrics":{"wallTimeMs":180000,"cpuTimeMs":320000,"peakMemoryMiB":1250},
  "traceId":"trace_demo"
}
```

HLS 输出还包含所有分片和播放列表的对象关系；不要只发布一个 m3u8 入口而忽略必需分片。

## 4. Java Runtime SPI（概念示例）

```java
public interface ContainerRuntime {
    RuntimeTask create(RuntimeSpec spec);
    RuntimeTaskStatus status(String runtimeTaskId);
    void stop(String runtimeTaskId);
    RuntimeLogs logs(String runtimeTaskId);
    void delete(String runtimeTaskId);
}
```

- `DockerRuntimeAgent` 调用 Engine API，但仅允许固定处理器镜像/参数白名单，避免 Spring Cloud 服务拥有 Docker Socket 控制权。
- `KubernetesRuntime` 通过最小 RBAC 创建/观察受限 Namespace 中的 Job/Pod，使用 Pod Security Restricted、ResourceQuota、NetworkPolicy、镜像策略。
- 一次 `create` API 成功只表示平台接受任务，容器启动、处理成功、业务发布分别追踪。
- 双模式共用 `Job Manifest` 和 `Output Manifest`，避免 Python、Go、FFmpeg 在同一逻辑上出现不同接口。

## 5. 资源、安全与背压

- 配额维度：tenant / project / processor / runtime / CPU / memory / GPU（未来）/ ephemeral storage / bandwidth / concurrent jobs。
- 高优先级调度不能无限挤占低优先级业务，使用加权公平调度和防饥饿策略。
- Worker 默认非 root、只读根文件系统、禁特权、只用临时目录、有限日志输出、关闭无关网络、不可访问宿主机/其他租户对象。
- 未经平台审核的自定义镜像在 V1 中不允许运行；未来如开放必须引入更强运行时隔离与安全评估。
- 背压信号：RocketMQ Queue backlog、inflight、租户预算、容器资源上限决定接受/排队/拒绝。

## 6. 失败、幂等和恢复

| 失效场景 | 控制面行为 |
|---|---|
| RocketMQ 重复投递 | 按 Job/Attempt 租约 CAS 领取，重复消息 ACK 不产生第二次业务发布 |
| Pod 重启后旧 Attempt 回报成功 | 若 fencingToken 已失效，产物标记为过期并清理 |
| Worker 退出但未回报 | Runtime 观察器检查退出码，Attempt 进入 RETRYABLE/FAILED |
| 对象存储部分产物写入成功 | Output Manifest 不完整不发布，暂存区等待清理 |
| 用户取消正在执行的长任务 | desiredState=CANCELLED，优雅停止，超时强杀并清理 |
| 租户额度不足 | 不创建昂贵容器；返回明确配额拒绝或排队策略 |
| 调度服务重启 | 扫描有效租约/Runtime 状态，重建观察器并对账 |
| 配额记账重试 | Reservation ID 幂等；commit/release 只执行一次生效 |

## 7. 测试合同

- 用 Java、Python、Go 统一样例验证 Manifest 解码、参数白名单、输出 Hash、进度、取消、心跳、超时、重复结果。
- Docker 和 Kubernetes Runtime 运行同一套合同测试（在有环境时执行）；测试创建失败、资源配额拒绝和多租户命名空间隔离。
- 压测图像 Worker 池、长视频 K8s Job、巨型 CSV 分块任务的内存峰值；记录环境和硬件、处理速率、失败率及可恢复性。

## 调度与服务调用边界（本期约束）

- 本期定时触发器由 **Peach Scheduler** 自有实现，不接入外部调度产品。调度创建 Job 请求使用 OpenFeign HTTP 或可信 RocketMQ 事件，均须幂等。
- Worker SDK 仍使用统一 Job Manifest/Progress/Output 合同；Runtime SPI 不关心服务间使用的 Java RPC 库。
- 内部同步调用采用 **Spring Cloud OpenFeign**，对外公开接口采用 HTTPS REST；容器生命周期管理由 Peach Compute 管理。
