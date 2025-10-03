---
title: "Crucible Pull Scripts"
description: "Reference implementation scripts for syncing Crucible assets to downstream repositories"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "approved"
tags: ["scripts", "sync", "reference"]
---

# Crucible Pull Scripts

This directory contains reference implementation scripts for synchronizing Crucible assets (schemas, docs, templates) into downstream repositories.

## Available Scripts

### crucible-pull.ts (Primary - Bun/TypeScript)

**Purpose**: Cross-platform pull script for all asset types

**Usage:**

```bash
# Copy to your repository
cp scripts/pull/crucible-pull.ts <your-repo>/scripts/

# Run
bun run scripts/crucible-pull.ts --help
```

**Features:**

- Selective sync (schemas, docs, templates)
- Version pinning
- Config file support
- Gitignore management
- Dry-run mode

**Examples:**

```bash
# Pull everything (latest)
bun run scripts/crucible-pull.ts

# Pull only terminal schemas
bun run scripts/crucible-pull.ts --schemas terminal

# Pull specific version
bun run scripts/crucible-pull.ts --version=2025.10.0

# Use config file
bun run scripts/crucible-pull.ts --config=.crucible-sync.json
```

### crucible-pull.sh (Alternative - Shell)

**Purpose**: Shell-based pull script for environments without Bun/Node

**Status**: Coming soon

**Planned features:**

- Bash/sh compatibility
- Minimal dependencies (git, curl, tar)
- Same CLI interface as TypeScript version

## Integration Patterns

### Pattern 1: NPM/Bun Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "crucible:pull": "bun run scripts/crucible-pull.ts",
    "crucible:pull:schemas": "bun run scripts/crucible-pull.ts --schemas",
    "crucible:update": "bun run scripts/crucible-pull.ts --version=latest",
    "prebuild": "bun run crucible:pull"
  }
}
```

### Pattern 2: Makefile

Add to `Makefile`:

```makefile
.PHONY: sync-crucible
sync-crucible:
	bun run scripts/crucible-pull.ts

.PHONY: build
build: sync-crucible
	go build ./...
```

### Pattern 3: GitHub Actions

`.github/workflows/build.yml`:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Sync Crucible
        run: bun run scripts/crucible-pull.ts

      - name: Build
        run: bun run build
```

## Configuration

### Config File Format

Create `.crucible-sync.json`:

```json
{
  "version": "2025.10.0",
  "output": ".crucible",
  "include": {
    "schemas": ["terminal", "pathfinder"],
    "docs": ["standards/coding/go"],
    "templates": []
  },
  "exclude": ["schemas/meta"],
  "gitignore": true
}
```

### Directory Layouts

**Option A: Gitignored (Recommended)**

```
your-repo/
├── .crucible/              # Synced assets (gitignored)
├── .crucible-sync.json     # Config
├── .gitignore              # Contains .crucible/
└── scripts/
    └── crucible-pull.ts
```

**Option B: Vendored**

```
your-repo/
├── crucible/               # Synced assets (committed)
├── .crucible-sync.json     # Config
└── scripts/
    └── crucible-pull.ts
```

## Customization Guide

The pull scripts are designed to be copied and adapted:

### 1. Copy to Your Repository

```bash
cp scripts/pull/crucible-pull.ts your-repo/scripts/
```

### 2. Customize Defaults

Edit the script constants:

```typescript
const DEFAULT_OUTPUT = ".crucible"; // Change default path
const CRUCIBLE_REPO = "https://github.com/fulmenhq/crucible.git";
```

### 3. Add Custom Filters

```typescript
function shouldInclude(path: string): boolean {
  // Custom logic to filter files
  return !path.includes("test");
}
```

### 4. Add Post-Processing

```typescript
async function postProcess(outputPath: string) {
  // Custom transformations after sync
  console.log("Running custom post-processing...");
}
```

## Version Management

### Tracking Crucible Version

The script creates `.crucible-version`:

```
2025.10.0
```

### Version File Usage

**In package.json:**

```json
{
  "crucible": {
    "version": "2025.10.0",
    "lastSync": "2025-10-15T10:30:00Z"
  }
}
```

**In Go:**

```go
// Read .crucible-version
version, err := os.ReadFile(".crucible-version")
if err != nil {
    panic(err)
}
fmt.Printf("Using Crucible %s\n", strings.TrimSpace(string(version)))
```

## Troubleshooting

### Git Clone Fails

**Problem**: Network issues or invalid version

**Solution:**

```bash
# Check network
curl -I https://github.com/fulmenhq/crucible

# Verify version exists
git ls-remote --tags https://github.com/fulmenhq/crucible.git

# Use specific ref
bun run scripts/crucible-pull.ts --ref=main
```

### Permission Errors

**Problem**: Cannot write to output directory

**Solution:**

```bash
# Check permissions
ls -la .crucible/

# Create directory with correct permissions
mkdir -p .crucible
chmod 755 .crucible
```

### Gitignore Not Updated

**Problem**: .crucible/ still tracked by git

**Solution:**

```bash
# Remove from git cache
git rm -r --cached .crucible/

# Add to .gitignore manually if needed
echo ".crucible/" >> .gitignore

# Or use --gitignore flag
bun run scripts/crucible-pull.ts --gitignore
```

## Best Practices

### 1. Pin Versions in Production

```json
{
  "version": "2025.10.0",
  "comment": "Pinned for stability"
}
```

### 2. Sync in CI

Always sync in CI to ensure consistency:

```yaml
- name: Sync Crucible
  run: bun run scripts/crucible-pull.ts
```

### 3. Selective Sync

Only pull what you need:

```json
{
  "include": {
    "schemas": ["terminal"],
    "docs": []
  }
}
```

### 4. Version Tracking

Commit `.crucible-sync.json` and `.crucible-version`:

```bash
git add .crucible-sync.json .crucible-version
git commit -m "chore: track crucible version"
```

### 5. Automated Updates

Set up weekly checks for updates:

```yaml
# .github/workflows/update-crucible.yml
on:
  schedule:
    - cron: "0 0 * * 1" # Weekly
```

## Migration from Manual Sync

### From sync-schemas.sh

**Old:**

```bash
./scripts/sync-schemas.sh
```

**New:**

```bash
bun run scripts/crucible-pull.ts --schemas
```

### From sync-typescript.sh

**Old:**

```bash
./scripts/sync-typescript.sh
```

**New:**

```bash
bun run scripts/crucible-pull.ts --schemas --docs
```

### From Git Submodules

**Old:**

```bash
git submodule update --init
```

**New:**

```bash
bun run scripts/crucible-pull.ts --version=2025.10.0
```

## Related Documentation

- [Sync Strategy Guide](../../docs/guides/sync-strategy.md)
- [Repository Structure SOP](../../docs/sop/repository-structure.md)
- [Repository Versioning Standard](../../docs/standards/repository-versioning.md)

## Contributing

Improvements to these scripts should be submitted as PRs to `fulmenhq/crucible`.

When adding features:

- Maintain backward compatibility
- Add tests if possible
- Update documentation
- Consider cross-platform compatibility

---

**Status**: Approved  
**Last Updated**: 2025-10-02  
**Author**: @3leapsdave
