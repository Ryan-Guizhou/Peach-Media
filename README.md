# Peach Media Cloud

> **Status: interactive product prototype + proposed architecture / PRD. Not a running SaaS backend.**
>
> 中文文档：[README_zh-CN.md](README_zh-CN.md)

<!-- doc-section:overview -->
## Overview

Peach Media Cloud is a planned enterprise **multi-tenant Digital Asset Management (DAM) + media/data processing SaaS**. Its goal is to reuse the existing Peach Cloud platform while introducing a separate containerized compute plane powered by Docker/Kubernetes and Python/Go/FFmpeg workers. The complete end-to-end target includes upload, quarantine, security scanning, processing, asset publication, CDN delivery, webhooks, usage metering, quotas and audit.

This repository currently contains a clickable **static HTML/CSS/JavaScript prototype**, design contracts, detailed proposed requirements, implementation architecture, API/Worker contracts, and editable SVG diagrams. The data and actions are explicitly simulated; there is no real authentication, storage, MQ, billing or Kubernetes integration yet.

<!-- doc-section:architecture -->
## Architecture

![Proposed platform architecture](docs/architecture/01-platform-overview.svg)

- **Control plane**: Java / Spring Cloud (tenant, authorization, asset metadata, API, job orchestration, usage).
- **Data plane**: S3-compatible direct upload, object storage, delivery/CDN and signed URLs.
- **Processing plane**: RocketMQ, Peach Compute, Docker Agent and Kubernetes Jobs, Python/Go/FFmpeg/libvips workers.
- **Scheduling**: scheduler adapter, with OTRYX Flow as a proposed integration once compatibility is verified.

Additional editable diagrams: [compute runtime](docs/architecture/02-compute-runtime.svg) · [asset lifecycle](docs/architecture/03-asset-data-loop.svg) · [tenant security](docs/architecture/04-tenant-security.svg). Generated concept artwork (not authoritative topology): [concept illustration](docs/architecture/concept-peach-media.webp).

<!-- doc-section:quick-start -->
## Quick start (prototype)

**Option A — open directly:** Open [`prototype/index.html`](prototype/index.html) in Chrome, Edge, Firefox or Safari with JavaScript enabled. No npm build step, package download or server is required.

**Option B — local static server** (Python 3 installed, from repository root):

```bash
python3 -m http.server 8080 --directory prototype
```

Then visit `http://localhost:8080/`.

To run pure-state and static-contract checks (Node.js 18+):

```bash
node --test tests/*.test.cjs
node tests/validate-static.mjs
```

The prototype includes 25 navigation modules, fixture data for three tenants, clickable asset details, local upload-progress simulation, task transitions, Docker/K8s Worker mock status, Open API keys, webhook event simulation, scheduler, quotas, audit, organization trees and role tables. Changes are persisted in browser `localStorage`; use **Settings → Reset demo data** to restore fixtures.

<!-- doc-section:documents -->
## Documentation

| Document | Contents |
|---|---|
| [Full product PRD (Chinese)](docs/product/PRD_zh-CN.md) | Actors, 136 functional requirements, workflows, states, implementation stages and acceptance |
| [Technical design](docs/architecture/TECHNICAL_DESIGN.md) | Service boundaries, 3 planes, runtime, quotas, failure recovery and security |
| [Open API contract](docs/architecture/API_CONTRACT.md) | Proposed routes, authentication, idempotency, event schemas and error taxonomy |
| [Worker protocol](docs/architecture/WORKER_PROTOCOL.md) | Job/Attempt/Runtime contract and Docker/K8s + Python/Go Worker execution model |
| [Acceptance matrix](docs/product/ACCEPTANCE_MATRIX.md) | Production and prototype acceptance cases |
| [DESIGN.md](DESIGN.md) | Design tokens, aesthetic rationale and UI rules |
| [UX-CONTRACT.md](UX-CONTRACT.md) | Navigation, validation, interactions, demo limitations and responsive behavior |

<!-- doc-section:structure -->
## Repository layout

```text
Peach-Media/
├── prototype/
│   ├── index.html          # Static clickable SPA shell
│   ├── styles.css          # Responsive light/dark UI
│   ├── core.js             # Pure tenant-scoped demo domain
│   └── app.js              # Interactive screens, forms and simulations
├── docs/
│   ├── product/            # PRD and acceptance
│   └── architecture/       # Technical design, contracts, editable SVGs, concept art
├── scripts/
│   └── render_architecture.py
├── tests/                  # Node built-in tests (no installed dependencies)
├── DESIGN.md
└── UX-CONTRACT.md
```

<!-- doc-section:limitations -->
## Current limitations and next steps

- Prototype actions are **local simulations only**. Uploading a file records its name/size and a mock job but **does not transmit file bytes**; job completion does not run any container; webhook tests send no HTTP requests.
- Example API URLs, workloads, telemetry and quotas are illustrative; do not use them as deployed production contracts or benchmark results.
- The actual Peach Cloud and OTRYX Flow source versions/capabilities must be reviewed before implementation. The PRD is a proposal, not a claim of existing functionality.
- Next implementation order: identity/data isolation → FileService S3 MPU and scanning → Peach Compute/Worker protocol → Open API, media delivery, webhook → usage ledger/DAM → deployment, fault injection, performance verification.
- The repository's base license is MIT; preserve existing repository license/attribution in derivative work.

<!-- doc-section:references -->
## Reference documentation

- [Cloudinary documentation](https://cloudinary.com/documentation) · [ImageKit](https://imagekit.io/docs) · [Uploadcare](https://uploadcare.com/docs/) · [Mux](https://www.mux.com/docs) — comparable capabilities for design reference, not API compatibility claims.
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/) · [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) · [Docker Engine security](https://docs.docker.com/engine/security/).
