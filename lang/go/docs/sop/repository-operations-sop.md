---
title: "FulmenHQ Repository Operations SOP"
description: "Standard operating procedure for repository operations, including safety protocols and guardrails"
author: "Pipeline Architect"
date: "2025-10-06"
last_updated: "2025-10-06"
status: "approved"
tags: ["sop", "operations", "safety", "repository"]
---

# FulmenHQ Repository Operations SOP

## Overview

This SOP defines the operational guidelines, safety protocols, and guardrails for all FulmenHQ repositories. It serves as the canonical standard for repository operations to ensure consistency, reliability, and security across the ecosystem.

**When performing repository operations**, follow these guidelines to prevent accidental drift, data loss, or unauthorized releases.

## General Rules

1. **Human Oversight**: No merges, tags, or package publishes without explicit approval from @3leapsdave.
2. **Command Discipline**: Prefer `make` targets and bundled scripts over ad-hoc commands to ensure language wrappers stay in sync.
3. **Plan Before Action**: Record work plans in `.plans/` (gitignored) or session transcripts before making structural changes.

## High-Risk Operations

| Operation                              | Risk                          | Protocol                                                                                                    |
| -------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Editing schemas/docs/templates in root | Breaking downstream consumers | Update root, run `bun run sync:to-lang`, verify tests, and ensure `make release:check` passes before merge. |
| Version bumps                          | Package/version drift         | Use `bun run version:update` or `make version:set`. Never edit `VERSION` manually.                          |
| Publishing Go/npm packages             | Releasing stale assets        | Confirm release checklist complete, run `make release:prepare`, obtain human approval, then tag/publish.    |
| Deleting schemas or standards          | Downstream breakage           | Requires issue + maintainer review. Provide migration plan and version bump.                                |
| Modifying CI workflows                 | Broken automation             | Review with @3leapsdave. Test in branch before merging.                                                     |

## Required Commands & Tools

- `make bootstrap`, `make lint`, `make test`, `make release:check`
- `bun run sync:to-lang`
- `bun run scripts/update-version.ts`
- `bun run scripts/crucible-pull.ts --validate` (for pull-script verification)

## Forbidden Actions

- Force pushes to `main` or release branches.
- Publishing packages from unreviewed branches.
- Storing secrets or credentials in the repository.

## Incident Response

1. **Assess**: Capture logs, diffs, and current state.
2. **Notify**: Ping @3leapsdave (and other maintainers as needed) on Mattermost / GitHub.
3. **Mitigate**: Revert offending commits or tags (`git revert`, `git tag -d` etc.) under supervision.
4. **Document**: Record the incident and remediation in `.plans/incident-logs/` (gitignored) and update relevant SOPs if needed.

## Environment & Credentials

- GitHub tokens: stored in repository secrets (`FULMEN_NPM_TOKEN`, `FULMEN_GO_PROXY_TOKEN` – future use).
- Mattermost: use assigned agent handles once channels go live.
- Local scripts assume no network access beyond public GitHub unless explicitly approved.

## Related Standards and SOPs

- [Repository Structure SOP](repository-structure.md)
- [CI/CD Operations SOP](cicd-operations.md)
- [Makefile Standard](../standards/makefile-standard.md)
- [Release Checklist Standard](../standards/release-checklist-standard.md)
- [AI Agent Collaboration Standard](../standards/ai-agents.md)
- [Agentic Attribution Standard](../standards/agentic-attribution.md)

---

**Status**: Approved  
**Last Updated**: 2025-10-06  
**Author**: Pipeline Architect  
**Effective Date**: 2025-10-06
