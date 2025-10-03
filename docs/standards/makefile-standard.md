---
title: "FulmenHQ Makefile Standard"
description: "Baseline make targets every Fulmen repository must implement"
author: "Codex Assistant"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "draft"
tags: ["standards", "build", "cicd", "make"]
---

# Makefile Standard

## Why a Makefile Everywhere?

A shared `Makefile` gives Fulmen automation a consistent entry point across languages. Regardless of whether a project is Go, TypeScript, Python, or multi-language, the same targets exist so CI/CD pipelines, local scripts, and agent tooling can rely on them.

## Required Targets

Every repository **MUST** implement the following make targets:

| Target                                  | Purpose                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `make help`                             | List available targets with short descriptions.                                                                    |
| `make bootstrap`                        | Install external prerequisites listed in `.crucible/tools.yaml` (installers must use the tooling manifest schema). |
| `make tools`                            | Verify external tools are present; may be a no-op if none are required.                                            |
| `make lint`                             | Run lint/format/style checks.                                                                                      |
| `make test`                             | Execute the full test suite.                                                                                       |
| `make build`                            | Produce distributable artifacts/binaries.                                                                          |
| `make clean`                            | Remove build artifacts, caches, temp files.                                                                        |
| `make fmt`                              | Apply formatting (language-specific).                                                                              |
| `make version`                          | Print current repository version from `VERSION`.                                                                   |
| `make version:set VERSION=x`            | Update `VERSION` and any derived metadata. Must call repo-appropriate scripts (e.g., `bun run version:update`).    |
| `make version:bump-{major,minor,patch}` | Bump version according to strategy (SemVer or CalVer) and regenerate derived files.                                |
| `make release:check`                    | Run the release checklist validation (tests, lint, sync scripts).                                                  |
| `make release:prepare`                  | Sequence of commands to ready a release (sync, tests, version bump).                                               |

Repositories may add additional targets (e.g., `make docs`, `make package`). Required targets must NOT be renamed.

## Implementation Guidance

- Use phony targets (`.PHONY`) for commands that do not produce physical files.
- Keep commands quiet when appropriate (prefix with `@`) but print meaningful status lines.
- `make version:set` should delegate to the language-appropriate script (e.g., `bun run version:update` in Crucible) so wrappers stay synced.
- `make bootstrap`/`make tools` should call a script that reads `.crucible/tools.yaml` (validated against `schemas/tooling/external-tools/v1.0.0/external-tools-manifest.schema.yaml`).
- Include a `help` target that parses comments, for example:
  ```makefile
  .PHONY: help
  help:
  	@grep -E '^\.PHONY: [a-zA-Z_-]+ ##' Makefile | sed -e 's/\.PHONY: //' -e 's/ ##/\t/'
  ```
- Document deviations or extensions in `CONTRIBUTING.md`.

## Verification

- CI pipelines should call `make lint`, `make test`, and `make release:check`.
- `make release:check` must cover all items in `RELEASE_CHECKLIST.md` (or invoke a script that does).

## Relationship to Other Standards

- [Release Checklist Standard](release-checklist-standard.md) – Make targets drive release validation.
- [Repository Structure SOP](../sop/repository-structure.md) – References the requirement for a Makefile and tooling manifest.
- [CI/CD Operations SOP](../sop/cicd-operations.md) – Pipelines must invoke `make bootstrap` before validation steps.
- Language-specific coding standards can recommend additional targets (e.g., `make docs`, `make fmt-go`).

## Future Enhancements

- Provide a template `Makefile` generator in Crucible.
- Add CI linters to ensure required targets exist.
- Extend to support remote execution wrappers (e.g., `make plan` for infrastructure).
