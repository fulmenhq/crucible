---
title: "Crucible Scripts"
description: "Internal automation scripts for crucible maintenance"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "approved"
tags: ["scripts", "automation", "bun"]
---

# Crucible Scripts

Internal automation scripts for maintaining the crucible repository.

## Cross-Platform Strategy

**All internal scripts are written in Bun/TypeScript** to ensure cross-platform compatibility (Windows, macOS, Linux).

### Why Bun/TypeScript?

✅ **Cross-platform**: Works identically on Windows, macOS, Linux  
✅ **Fast**: Bun is significantly faster than Node.js  
✅ **Built-in tools**: No need for bash utilities (cp, rm, etc.)  
✅ **Type-safe**: TypeScript provides better maintainability  
✅ **Consistent**: Same runtime for all automation

### Prerequisites

Contributors must have:

- **Bun >= 1.2.0** ([Install](https://bun.sh))

## Available Scripts

### Internal Scripts (For Maintainers)

#### sync-to-lang.ts

Syncs root `schemas/` and `docs/` to language wrappers.

```bash
# Sync all
bun run scripts/sync-to-lang.ts

# Dry run
bun run scripts/sync-to-lang.ts --dry-run

# Verbose output
bun run scripts/sync-to-lang.ts --verbose
```

**When to run:**

- Before bumping VERSION
- Before publishing packages
- After updating schemas or docs

**What it does:**

```
schemas/ → lang/go/schemas/
schemas/ → lang/typescript/schemas/
docs/ → lang/go/docs/
docs/ → lang/typescript/docs/
```

#### update-version.ts

Synchronizes CalVer across language wrappers and packages using the root `VERSION` file.

```bash
bun run scripts/update-version.ts
```

**What it does:**

```
VERSION → lang/go/schemas.go (const Version)
VERSION → lang/typescript/src/index.ts (VERSION exports)
VERSION → lang/typescript/src/schemas.ts (VERSION constant)
VERSION → lang/typescript/package.json (version field)
```

**When to run:**

- After editing the `VERSION` file
- Before publishing Go/npm packages
- When reviewing release PRs to ensure consistency

#### sync-schemas.ts

Fetches JSON Schema meta-schemas from upstream.

```bash
bun run scripts/sync-schemas.ts
```

**When to run:**

- When JSON Schema specifications update
- Rarely needed (meta-schemas stable)

**What it does:**

- Downloads draft-07 and draft-2020-12 meta-schemas
- Saves to `schemas/meta/`

### Reference Scripts (For Downstream)

#### pull/crucible-pull.ts

Reference implementation for downstream repositories to pull assets.

**Not for internal use** - see [pull/README.md](pull/README.md) for details.

## NPM Scripts

Convenient aliases in `package.json`:

```bash
# Sync meta-schemas
bun run sync:schemas

# Sync to language wrappers
bun run sync:to-lang

# Sync everything
bun run sync:all

# Test Go package
bun run test:go

# Test TypeScript package
bun run test:ts
```

## Make Targets

For developers who prefer Make:

```bash
# Sync meta-schemas
make sync-schemas

# Sync to language wrappers
make sync-to-lang

# Show all targets
make help
```

## Workflow

### Standard Development Flow

```bash
# 1. Update schemas or docs in root
vim schemas/terminal/v1.0.0/schema.json

# 2. Sync to language wrappers
bun run sync:to-lang

# 3. Test language packages
bun run test:go
bun run test:ts

# 4. Review changes
git diff lang/

# 5. Commit together
git add schemas/ lang/
git commit -m "feat: add new terminal schema field"
```

### Pre-Release Flow

```bash
# 1. Ensure everything synced
bun run sync:all

# 2. Test everything
bun run test:go
bun run test:ts

# 3. Bump version
echo "2025.10.1" > VERSION

# 4. Update package versions
# (Manual or via version script - TBD)

# 5. Tag release
git tag v2025.10.1
git push origin v2025.10.1
```

## Script Development Guidelines

When adding new internal scripts:

1. **Use Bun/TypeScript**: Not bash/shell
2. **Add to package.json**: Create npm script alias
3. **Add to Makefile**: Optional convenience target
4. **Document here**: Update this README
5. **Executable permission**: `chmod +x scripts/your-script.ts`
6. **Shebang**: Add `#!/usr/bin/env bun` at top
7. **Help text**: Include `--help` flag
8. **Dry run**: Consider `--dry-run` for destructive operations

### Template

```typescript
#!/usr/bin/env bun

/**
 * Script Title
 *
 * Description of what this script does.
 *
 * Usage:
 *   bun run scripts/my-script.ts
 *   bun run scripts/my-script.ts --option
 */

import { parseArgs } from "util";

async function main() {
  const args = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (args.values.help) {
    printHelp();
    process.exit(0);
  }

  // Script logic here
  console.log("✅ Done");
}

function printHelp() {
  console.log(`
Script Title

USAGE:
  bun run scripts/my-script.ts [OPTIONS]

OPTIONS:
  --help       Show this help
  --dry-run    Preview without making changes
`);
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
```

## Migration from Shell Scripts

**Old shell scripts** (`*.sh`) are deprecated and will be removed.

**Migration guide:**

| Old Shell Script     | New Bun/TypeScript Script | Status      |
| -------------------- | ------------------------- | ----------- |
| `sync-schemas.sh`    | `sync-schemas.ts`         | ✅ Complete |
| `sync-typescript.sh` | `sync-to-lang.ts`         | ✅ Complete |

## Related Documentation

- [Sync Model Architecture](../docs/architecture/sync-model.md)
- [Pull Scripts for Downstream](pull/README.md)
- [Repository Structure SOP](../docs/sop/repository-structure.md)

---

**Status**: Approved  
**Last Updated**: 2025-10-02  
**Author**: @3leapsdave
