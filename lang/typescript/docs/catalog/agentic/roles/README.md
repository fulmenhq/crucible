---
title: "Role Catalog (Migrated)"
description: "Role prompts have moved to config/agentic/roles/"
author: "entarch"
author_of_record: "Dave Thompson (https://github.com/3leapsdave)"
supervised_by: "@3leapsdave"
date: "2026-01-01"
last_updated: "2026-01-01"
status: "deprecated"
category: "agentic"
tags: ["role", "agentic", "catalog", "migration"]
---

# Role Catalog - Migrated

Role prompts have moved from Markdown to schema-validated YAML.

## New Location

**Role definitions**: [`config/agentic/roles/`](../../../../config/agentic/roles/)

## Migration Summary

| Before (deprecated)                     | After (current)                             |
| --------------------------------------- | ------------------------------------------- |
| `docs/catalog/agentic/roles/devlead.md` | `config/agentic/roles/devlead.yaml`         |
| Markdown with YAML frontmatter          | Pure YAML, schema-validated                 |
| Manual validation                       | `make lint-config` validates against schema |

## Why the Change?

1. **Schema validation**: YAML roles validate against `role-prompt.schema.json`
2. **Consistency**: All config data lives in `config/`, all schemas in `schemas/`
3. **Tooling**: `make lint-config` catches errors before commit
4. **Upstream alignment**: Matches 3leaps/crucible structure

## References

- [Role Catalog README](../../../../config/agentic/roles/README.md) - Current role definitions
- [Role-Prompt Schema](../../../schemas/upstream/3leaps/agentic/v0/role-prompt.schema.json) - Validation schema
- [Git Commit Attribution](../attribution/git-commit.md) - Commit format (unchanged)
