# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.18 - Manifesto Retirement & Workhorse Standard Alignment

**A documentation patch: the draft technical manifesto is removed (inbound links retargeted to live architecture docs; no replacement manifesto), and the forge workhorse standard is aligned with Roan, loopback-by-default, and required request-id middleware.**

### Why This Matters

**For readers and onboarding:** the aging draft manifesto is no longer a destination. Inbound links now point at the live architecture documents that already describe the ecosystem. Historical release notes that mention the manifesto are left as-is.

**For forge implementers:** the workhorse standard now lists Roan (Rust / rsfulmen) as a canonical language variant and Tuvan (TypeScript / tsfulmen) alongside Groningen and Percheron. The unused Clydesdale example is gone. New HTTP workhorses default `{PREFIX}HOST` to `127.0.0.1` (`0.0.0.0` remains an explicit opt-in) and MUST honor, generate, and echo `X-Request-ID` using the existing logging and HTTP REST specs. The standard remains draft.

### Highlights

- **Manifesto retired**: draft technical manifesto deleted; inbound links retargeted to live architecture docs; no replacement manifesto
- **Workhorse variants**: Roan (Rust / rsfulmen) canonical; Tuvan (TypeScript / tsfulmen) listed; unused Clydesdale example removed
- **Loopback default**: `{PREFIX}HOST` defaults to `127.0.0.1`; bind `0.0.0.0` only as an explicit opt-in
- **Request ID required**: HTTP workhorses MUST honor inbound `X-Request-ID`, generate a UUID when absent, and echo it on every response

### Changes

| Area | Change                                                                                     |
| ---- | ------------------------------------------------------------------------------------------ |
| Docs | Draft technical manifesto removed; inbound links retargeted to live architecture docs      |
| Docs | Workhorse standard: Roan canonical, Tuvan listed, Clydesdale example removed               |
| Docs | Workhorse `{PREFIX}HOST` default `127.0.0.1`; `0.0.0.0` explicit opt-in                    |
| Docs | Workhorse HTTP surface requires request-id / `X-Request-ID` honor/generate/echo middleware |

**No breaking changes** to public API or schema versions — patch release; all schemas remain at their current versions. Documentation-only.

**Full release notes**: [release-notes/v0.4.18.md](release-notes/v0.4.18.md)

---

## v0.4.17 - Deferred Major Upgrades & Clean bun audit

**Delivers a clean root and wrapper `bun audit` (no vulnerabilities found) by landing the three majors v0.4.16 deferred — wrapper vitest 4, root glob 13, root ejs 6 — by upgrade, not by pin. Also carries the post-release checklist path fix.**

### Why This Matters

**For maintainers and supply-chain consumers:** the deferred major-track dependency chains are now upgraded and their audit findings cleared. The root dependency graph reports **no vulnerabilities found** (root went 11 → 7 after glob 13, then 7 → 0 after ejs 6), and the TypeScript wrapper reports **no vulnerabilities found** (including the Vitest UI advisory) after the vitest 4 upgrade. This closes the deferral v0.4.16 disclosed: the majors are landed, not just logged.

**For TypeScript wrapper implementers:** vitest 4 requires an explicit `@types/node` entry in the tsconfig `types` allowlist (it no longer pulls Node typings in transitively); the wrapper suite stays green (44 tests / 7 files) with obsolete exit-code snapshots cleaned up.

**For toolchain and codegen consumers:** the glob and ejs upgrades are contained to build/test tooling — no API or schema changes. ejs 6 exposes its render API on the module default export; the five codegen scripts were migrated accordingly and regenerate byte-identical artifacts.

### Highlights

- **Audit clear**: root and wrapper `bun audit` report **no vulnerabilities found** — root finding counts 11 → 7 → **0**; wrapper cleared to **0** (incl. Vitest UI advisory); nothing pinned or overridden to force the result
- **Wrapper vitest 1 → 4**: `vitest` + `@vitest/coverage-v8` to 4.1.10; tsconfig `@types/node`; obsolete exit-code snapshot cleanup
- **Root glob 11 → 13**: `glob` to 13.0.6; `glob.sync` → canonical `globSync` at the module-registry validation call site; glob audit chain cleared
- **Root ejs 3 → 6**: `ejs` to 6.0.1; five codegen scripts use the ejs 6 default-export API; byte-identical generated artifacts; ejs › jake › filelist › minimatch/brace-expansion chain pruned from the lockfile
- **Docs fix**: release-checklist pull-script smoke-test path / `--dry-run` correction (post-v0.4.16, carried in)

### Changes

| Area | Change                                                                           |
| ---- | -------------------------------------------------------------------------------- |
| Deps | Wrapper `vitest`/coverage 1.x → 4.1.10; tsconfig `@types/node`; snapshot cleanup |
| Deps | Root `glob` 11.x → 13.0.6; `glob.sync` → `globSync` at validation call site      |
| Deps | Root `ejs` 3.x → 6.0.1; codegen scripts use the ejs 6 default-export API         |
| Deps | Root `bun audit` 11 → 7 → **0**; wrapper cleared to **0**                        |
| Docs | Release-checklist pull-script smoke-test path / `--dry-run` correction           |

**No breaking changes** to public API or schema versions — patch release; all schemas remain at their current versions. Root and wrapper dependency graphs now report **no vulnerabilities found**.

**Full release notes**: [release-notes/v0.4.17.md](release-notes/v0.4.17.md)

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

[View complete changelog →](CHANGELOG.md)
