# Crucible Operations ADRs

This directory contains Architecture Decision Records (ADRs) specific to Crucible repository operations and build processes.

## Purpose

These ADRs document decisions about:

- Build pipeline and automation
- Repository structure and tooling
- Sync processes and workflows
- Development operations and maintenance
- CI/CD configuration

## Scope

**Local to Crucible**: These ADRs apply only to the Crucible repository itself and do not sync to language wrappers (`lang/go/`, `lang/typescript/`, `lang/python/`).

**Different from Ecosystem ADRs**: For cross-language decisions affecting helper libraries, see [`docs/architecture/decisions/`](../../architecture/decisions/) which syncs to all language wrappers.

## ADR Index

| ID       | Title              | Status   | Date       |
| -------- | ------------------ | -------- | ---------- |
| ADR-0001 | Format Before Sync | Accepted | 2025-10-22 |

## Why This Location?

The `docs/ops/` directory is excluded from sync (see `scripts/sync-to-lang.ts:75-99`), making it ideal for Crucible-specific operational decisions that don't need to propagate to language wrappers.

## ADR Format

Follow the standard ADR template from [`docs/architecture/decisions/template.md`](../../architecture/decisions/template.md), simplified for local scope:

- Use `ADR-XXXX-kebab-case-title.md` naming
- Include frontmatter with status, date, scope
- Document context, decision, rationale, consequences
- Keep scope field as "Crucible Operations"

## Related Documentation

- [Ecosystem ADRs](../../architecture/decisions/) - Cross-language decisions
- [Repository Operations SOP](../../sop/repository-operations-sop.md) - Standard operating procedures
- [Commit Checklist](../repository/commit-checklist.md) - Pre-commit workflow
- [Release Checklist](../repository/release-checklist.md) - Release process
