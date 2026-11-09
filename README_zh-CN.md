# Peach Media Cloud

> **当前状态：交互式产品原型 + 拟实施架构/需求文档，并非已经运行的 SaaS 后端。**
>
> English: [README.md](README.md)

<!-- doc-section:overview -->
## 产品概览

Peach Media Cloud 拟建设为企业级**多租户数字资产管理（DAM）与媒体/数据处理 SaaS**，复用 Peach Cloud 基础能力，新增由 Docker/Kubernetes 与 Python/Go/FFmpeg Worker 支撑的独立计算平面。完整产品目标是上传、隔离、安全扫描、异步处理、资产发布、CDN 分发、Webhook 回调、用量核算、资源配额和审计的端到端闭环。

当前仓库交付**原生 HTML/CSS/JavaScript 可点击交互原型**、详细需求文档、技术架构、API/Worker 协议和可编辑 SVG 图。所有操作与预览数据均为模拟；**未接入真实认证、对象存储、消息队列、计费或 Kubernetes 执行环境**。

<!-- doc-section:architecture -->
## 架构概览

![拟实施整体平台架构](docs/architecture/01-platform-overview.svg)

- **控制面**：Java / Spring Cloud（租户、鉴权、资产元数据、Open API、任务编排、用量）。
- **数据面**：S3 兼容直传、对象存储、媒体交付/CDN 与签名链接。
- **计算面**：RocketMQ、Peach Compute、Docker Agent、Kubernetes Job、Python/Go/FFmpeg/libvips Worker。
- **调度**：通过适配层接入调度系统；OTRYX Flow 是候选集成，必须先核验真实兼容能力。

更多可编辑架构图：[容器计算](docs/architecture/02-compute-runtime.svg) · [资产数据闭环](docs/architecture/03-asset-data-loop.svg) · [租户安全](docs/architecture/04-tenant-security.svg)。生成式概念视觉稿（非权威拓扑）：[概念图](docs/architecture/concept-peach-media.webp)。

<!-- doc-section:quick-start -->
## 快速启动（原型）

**方式 A — 直接打开：** 使用启用了 JavaScript 的 Chrome、Edge、Firefox 或 Safari 打开 [`prototype/index.html`](prototype/index.html)。无需 npm 安装、构建或服务器。

**方式 B — 本地静态服务**（已安装 Python 3，在仓库根目录执行）：

```bash
python3 -m http.server 8080 --directory prototype
```

然后访问 `http://localhost:8080/`。

运行纯状态与静态合同检查（Node.js 18+）：

```bash
node --test tests/*.test.cjs
node tests/validate-static.mjs
```

原型提供 25 个导航模块、三个租户的样例数据、可点击资产详情、本地上传进度模拟、任务状态流转、Docker/K8s Worker 状态模拟、API Key、Webhook 事件、定时调度、配额、审计、组织与角色管理。状态保存在浏览器 `localStorage`，可在**系统设置 → 重置演示数据**恢复。

<!-- doc-section:documents -->
## 文档索引

| 文档 | 内容 |
|---|---|
| [完整产品 PRD（中文）](docs/product/PRD_zh-CN.md) | 用户角色、136 项功能需求、流程、状态、实施阶段及验收 |
| [技术设计](docs/architecture/TECHNICAL_DESIGN.md) | 服务职责、三平面、运行时、配额、故障恢复与安全 |
| [Open API 合同](docs/architecture/API_CONTRACT.md) | API 路径、认证、幂等、事件和错误码方案 |
| [Worker 协议](docs/architecture/WORKER_PROTOCOL.md) | Job/Attempt/Runtime 合同、Docker/K8s 与 Python/Go 执行机制 |
| [验收矩阵](docs/product/ACCEPTANCE_MATRIX.md) | 正式系统与原型的验收用例 |
| [DESIGN.md](DESIGN.md) | 视觉规范、Design Token 和交互基调 |
| [UX-CONTRACT.md](UX-CONTRACT.md) | 导航、表单、模拟状态、响应式与操作契约 |

<!-- doc-section:structure -->
## 项目结构

```text
Peach-Media/
├── prototype/
│   ├── index.html          # 原生 HTML 单页应用入口
│   ├── styles.css          # 浅色/深色与响应式样式
│   ├── core.js             # 可独立测试的租户数据模型
│   └── app.js              # 交互页面、表单和模拟处理
├── docs/
│   ├── product/            # PRD 与验收
│   └── architecture/       # 技术设计、接口合同、SVG 图与概念图
├── scripts/
│   └── render_architecture.py
├── tests/                  # Node 原生测试，无安装依赖
├── DESIGN.md
└── UX-CONTRACT.md
```

<!-- doc-section:limitations -->
## 当前边界与下一步

- 原型操作**全部在本地模拟**。选择文件只记录文件名/大小并生成模拟任务，**不会发送真实文件内容**；任务推进不会启动容器；测试 Webhook 不会真实发起 HTTP 请求。
- 示例 API URL、负载、遥测与配额都是设计用数据，不能视为已经部署的协议或真实性能指标。
- 实施前需要审计 Peach Cloud 和 OTRYX Flow 的真实源码、版本与可用能力。PRD 是需求提案，不代表后端已经完成。
- 后续建议依次实现：身份与数据隔离 → FileService S3 分片直传/安全扫描 → Peach Compute/Worker 合同 → Open API/交付/Webhook → 资产与用量账本 → 部署、故障注入与性能验收。
- 原仓库采用 MIT License；后续开发保留既有 License 和署名。

<!-- doc-section:references -->
## 参考文档

- [Cloudinary](https://cloudinary.com/documentation) · [ImageKit](https://imagekit.io/docs) · [Uploadcare](https://uploadcare.com/docs/) · [Mux](https://www.mux.com/docs)：用于同类能力设计借鉴，不表示 API 兼容。
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/) · [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) · [Docker Engine Security](https://docs.docker.com/engine/security/)。
