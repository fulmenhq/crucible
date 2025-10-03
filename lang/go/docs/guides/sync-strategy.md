---
title: "Crucible Sync Strategy"
description: "How downstream repositories synchronize schemas, docs, and templates from Crucible"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "approved"
tags: ["guide", "sync", "integration"]
---

# Crucible Sync Strategy

## Overview

Crucible provides two methods for consuming schemas, standards, and templates:

1. **Published Packages** - Language-specific packages (Go, TypeScript) for programmatic access
2. **Pull Scripts** - Reference scripts for selective synchronization into downstream repositories

This guide covers both approaches and when to use each.

## Distribution Methods

### Method 1: Published Packages (Recommended for Libraries/Tools)

**Use when:**

- Building libraries or tools that consume schemas/standards at runtime
- You want automatic dependency management
- You need typed APIs for schemas
- You want version tracking via package managers

**Go:**

```go
import "github.com/fulmenhq/crucible"

// Access embedded schemas
schema := crucible.Schemas.Terminal.V1_0_0()
```

**TypeScript:**

```typescript
import { schemas, standards } from "@fulmenhq/crucible";

const terminalSchema = schemas.terminal.v1_0_0;
```

**Package structure:**

```
@fulmenhq/crucible
├── schemas/      # Embedded schema access
├── standards/    # Standards as data structures
└── index         # Main exports
```

**Versioning:**

- Packages versioned with CalVer matching repository VERSION
- Example: `@fulmenhq/crucible@2025.10.0`
- Schemas/docs are snapshots at that version

### Method 2: Pull Scripts (Recommended for Vendoring/Documentation)

**Use when:**

- You want to vendor specific schemas/docs in your repository
- You need to customize or fork standards
- You're building a new language wrapper
- You want explicit control over sync timing

**Benefits:**

- Selective sync: only pull what you need
- Explicit versioning: pin to specific Crucible versions
- Customization: modify pulled assets if needed
- Transparency: synced files visible in your repo

## Pull Script Model

### Default Directory Structure

Crucible provides two standard patterns:

**Pattern A: Gitignored sync (like node_modules)**

```
your-repo/
├── .crucible/              # ← Gitignored
│   ├── schemas/
│   ├── docs/
│   └── templates/
├── .gitignore              # Contains .crucible/
└── package.json            # Or build script references .crucible/
```

**Pattern B: Vendored/committed sync**

```
your-repo/
├── crucible/               # ← Committed to git
│   ├── schemas/
│   ├── docs/
│   └── templates/
└── README.md               # References crucible/
```

**Recommendation:**

- Use **Pattern A** for most projects (cleaner git history)
- Use **Pattern B** when you need to fork/customize or ensure availability offline

### Pull Script Features

**Selective sync:**

```bash
# Pull everything
bun run crucible-pull.ts

# Pull only schemas
bun run crucible-pull.ts --schemas

# Pull specific schema
bun run crucible-pull.ts --schemas=terminal

# Pull docs and templates
bun run crucible-pull.ts --docs --templates
```

**Version pinning:**

```bash
# Pull from latest
bun run crucible-pull.ts

# Pull from specific version
bun run crucible-pull.ts --version=2025.10.0

# Pull from git ref
bun run crucible-pull.ts --ref=main
bun run crucible-pull.ts --ref=v2025.09.0
```

**Custom paths:**

```bash
# Override default .crucible/ path
bun run crucible-pull.ts --output=vendor/crucible

# Multiple outputs
bun run crucible-pull.ts --schemas --output=internal/schemas
```

## Integration Patterns

### Pattern 1: Build-Time Embedding (Go)

Pull schemas at build time and embed in binary:

```bash
# scripts/sync-crucible.sh
bun run crucible-pull.ts --schemas --output=.crucible
```

```go
// main.go
//go:embed .crucible/schemas/terminal/v1.0.0/schema.json
var terminalSchema []byte
```

**Makefile integration:**

```makefile
.PHONY: sync-crucible
sync-crucible:
	bun run scripts/crucible-pull.ts --schemas

.PHONY: build
build: sync-crucible
	go build -o myapp ./cmd/myapp
```

