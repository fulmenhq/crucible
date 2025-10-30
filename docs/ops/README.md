# Crucible Operations Documentation

Operational checklists, memos, and local ADRs for maintaining the Crucible repository.

## Overview

This directory contains operational documentation specific to **Crucible repository management**. Unlike ecosystem-wide documentation in [../architecture/](../architecture/), [../standards/](../standards/), and [../sop/](../sop/), content here is **local to Crucible** and focuses on day-to-day maintenance tasks.

## What's Here

### Repository Operations

#### [repository/commit-checklist.md](repository/commit-checklist.md)

Pre-commit checklist ensuring quality before committing to Crucible.

**Covers**:

- SSOT editing verification
- Sync status (schemas, docs, config to `lang/*/`)
- Version alignment check
- Test execution (Go, TypeScript, Python)
- Linting and formatting
- Schema validation

**When to use**: Before every commit to Crucible main branch.

---

#### [repository/release-checklist.md](repository/release-checklist.md)

Pre-release quality gates for tagging new Crucible versions.

**Covers**:

- All commit checklist items
- Version bump verification
- CHANGELOG update
- Release notes creation
- Tag format validation
- CI/CD status check
- Downstream impact review

**When to use**: Before creating a release tag.

---

#### [repository/memos/](repository/memos/)

Dated memos documenting specific operational decisions or incidents.

**Example**:

- `2025-10-07-initial-commit-history-squash.md` - Decision to squash initial commits

**When to add**: Documenting unique operational events or decisions that don't warrant a full ADR.

---

### Local ADRs

#### [adr/README.md](adr/README.md)

**Tier 2 ADRs** specific to Crucible repository operations.

**Scope**: Decisions about Crucible's internal processes, CI/CD, testing strategies, etc. that don't affect the broader ecosystem.

**Examples**:

- ADR-0001: Format before sync (Crucible-specific workflow)

**Distinction**: Unlike ecosystem ADRs in [../architecture/decisions/](../architecture/decisions/README.md), these are **NOT synced** to language wrappers.

---

## Quick Reference

### By Task

**Before Committing**:

1. Review [repository/commit-checklist.md](repository/commit-checklist.md)
2. Run `make precommit`

**Before Releasing**:

1. Review [repository/release-checklist.md](repository/release-checklist.md)
2. Verify all checklist items
3. Create release notes in `release-notes/`
4. Tag with `v{VERSION}`

**Documenting an Incident**:

1. Create memo in [repository/memos/](repository/memos/) with date prefix
2. Use format: `YYYY-MM-DD-brief-description.md`

**Proposing Local ADR**:

1. Check [adr/README.md](adr/README.md) for guidance
2. Determine if it's truly local (not ecosystem-wide)
3. Create ADR using template
4. Submit PR for review

### By Role

**Crucible Maintainer**:

- All checklists are mandatory before commit/release
- Memos for documenting operational decisions
- Local ADRs for Crucible-specific processes

**Ecosystem Maintainer** (reviewing Crucible changes):

- Review [repository/commit-checklist.md](repository/commit-checklist.md) to understand required gates
- Check [repository/release-checklist.md](repository/release-checklist.md) for release expectations

**Contributor**:

- Follow [repository/commit-checklist.md](repository/commit-checklist.md) for PR submissions
- Understand required quality gates

## Related Documentation

### Ecosystem SOPs

- [../sop/repository-operations-sop.md](../sop/repository-operations-sop.md) - Standard operations applying to all Fulmen repos
- [../sop/cicd-operations.md](../sop/cicd-operations.md) - CI/CD setup and management
- [../sop/repository-structure.md](../sop/repository-structure.md) - Repository layout requirements

### Ecosystem ADRs

- [../architecture/decisions/README.md](../architecture/decisions/README.md) - Tier 1 ecosystem ADRs
- [ADR-0001: Two-Tier ADR System](../architecture/decisions/ADR-0001-two-tier-adr-system.md) - Distinction between Tier 1 and Tier 2

### Standards

- [../standards/release-checklist-standard.md](../standards/release-checklist-standard.md) - General release checklist template
- [../standards/repository-versioning.md](../standards/repository-versioning.md) - Versioning strategies

## Contributing

Operations documentation improvements are welcome!

**Process**:

1. Check if change should be here (`docs/ops/`) or in ecosystem SOPs (`docs/sop/`)
2. Update relevant checklists/ADRs
3. Test procedures to ensure accuracy
4. Submit PR with clear rationale

**Questions**: https://github.com/fulmenhq/crucible/issues

---

**Note**: Operations documentation is **local to Crucible** and NOT synced to language wrappers. This differs from most other Crucible docs which are ecosystem-wide SSOT.
