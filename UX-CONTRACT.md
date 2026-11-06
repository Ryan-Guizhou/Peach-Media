# Peach Media Cloud — UX Contract

## Product context

- Audience: tenant administrators, content editors, developer integrators, operators and auditors.
- Primary jobs: locate/process/publish assets, manage jobs, integrate APIs, inspect usage/security.
- Locale: `zh-CN`; date/number format consistent with China locale. The user can switch tenant in demo; the server design uses trustworthy tenant identity.
- Accessibility target for production: WCAG 2.2 AA. HTML prototype is a no-backend demonstration and not proof of production authorization.

## Sources of truth

| Scope | Maintained source | Reviewed |
|---|---|---|
| Business workflows and security constraints | `docs/product/PRD_zh-CN.md` | 2026-11-06 |
| API and error semantics | `docs/architecture/API_CONTRACT.md` | 2026-11-06 |
| Worker/runtime state | `docs/architecture/WORKER_PROTOCOL.md` | 2026-11-06 |
| Visual system | `DESIGN.md`, runtime owner `prototype/styles.css` | 2026-11-06 |

## Canonical UI map

| Capability | Owner | State/behavior | Verification |
|---|---|---|---|
| Navigation | `prototype/app.js` route registry + `go()` | Hash route, supported back/forward navigation | Manual + smoke |
| List selection | Browser-native list/card details | One current resource detail; no bulk selection in prototype | UI-04 |
| Select | Native `<select>` | Keyboard native semantics, no custom popup | UI-03, UI-04 |
| Date/time | Read-only locale date strings | No date picker in prototype | Manual |
| Forms | Shared `form()/field()/choice()` helpers | Required validation; inline modal; error toast and first invalid focus | UI-05–10 |
| Toast | `notify()` | App-owned transient 4.3s, semantic success/warn/error | UI-05–10 |
| Modal/drawer | `showModal()/openDrawer()/renderOverlay()` | Single overlay, ESC/backdrop close, first input focus | UI-04, UI-09 |
| CRUD | `onAction()/onSubmit()` | Tenant-scoped local fixture mutations, persistent via localStorage | UI-04–12 |
| Table | `table()` shared renderer | Scrollable columns, explicit empty state | UI-04/11 |
| Scrollbar | Global `prototype/styles.css` | Visible, keyboard navigable, never hidden | UI-13 |

## Flow ledger

| Operation | Trigger | Pending | Success | Failure/recovery |
|---|---|---|---|---|
| Switch tenant | topbar selector | immediate | all tenant business lists filtered | unknown tenant defaults to t1 |
| Search assets/jobs | search input | immediate local filter | result list changes | empty state explanatory |
| Create asset | drag/drop/file selection | progress simulation | local Asset + Job appended | no actual bytes persisted, explicit in UI |
| Edit metadata | drawer → edit modal | form validation | asset name/tag + version updated | invalid/foreign tenant refused |
| Delete asset | drawer → delete confirmation | explicit confirm | asset and related local jobs removed | cancel retains original |
| Create job | action → job form | form validation | QUEUED job + audit | ownership/invalid state refused |
| Cancel/retry/advance job | job table/detail | in-memory state transition | visible job state and audit | invalid transitions show warning |
| Register API Key | creation modal | form validation | prefix stored; one-time demo secret | secret never persisted in localStorage |
| Webhook test | endpoint row | immediate simulation | counter and audit updated | paused endpoint refused; no network call |
| Simulate event | event modal | form validation | event row appended | invalid/foreign asset unavailable |
| Reset fixture | settings → confirm modal | explicit confirm | seed restored | cancel preserves state |

## Interaction resilience

- Only the `PeachCore` pure model owns tenant filtering and task transition rules; production backends must revalidate independently.
- Demo mutations are synchronous or timed local mock transitions. File chooser does not persist real bytes; a refresh during fake upload may leave a QUARANTINED local asset, accurately indicating incomplete demo state.
- In production: backend-mutating calls use request IDs and idempotency, loading state and rollback/retry; never show success before server confirmation.
- On permission denial, hide or disable forbidden UI actions when the frontend knows policy, but still return backend 403 on direct API; user sees clear reason and traceable failure.
- User-supplied names are HTML-escaped before template interpolation; output links are explicit examples and never used as active security authority.
- Demo browser storage is local to a profile; only a proof-of-concept persistence method, not a secure database.

## Navigation and responsive

- `prototype/#overview` is the default; sections grouped by workspace, processing, developer, and operations/security domains.
- Desktop fixed sidebar and sticky topbar; on mobile sidebar becomes an overlay; card grids collapse and tables scroll horizontally.
- Users can search function names with Ctrl/Command+K focusing global search, Enter navigates to matching page; Enter/Space activate details cards.
- Dialog close: `Escape`, explicit close action or overlay backdrop. For production add focus trap/return focus and full browser automation matrix.

## Verification

- Run `node --test tests/*.test.cjs` and `node tests/validate-static.mjs`.
- Manual browser smoke: every route, tenant switching, asset details, file selection, job lifecycle, API Key one-time secret, Webhook simulation, confirmation, reset.
- View at 1440px/1024px/760px/390px widths; check keyboard and reduced-motion setting. The file can be opened directly or via local static HTTP server.