### Pattern 2: Runtime Loading (TypeScript)

Pull schemas and load at runtime:

```typescript
// src/schemas.ts
import { readFileSync } from "fs";
import { join } from "path";

export function loadTerminalSchema() {
  const path = join(
    __dirname,
    "../.crucible/schemas/terminal/v1.0.0/schema.json",
  );
  return JSON.parse(readFileSync(path, "utf-8"));
}
```

**Package.json integration:**

```json
{
  "scripts": {
    "sync:crucible": "bun run scripts/crucible-pull.ts --schemas",
    "prebuild": "bun run sync:crucible",
    "build": "tsc"
  }
}
```

### Pattern 3: Documentation Sync

Pull standards for inclusion in your docs:

```bash
# Pull coding standards
bun run crucible-pull.ts --docs=standards/coding

# Rendered in your docs
your-repo/docs/standards/coding/
├── go.md           # From crucible
└── typescript.md   # From crucible
```

**CI validation:**

```yaml
# .github/workflows/validate-standards.yml
- name: Sync Crucible standards
  run: bun run crucible-pull.ts --docs=standards

- name: Check for standards updates
  run: |
    if git diff --exit-code crucible/; then
      echo "✅ Standards are up to date"
    else
      echo "⚠️  Standards have updates available"
    fi
```

### Pattern 4: Template Sync

Pull templates for project scaffolding:

```bash
# Pull all templates
bun run crucible-pull.ts --templates

# Use in generator
your-repo/.crucible/templates/
├── go-cli-tool/
├── go-library/
└── typescript-library/
```

## Sync Configuration

### Configuration File

Create `.crucible-sync.json` in your repository:

```json
{
  "version": "2025.10.0",
  "output": ".crucible",
  "include": {
    "schemas": ["terminal", "pathfinder"],
    "docs": ["standards/coding"],
    "templates": []
  },
  "exclude": ["schemas/meta"],
  "gitignore": true
}
```

**Usage:**

```bash
bun run crucible-pull.ts --config=.crucible-sync.json
```

### CI/CD Integration

**Sync on CI:**

```yaml
# .github/workflows/build.yml
steps:
  - uses: actions/checkout@v4

  - name: Setup Bun
    uses: oven-sh/setup-bun@v1

  - name: Sync Crucible assets
    run: bun run scripts/crucible-pull.ts

  - name: Build
    run: bun run build
```

**Validate sync in PR:**

```yaml
# .github/workflows/validate-crucible.yml
steps:
  - name: Check Crucible sync
    run: |
      bun run scripts/crucible-pull.ts --dry-run
      if [ $? -ne 0 ]; then
        echo "❌ Crucible sync would update files"
        exit 1
      fi
```

## Version Coordination

### Tracking Crucible Version

**Option A: In package.json (TypeScript projects)**

```json
{
  "crucible": {
    "version": "2025.10.0",
    "lastSync": "2025-10-15T10:30:00Z"
  }
}
```

**Option B: Separate file**

```
.crucible-version
2025.10.0
```

**Option C: Git submodule (advanced)**

```bash
git submodule add https://github.com/fulmenhq/crucible.git vendor/crucible
git submodule update --init --recursive
```

### Updating Crucible

**Manual update:**

```bash
# Check current version
cat .crucible-version
# 2025.10.0

# Update to latest
bun run crucible-pull.ts --version=latest

# Test changes
bun run test

# Commit
git add .crucible-version .crucible/
git commit -m "chore: update crucible to 2025.11.0"
```

**Automated updates (Dependabot-style):**

```yaml
# .github/workflows/update-crucible.yml
name: Update Crucible

on:
  schedule:
    - cron: "0 0 * * 1" # Weekly
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for Crucible updates
        id: check
        run: |
          CURRENT=$(cat .crucible-version)
          LATEST=$(curl -s https://api.github.com/repos/fulmenhq/crucible/releases/latest | jq -r .tag_name | sed 's/v//')
          if [ "$CURRENT" != "$LATEST" ]; then
            echo "update_available=true" >> $GITHUB_OUTPUT
            echo "latest_version=$LATEST" >> $GITHUB_OUTPUT
          fi

      - name: Update Crucible
        if: steps.check.outputs.update_available == 'true'
        run: |
          bun run scripts/crucible-pull.ts --version=${{ steps.check.outputs.latest_version }}
          echo "${{ steps.check.outputs.latest_version }}" > .crucible-version

      - name: Create PR
        if: steps.check.outputs.update_available == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: "chore: update crucible to ${{ steps.check.outputs.latest_version }}"
          title: "Update Crucible to ${{ steps.check.outputs.latest_version }}"
          branch: "crucible-update-${{ steps.check.outputs.latest_version }}"
```

