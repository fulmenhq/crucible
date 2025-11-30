# Crucible Documentation

This directory contains **authoritative documentation** for the FulmenHQ ecosystem. Crucible is the **Single Source of Truth (SSOT)** - documentation here is the canonical source that syncs to all language-specific helper libraries.

## ✅ Editing Documentation in Crucible

**You are in the SSOT repository** - editing is encouraged and required here:

- ✅ **Edit** files in this directory to update ecosystem documentation
- ✅ **Create** new standards, guides, and ADRs as needed
- ✅ **Format** files using `make fmt` before committing
- ✅ **Commit** changes following proper attribution standards
- ✅ **Run** `make sync` to propagate changes to `lang/*/` wrappers

**Changes here automatically sync** to language wrappers in `lang/go/`, `lang/python/`, `lang/typescript/`.

## 📝 Documentation Categories

### Ecosystem Documentation (Edit Here)

Documentation that applies across **all** Fulmen projects:

- **Architecture** (`architecture/`) - Ecosystem design, technical manifesto, sync model
- **Standards** (`standards/`) - Cross-language coding standards, API patterns, security
- **Guides** (`guides/`) - Integration guides, sync workflows, bootstrap procedures
- **SOPs** (`sop/`) - Operational procedures for repository management, CI/CD
- **Operations** (`ops/`) - Repository checklists, memos, release procedures

### Language Wrapper Sync Destinations

Documentation from `docs/` is synced to language wrappers within Crucible:

- `lang/go/docs/` (read-only copy for Go wrapper)
- `lang/python/docs/` (read-only copy for Python wrapper)
- `lang/typescript/docs/` (read-only copy for TypeScript wrapper)

When these wrappers are packaged and published to separate repositories (gofulmen, pyfulmen, tsfulmen), the synced docs travel with them.

## 📁 Directory Structure

```
docs/
├── README.md                    # This file (SSOT source)
├── architecture/                # Ecosystem architecture (edit here)
│   ├── decisions/              # Ecosystem ADRs (edit here)
│   ├── modules/                # Module documentation
│   └── ...
├── standards/                   # Cross-language standards (edit here)
│   ├── coding/                 # Language-specific coding standards
│   ├── library/                # Library module standards
│   ├── api/                    # API design standards
│   └── ...
├── guides/                      # Integration guides (edit here)
├── sop/                         # Standard operating procedures
└── ops/                         # Operational checklists and memos
```

## 🔄 How Syncing Works

Crucible maintains authoritative versions of:

- **Documentation** (`docs/`) - Architecture, standards, guides
- **Schemas** (`schemas/`) - JSON Schema definitions
- **Configuration** (`config/`) - Default configs, catalogs, taxonomy

When `make sync` runs in Crucible, these assets are copied to language wrappers:

```bash
# Within Crucible repository:
docs/       → lang/go/docs/
docs/       → lang/python/docs/
docs/       → lang/typescript/docs/

schemas/    → lang/go/schemas/
schemas/    → lang/python/schemas/
schemas/    → lang/typescript/schemas/

config/     → lang/go/config/
config/     → lang/python/config/
config/     → lang/typescript/config/
```

This ensures **consistency across all language wrappers** before they're published.

## 📋 ADR System (Two-Tier)

### Tier 1: Ecosystem ADRs (Edit Here)

**Location**: `docs/architecture/decisions/ADR-XXXX-*.md`

- **Scope**: Cross-language architectural decisions affecting all Fulmen projects
- **Sync**: Automatically synced to `lang/*/docs/architecture/decisions/`
- **Changes**: Edit directly in this directory, then `make sync`

### Tier 2: Local ADRs (Not Here)

**Location**: `docs/development/adr/ADR-XXXX-*.md` (in published language repositories)

- **Scope**: Library-specific decisions for gofulmen/pyfulmen/tsfulmen
- **Sync**: NOT synced from Crucible; maintained independently in each library
- **Changes**: Created directly in published language repositories

See [ADR-0001: Two-Tier ADR System](architecture/decisions/ADR-0001-two-tier-adr-system.md) for details.

## 🛠️ Crucible Maintainer Workflow

### Editing Documentation

```bash
# Edit ecosystem documentation (you are in the SSOT)
cd docs/
vim standards/coding/python.md    # Update Python coding standard
vim architecture/decisions/ADR-XXXX.md  # Create ecosystem ADR
```

### Syncing Changes

```bash
# Propagate changes to language wrappers
make sync

# Or run the sync script directly
bun run scripts/sync-to-lang.ts
```

### Before Committing

```bash
# Format and validate
make fmt
make precommit

# Stage and commit (including synced wrappers)
git add docs/ lang/*/docs/
git commit -m "docs: update Python coding standard"
```

### Common Workflow Patterns

✅ **Pattern**: Update standard → `make sync` → commit all changes (root + `lang/*/`)

✅ **Pattern**: Create ecosystem ADR → sync to wrappers → verify in all three languages

✅ **Pattern**: Update guide → test clarity → sync to all wrappers → commit

## ⚠️ For Downstream Library Maintainers

If you're working in **published** `gofulmen`, `pyfulmen`, or `tsfulmen` repositories and see this README:

**DO NOT edit files in the synced `docs/` directory**. Those files are read-only copies from Crucible. Instead:

1. **Submit changes upstream**: https://github.com/fulmenhq/crucible
2. **Create library-specific docs**: Use `docs/development/` in your library repo (not synced from Crucible)
3. **Configure formatters**: Exclude synced directories to avoid conflicts

## 📚 Related Documentation

- [Fulmen Ecosystem Guide](architecture/fulmen-ecosystem-guide.md) - Overview of the ecosystem and layer cake
- [Sync Model](architecture/sync-model.md) - How SSOT syncing works in detail
- [Sync Consumers Guide](guides/sync-consumers-guide.md) - Consuming synced assets in downstream libraries
- [Sync Producers Guide](guides/sync-producers-guide.md) - Maintaining SSOT and syncing to wrappers
- [ADR-0001: Two-Tier ADR System](architecture/decisions/ADR-0001-two-tier-adr-system.md) - ADR structure and governance

## 🔗 Quick Links

- **Crucible Repository**: https://github.com/fulmenhq/crucible
- **Report Issues**: https://github.com/fulmenhq/crucible/issues
- **Standards**: [docs/standards/](standards/)
- **Architecture**: [docs/architecture/](architecture/)
- **Guides**: [docs/guides/](guides/)

## ℹ️ Questions?

Contact Crucible maintainers:

- **GitHub Issues**: https://github.com/fulmenhq/crucible/issues
- **GitHub Discussions**: https://github.com/fulmenhq/crucible/discussions
- **Maintainers**: See `MAINTAINERS.md` in repository root

---

**Remember**: This is the **SSOT source documentation**. Edit freely, sync to wrappers, commit all changes together.
