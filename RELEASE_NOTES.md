# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.16 - Host Binary Identity Standard & Dependency Hygiene

**Adds the cross-language host binary identity standard, hardens the dependency surface with a goneat v0.5.16 pin and minor/patch bumps, and aligns markdown formatting under the lifted toolchain.**

### Why This Matters

**For CLI and forge operators (support & incident triage):** one shared `version --extended` contract means a support dump or incident paste uses the same field names whether the binary is Go, Rust, TypeScript, or Python. You can tell a clean CI artifact from a dirty local dogfood binary, and you can tell **which build is on disk** apart from **which SDK/SSOT pins it was built against** — pins stay labeled and never overwrite the host `Commit:`. Dirty is honest (`true`/`false` when known, `unknown` when not — never a misleading clean). Host identity is **informational for ops**, not attestation: use it for triage, not auth or integrity decisions.

**For implementers:** Phase A build-time recipes (Go ldflags, Rust `build.rs` + `env!`, TypeScript/Python build-time stamp with documented env fallback) require **no helper library**, so forge CLIs can adopt immediately. CI injects via `FULMEN_HOST_*`; released binaries are not forced to run `git` at runtime. Future `gofulmen`/`rsfulmen` resolvers remain a documented **Phase B** gate and are **not** shipped in this cut.

**For SSOT and toolchain consumers:** the dependency surface is refreshed — goneat pinned to v0.5.16 and in-scope minor/patch bumps on the root and TypeScript wrapper manifests — and markdown is aligned to the goneat v0.5.16 formatter so synced docs stay deterministic.

### Highlights

- **Host Binary Identity Standard** (`host-identity`): shared `version --extended` field contract for support dumps and dirty-binary triage; host-vs-pins separation (pins extended-only, never host `Commit:`); explicit dirty semantics; `FULMEN_HOST_*` injection (CI may inject; no runtime git required in released binaries); trust boundary (informational, not attestation); Phase A recipes (Go ldflags, Rust `build.rs`, TS/Py build-time-stamp primary with env fallback); Phase B gate (resolvers not shipped)
- **Deps** (`deps-refresh`): goneat pin `v0.5.13 → v0.5.16`; root + `lang/typescript` minor/patch pins (`js-yaml`, `@biomejs/biome`, `@types/node`); both Bun locks refreshed
- **Tooling** (formatter): markdown aligned to goneat v0.5.16 (whitespace-only)

### Changes

| Area      | Change                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Standards | Host Binary Identity Standard + Phase A `version --extended` recipes (Go/Rust/TS/Py); CLI + app-identity links |
| Deps      | goneat pin `v0.5.13 → v0.5.16`; root + `lang/typescript` minor/patch pins; locks refreshed                     |
| Tooling   | Markdown aligned to goneat v0.5.16 (whitespace-only)                                                           |

**No breaking changes** to public API or schema versions — patch release; all schemas remain at their current versions. Pre-existing `bun audit` findings (via deferred major-track toolchains such as `glob`/`ejs`/`vitest`) are unchanged by this release and are deferred to those major bumps.

**Full release notes**: [release-notes/v0.4.16.md](release-notes/v0.4.16.md)

---

## v0.4.15 - ADR-0012 Cross-Ref Completion & Upstream v0.1.14

**Completes the ADR-0012 absolute-`$id` cross-reference rollout for the logging and module-manifest schemas, migrates the logging `$id`s to canonical version-in-path, and refreshes the vendored 3leaps/crucible pin to v0.1.14.**

### Why This Matters

**For library consumers (tsfulmen, gofulmen, etc.)**: cross-schema `$ref`s in `observability/logging` and `library/module-manifest` now resolve in memory-based validators. Previously, relative cross-file refs left over from a partial ADR-0012 rollout failed to resolve without filesystem context — the exact breakage tsfulmen and gofulmen reported.

**For schema identity**: the logging `$id`s move to the canonical version-in-path form so on-disk layout matches the canonical URI. This is an identity change within the existing `v1.0.0` files; external consumers resolving by the old version-in-filename URIs should switch to version-in-path (no in-repo consumers used the old URIs).

### Highlights

- **ADR-0012 completed**: 16 relative cross-file `$ref`s across 4 schemas converted to absolute canonical `$id` URLs, plus `logger-config`'s absolute ref repointed (finishing the rollout that had only covered `logger-config`)
- **module-manifest off-by-one fixed**: `../../taxonomy/...` → absolute `taxonomy/language` `$id`
- **logging `$id`s → version-in-path** within `v1.0.0` (matches corpus convention)
- **Upstream v0.1.14**: vendored 3leaps/crucible pin bumped from v0.1.12 (schemas byte-identical; docs/provenance only)
- **Tooling**: upstream-pull provenance "Synced By" made model-agnostic

### Changes

| Area     | Change                                                                                        |
| -------- | --------------------------------------------------------------------------------------------- |
| Schema   | Complete ADR-0012: 16 relative cross-file `$ref`s → absolute `$id` (logging, module-manifest) |
| Schema   | `observability/logging` `$id`s → canonical version-in-path (within `v1.0.0`)                  |
| Upstream | Bump vendored 3leaps/crucible `v0.1.12 → v0.1.14` (commit `18018788`)                         |
| Tooling  | upstream-pull provenance "Synced By" made model-agnostic                                      |
| Docs     | ADR-0012 status → phased-complete; lint-check action item recommended                         |

**No breaking changes** to public API or schema versions (all touched schemas stay `v1.0.0`). See the logging `$id` compatibility note in the full notes.

**Full release notes**: [release-notes/v0.4.15.md](release-notes/v0.4.15.md)

---

## v0.4.14 - app-identity `metadata.typescript` & Codegen StrEnum

**Adds a `metadata.typescript` packaging section to app-identity, finishes the Python enum `StrEnum` modernization at the generator, and moves CI off the Node 20 runtime.** **(Condensed — see [release-notes/v0.4.14.md](release-notes/v0.4.14.md) for full details)**

### Highlights

- New optional `metadata.typescript` object on the app-identity `v1.0.0` schema (`package_name` + `console_scripts` → package.json `bin`), mirroring `metadata.python`; additive, schema stays `v1.0.0`
- Codegen fix: fulpack/fulencode Python enum templates now emit `StrEnum` (ruff `UP042`), making regeneration idempotent
- CI off Node 20: checkout v5, setup-go v6, setup-bun v2, setup-uv v7; rust-toolchain `@v1`; goneat pin `v0.5.13`

---

[View complete changelog →](CHANGELOG.md)
