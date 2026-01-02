# Upstream Sync Consumer Guide

How fulmenhq/crucible consumes content from upstream repositories.

## Overview

This repository vendors schemas, configs, and other assets from upstream sources (primarily 3leaps/crucible). This document describes our patterns for consuming, validating, and updating vendored content.

## Upstream Sources

| Source                                                | Local Path                 | Content                            |
| ----------------------------------------------------- | -------------------------- | ---------------------------------- |
| [3leaps/crucible](https://github.com/3leaps/crucible) | `schemas/upstream/3leaps/` | Role prompt schema, AILink schemas |

Future upstream sources will follow the same pattern.

## Directory Structure

```
fulmenhq/crucible/
├── schemas/
│   ├── upstream/                    # Vendored schemas (DO NOT EDIT)
│   │   ├── README.md                # Upstream manifest
│   │   └── 3leaps/
│   │       ├── PROVENANCE.md        # Source tracking
│   │       └── agentic/v0/
│   │           └── role-prompt.schema.json
│   └── ...                          # Our own schemas
├── config/
│   └── upstream/                    # Future: vendored configs
├── docs/
│   └── upstream/                    # Future: vendored docs
└── .goneatignore                    # Excludes upstream from lint/format
```

## Current Vendored Content

### 3leaps/crucible

**Path**: `schemas/upstream/3leaps/`

**Content**:

- `agentic/v0/role-prompt.schema.json` - Schema for AI agent role prompts
- `ailink/v0/prompt.schema.json` - AILink prompt schema
- `ailink/v0/search-response.schema.json` - AILink response schema

**Provenance**: See `schemas/upstream/3leaps/PROVENANCE.md`

## Sync Workflow

### Checking for Updates

```bash
# Check upstream for changes
cd ~/dev/3leaps/crucible
git fetch origin
git log origin/main --oneline -5

# Compare with our vendored commit (from PROVENANCE.md)
git diff <our-commit>..origin/main -- schemas/
```

### Updating Vendored Content

```bash
# 1. Pull upstream
cd ~/dev/3leaps/crucible
git pull origin main

# 2. Get commit hash
UPSTREAM_COMMIT=$(git rev-parse HEAD)
echo "Upstream commit: $UPSTREAM_COMMIT"

# 3. Copy updated files
cd ~/dev/fulmenhq/crucible
cp ~/dev/3leaps/crucible/schemas/agentic/v0/role-prompt.schema.json \
   schemas/upstream/3leaps/agentic/v0/

# 4. Update PROVENANCE.md
# Edit schemas/upstream/3leaps/PROVENANCE.md with new commit hash

# 5. Validate
make upstream-validate
make lint-config

# 6. Commit
git add schemas/upstream/
git commit -m "chore(upstream): sync 3leaps schemas to $UPSTREAM_COMMIT"
```

## Validation

### Automated (in CI)

- `make precommit` includes `lint-config` which validates our configs against vendored schemas
- `make upstream-validate` validates vendored schemas against meta-schemas

### Manual

```bash
# Validate a specific config against vendored schema
goneat validate data \
  --schema-file schemas/upstream/3leaps/agentic/v0/role-prompt.schema.json \
  --data config/agentic/roles/devlead.yaml
```

## .goneatignore Configuration

Vendored content is excluded from lint/format to prevent false diffs:

```gitignore
# Vendored upstream content - validated in prepush via upstream-validate
schemas/upstream/
config/upstream/
```

## AGENTS.md Integration

From our AGENTS.md:

> **DO NOT** edit files in `schemas/upstream/` – these are vendored from external repositories.

Agents should:

- Reference vendored schemas for validation
- Never modify vendored content directly
- Escalate to human maintainers if upstream needs changes

## Troubleshooting

### Schema changed, configs now invalid

When upstream updates a schema with new required fields:

1. Check what changed: `diff schemas/upstream/3leaps/... ~/dev/3leaps/crucible/schemas/...`
2. Update local configs to satisfy new requirements
3. Run `make lint-config` to verify

### Merge conflicts in PROVENANCE.md

Take the newer commit hash. PROVENANCE.md tracks state, not code.

### goneat modifying vendored files

Check `.goneatignore` includes the upstream paths:

```bash
grep -E "upstream" .goneatignore
# Should show: schemas/upstream/ and config/upstream/
```

## Future: docs/upstream/

When we need to vendor documentation from upstream (e.g., standards that should render on our doc site), we'll use `docs/upstream/` following the same pattern.

## References

- [Upstream Sync Guide (3leaps)](https://github.com/3leaps/crucible/blob/main/docs/operations/upstream-sync-guide.md) - Producer-side guide
- [schemas/upstream/README.md](../../schemas/upstream/README.md) - Upstream manifest
- [schemas/upstream/3leaps/PROVENANCE.md](../../schemas/upstream/3leaps/PROVENANCE.md) - 3leaps provenance
