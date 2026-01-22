# Upstream Sync Consumer Guide

How fulmenhq/crucible consumes content from upstream repositories.

## Overview

This repository vendors schemas, configs, and other assets from upstream sources (primarily 3leaps/crucible). This document describes our patterns for consuming, validating, and updating vendored content.

## Upstream Sources

| Source                                                | Local Path                          | Content                                          |
| ----------------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| [3leaps/crucible](https://github.com/3leaps/crucible) | `schemas/upstream/3leaps/crucible/` | Classifiers, foundation schemas, AILink, agentic |

Future upstream sources will follow the `<org>/<repo>/` pattern.

## Directory Structure

```
fulmenhq/crucible/
├── schemas/
│   ├── upstream/                         # Vendored content (DO NOT EDIT)
│   │   └── 3leaps/crucible/              # org/repo structure
│   │       ├── PROVENANCE.md             # Source tracking
│   │       ├── schemas/
│   │       │   ├── agentic/v0/           # Role prompt (MANUAL)
│   │       │   ├── ailink/v0/            # Prompt/response schemas
│   │       │   ├── classifiers/v0/       # Dimension meta-schemas
│   │       │   └── foundation/v0/        # Type primitives
│   │       ├── config/
│   │       │   └── classifiers/          # Dimension definitions
│   │       └── docs/
│   │           ├── standards/            # Classification standards
│   │           └── catalog/              # Classifier catalog
│   └── ...                               # Our own schemas
└── .goneatignore                         # Excludes upstream from lint/format
```

## Current Vendored Content

### 3leaps/crucible

**Path**: `schemas/upstream/3leaps/crucible/`

**Content** (auto-synced):

- `schemas/classifiers/v0/` - Dimension meta-schemas
- `schemas/foundation/v0/` - Type primitives, error response
- `schemas/ailink/v0/` - AILink prompt/response schemas
- `config/classifiers/dimensions/` - 7 dimension definitions
- `docs/standards/` - 8 classification standards
- `docs/catalog/classifiers/` - Classifier catalog

**Content** (manual):

- `schemas/agentic/v0/role-prompt.schema.json` - Role prompt schema (manually synced)

**Provenance**: See `schemas/upstream/3leaps/crucible/PROVENANCE.md`

## Sync Workflow

### Checking for Updates

```bash
# Check upstream for changes
cd ~/dev/3leaps/crucible
git fetch origin
git log origin/main --oneline -5

# Compare with our vendored commit (from PROVENANCE.md)
git diff <our-commit>..origin/main -- schemas/ config/ docs/
```

### Updating Vendored Content (Automated)

```bash
# Ensure 3leaps/crucible is at desired version/tag
cd ~/dev/3leaps/crucible
git checkout v0.1.4  # or main, or specific tag

# Run sync script (assumes repos are siblings: ../3leaps/crucible)
cd ~/dev/fulmenhq/crucible
bun run scripts/3leaps-crucible-upstream-pull.ts

# Or preview first with dry-run
bun run scripts/3leaps-crucible-upstream-pull.ts --dry-run

# Validate
make upstream-validate
make lint-config

# Commit
git add schemas/upstream/3leaps/crucible/
git commit -m "chore(upstream): sync 3leaps/crucible to v0.1.4"
```

### Updating Manual Content (agentic schema)

```bash
# Manual sync for role-prompt schema (requires review)
cp ~/dev/3leaps/crucible/schemas/agentic/v0/role-prompt.schema.json \
   schemas/upstream/3leaps/crucible/schemas/agentic/v0/

# Update PROVENANCE.md manually if needed
# Validate and commit
```

## Validation

### Automated (in CI)

- `make precommit` includes `lint-config` which validates our configs against vendored schemas
- `make upstream-validate` validates vendored schemas against meta-schemas

### Manual

```bash
# Validate a specific config against vendored schema
goneat validate data \
  --schema-file schemas/upstream/3leaps/crucible/schemas/agentic/v0/role-prompt.schema.json \
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

1. Check what changed: `diff schemas/upstream/3leaps/crucible/schemas/... ~/dev/3leaps/crucible/schemas/...`
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
- [3leaps-crucible-upstream-pull.ts](../../scripts/3leaps-crucible-upstream-pull.ts) - Sync script
- [schemas/upstream/README.md](../../schemas/upstream/README.md) - Upstream manifest
- [schemas/upstream/3leaps/crucible/PROVENANCE.md](../../schemas/upstream/3leaps/crucible/PROVENANCE.md) - 3leaps provenance
