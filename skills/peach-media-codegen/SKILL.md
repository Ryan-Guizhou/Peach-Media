---
name: peach-media-codegen
description: Generate reviewable Peach Cloud and Peach Media entity scaffolds from a structured JSON entity schema. Use when creating a new CRUD-oriented media business entity, producing Spring Web/Lombok code skeletons, MySQL DDL, OpenAPI contracts, frontend HTML samples, and permission definitions with explicit tenant/project boundaries. Do not use for autonomous repository writes, schema migrations, or production deployments.
---

# Peach Media Code Generator

Generate deterministic scaffold files from a validated entity schema. Keep the result reviewable; **never claim the generated code is production-ready**.

## Input

Require an entity schema JSON object matching [`references/example-schema.json`](references/example-schema.json). Include `entityName` (PascalCase), `packageName` (lowercase dotted), `tableName` (snake_case), `description`, and 1–24 `fields` with `name`, `type`, `required`, and optional String `length`.

Available field types: String, Long, Integer, BigDecimal, Boolean, LocalDateTime. Reject invalid names, reserved base fields, duplicate fields, and unsupported types. Do not invent new fields without approval.

## Generate

1. Normalize and validate schema using `scripts/generate.cjs`.
2. Generate Java DTO/domain/controller/service/access-port skeletons, MySQL DDL, OpenAPI 3 contract, permission catalog, an HTML example, and an implementation README.
3. Review generated output paths and content before exporting.
4. Run `node scripts/cli.cjs --input references/example-schema.json --out ./generated` from this skill directory for a local example. `--out` is an explicit path and existing files are refused by default.
5. Treat generated artifacts as a **draft for an implementer**. Require human review before applying to a repository or running SQL. Do not auto-commit, auto-merge, deploy, or silently overwrite existing files.

## Project security and style contract

- Tenant ID and project ID must be resolved from authenticated server context; do not accept them from request DTOs as authorization facts.
- The generated AccessPort is an interface, **not a default-allow permission implementation**. The host project must supply an authenticated implementation, and all queries need server-side data-scope filtering.
- Use Chinese Javadoc and English operational log messages in later implementations; this first draft deliberately emits no runtime logging code.
- No wildcard imports, fully qualified class names embedded in field declarations, `ENGINE=...`, `CHARACTER SET`, or `COLLATE` clauses in generated SQL.
- The example endpoint and frontend are illustrative only; they require host-project wiring, validation, tests, audit, and authentication before use.
- Do not change Peach Media's OpenFeign + RocketMQ / Peach Scheduler architecture or add OTRYX Flow.

## Future Agent and MCP integration

A future Agent can translate a natural-language business request into the same strict schema, but validation and file generation remain deterministic. Expose preview/generate operations through a scoped MCP Tool (`codegen.preview`) and a separate approval-gated `codegen.propose_patch` action. Neither tool is allowed to execute arbitrary shell commands, write outside an isolated workspace, or merge a pull request without review.
