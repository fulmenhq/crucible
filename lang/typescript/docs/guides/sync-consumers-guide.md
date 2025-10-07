---
title: "Sync Consumers Guide"
description: "How downstream repositories pull assets from SSOT sources"
author: "Schema Cartographer"
date: "2025-10-03"
last_updated: "2025-10-03"
status: "draft"
tags: ["sync", "consumer", "guide"]
---

# Sync Consumers Guide

This guide explains how downstream repositories pull assets from SSOT sources such as Crucible (and future Cosmography). It replaces the older "Sync Strategy" document.

## Options Summary

1. **Published Packages** – Import `@fulmenhq/crucible`, `github.com/fulmenhq/crucible`, etc. (recommended for runtime use).
2. **FulDX Sync** – Use the FulDX CLI with a manifest (`sync-consumer-config.yaml`) to fetch schemas/docs/config defaults into your repo.
3. **Custom Scripts (Legacy)** – Direct scripts or manual copies (not recommended; only for migration purposes).

## FulDX Workflow (Recommended)

1. Ensure FulDX is listed in `.crucible/tools.yaml` (recommended) so `make bootstrap` installs `./bin/fuldx`.
2. Run `make bootstrap` to install FulDX into `./bin/`.
3. Create `.fuldx/sync-consumer.yaml` describing the assets you need (keep SSOT content under `.crucible/`).
4. Validate & pull: `./bin/fuldx sync pull --manifest .fuldx/sync-consumer.yaml`.

### Manifest Schema Reference

The manifest must conform to `schemas/config/sync-consumer-config.yaml`. Key fields:

- `version`: optional manifest version for your repo.
- `sources[]`: each source entry describes a sync key or set of globs.
  - `id`: recommended key from `config/sync/sync-keys.yaml` (e.g., `crucible.schemas.terminal`).
  - `include` / `exclude`: glob patterns relative to the key's base path.
  - `output`: relative destination directory inside your repo.
  - `version`: optional override of the SSOT version (defaults to manifest `version` or `latest`).

Once FulDX ships `schema validate`, run `fuldx schema validate --schema sync-consumer --manifest .fuldx/sync-consumer.yaml` prior to pulling.

**Suggested order of operations:**

1. Pull the latest metadata (`config/sync/sync-keys.yaml` and the manifest schema) from Crucible or via FulDX helper commands (this also surfaces language-specific tags).
2. Inspect available keys (`./bin/fuldx ssot keys --source crucible`) before authoring your manifest.
3. Edit `.fuldx/sync-consumer.yaml` with desired keys/globs and outputs.
4. Validate (`fuldx schema validate ...`) and then run `./bin/fuldx sync pull` to fetch content.

### Recommended Keys (Crucible)

> **Tip:** Run `./bin/fuldx ssot keys --source crucible` (once implemented) to list available keys before authoring your manifest.

> **Keys vs. Direct Paths**
> Using a recommended key (e.g., `crucible.schemas.terminal`) is encouraged for discoverability, but manifests may also specify globs directly under a source. FulDX will warn when you omit known keys so you can adopt shared conventions.

| Key                  | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `crucible.docs`      | General documentation under `docs/`                                       |
| `crucible.schemas.*` | Schema families (`terminal`, `pathfinder`, `observability/logging`, etc.) |
| `crucible.config.*`  | Default configs under `config/` (e.g., `config/terminal/...`)             |
| `crucible.lang.go`   | Language wrapper assets for Go (`lang/go/..`)                             |
| `crucible.lang.ts`   | Language wrapper assets for TypeScript (`lang/typescript/..`)             |

Each key resolves to a base path within the SSOT (see `basePath` in `sync-keys.yaml`). FulDX preserves that subdirectory layout under your chosen `output`.

> **Development vs Production**
> For development workflows you can create a second entry with `tags: [dev]` (see `crucible.lang.ts.dev`) and point to local paths. Make sure CI/unit tests fail if a manifest referencing dev-only keys is committed (e.g., via a lint step).

See `config/sync/sync-keys.yaml` for the full list and metadata.

## Manifest Example

```yaml
version: "2025.10.0"
sources:
  - id: crucible.schemas.pathfinder
    version: "2025.10.0"
    include:
      - v1.0.0/*.schema.json
    output: .crucible/schemas/pathfinder
  - id: crucible.docs
    include:
      - guides/**/*.md
      - standards/**/README.md
    exclude:
      - guides/archive/**
    output: docs/crucible
  - id: crucible.config.terminal
    include:
      - v1.0.0/terminal-overrides-defaults.yaml
    output: config/crucible
```

## Tips & Best Practices

- Pin Crucible versions to avoid unexpected changes. Use `latest` only for exploratory work.
- Store manifests alongside other FulDX tooling configs (`.fuldx/` is recommended; keep SSOT content under `.crucible/`).
- Add `make sync` target that depends on `fuldx` and this manifest.
- Validate manifests in CI using `fuldx schema validate` once available.

## Migration Notes

- Existing scripts (e.g., `scripts/pull/crucible-pull.ts`) should be replaced with FulDX commands once the CLI is available.
- Ensure `.crucible/tools.yaml` includes the required external binaries (goneat, fuldx itself, etc.).

## See Also

- [Sync Producers Guide](sync-producers-guide.md)
- [Fulmen Config Path Standard](../standards/config/fulmen-config-paths.md)
- [Fulmen Helper Library Standard](../architecture/fulmen-helper-library-standard.md)