## Path Conventions

### Recommended Paths by Use Case

**For Go projects:**

```
.crucible/schemas/          # Build-time embed source
internal/standards/         # Committed standards docs
```

**For TypeScript projects:**

```
.crucible/                  # Gitignored, runtime load
docs/standards/            # Committed docs
```

**For multi-language projects:**

```
.crucible/                  # Shared sync location
lang/go/.crucible          # Go-specific (symlink)
lang/typescript/.crucible  # TS-specific (symlink)
```

**For documentation projects:**

```
crucible/                   # Committed, vendored
docs/imported/             # Processed/customized
```

### .gitignore Recommendations

**Pattern A (gitignored sync):**

```gitignore
# Crucible synced assets (pulled at build time)
.crucible/
```

**Pattern B (committed with metadata):**

```gitignore
# Crucible metadata only
.crucible-version
.crucible-sync.json
# Crucible assets are committed
```

## Best Practices

### 1. Pin Versions in Production

```json
{
  "crucible": {
    "version": "2025.10.0",
    "comment": "Pinned for stability, update quarterly"
  }
}
```

### 2. Validate on CI

```bash
# Always sync in CI to ensure consistency
bun run crucible-pull.ts --validate
```

### 3. Document Customizations

If you modify pulled assets:

```markdown
# docs/CRUCIBLE_CUSTOMIZATIONS.md

## Customized Files

- `crucible/standards/coding/go.md` - Added team-specific linting rules
- `crucible/schemas/terminal/v1.0.0/catalog/` - Added custom terminal configs
```

### 4. Use Selective Sync

Only pull what you need:

```json
{
  "include": {
    "schemas": ["terminal"],
    "docs": ["standards/coding/go"]
  }
}
```

### 5. Test After Updates

```bash
bun run crucible-pull.ts --version=2025.11.0
bun run test
bun run build
```

## Troubleshooting

### Sync Fails

```bash
# Check network connectivity
curl -I https://github.com/fulmenhq/crucible

# Verify version exists
curl -s https://api.github.com/repos/fulmenhq/crucible/tags | jq '.[].name'

# Use specific ref
bun run crucible-pull.ts --ref=v2025.10.0
```

### Version Mismatch

```bash
# Check current version
cat .crucible-version

# Force resync
bun run crucible-pull.ts --force --version=2025.10.0
```

### Path Conflicts

```bash
# Use custom output
bun run crucible-pull.ts --output=vendor/crucible

# Update references in code
```

## Migration Guide

### From Manual Copies to Pull Scripts

1. **Document current state:**

   ```bash
   find . -name "*crucible*" -o -name "*schema*"
   ```

2. **Create sync config:**

   ```json
   {
     "version": "2025.10.0",
     "include": { "schemas": ["terminal"] }
   }
   ```

3. **Initial sync:**

   ```bash
   bun run crucible-pull.ts --config=.crucible-sync.json
   ```

4. **Validate:**

   ```bash
   diff -r old-schemas/ .crucible/schemas/
   ```

5. **Update references:**
   Update import paths in code

6. **Commit:**
   ```bash
   git add .crucible-sync.json scripts/crucible-pull.ts
   git commit -m "feat: adopt crucible pull sync"
   ```

## Related Documentation

- [Repository Versioning Standard](../standards/repository-versioning.md)
- [Repository Structure SOP](../sop/repository-structure.md)
- [Frontmatter Standard](../standards/frontmatter-standard.md)

---

**Status**: Approved  
**Last Updated**: 2025-10-02  
**Author**: @3leapsdave
