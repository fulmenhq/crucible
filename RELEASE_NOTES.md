# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.19 - File-Backed Schema Catalogs & rsfulmen Active

**A documentation patch: helper libraries gain a file-backed JSON Schema instance-validation contract (on-disk catalogs, offline `$ref`, path containment), forge module tables point at that contract, and overview docs mark rsfulmen as an active language foundation at Rust 1.88.**

### Why This Matters

**For helper-library implementers (Go, TypeScript, Python, Rust):** there is one contract for instance checks against schemas that live beside the binary. Do not wrap jsonschema/AJV in each application, and do not subprocess goneat at runtime for those checks. `http(s)` `$id` values are catalog keys, not network fetches.

**For forge and application authors:** Workhorse and Codex must use the helper for both Fulmen embeds and application schema trees. Microtools that validate structured JSON/YAML use the same APIs. Do not supply an open-filesystem resolver that bypasses catalog-root containment.

**For readers of the ecosystem map:** rsfulmen is a current language foundation (Roan is the Rust workhorse breed), not a planned item. The published Rust minimum is 1.88, matching the rsfulmen crate.

### Highlights

- **File-backed catalogs**: instance validation against on-disk schema trees the helper does not embed; offline `$ref`; same diagnostics as embed-id APIs
- **Containment**: `file://` and relative refs stay inside the canonical schema directory and `RefDirs`; traversal, symlink escape, and unsupported schemes fail at compile time
- **Forge tables**: Workhorse/Codex REQUIRED via the helper; Microtool OPTIONAL (helper when used)
- **rsfulmen Active**: overview docs match `languages.yaml`; published Rust minimum 1.88

### Changes

| Area     | Change                                                                                        |
| -------- | --------------------------------------------------------------------------------------------- |
| Standard | File-backed instance validation + `$ref` containment in the schema validation helper contract |
| Docs     | Workhorse, Codex, Microtool, and the module matrix point at embed + on-disk helper APIs       |
| Docs     | rsfulmen listed as an active language foundation; published Rust minimum 1.88                 |

**None** to public API or schema versions — patch release; all schemas remain at their current versions. Documentation-only. Language-library implementations follow this tag.

**Full release notes**: [release-notes/v0.4.19.md](release-notes/v0.4.19.md)

---

## v0.4.18 - Manifesto Retirement & Workhorse Standard Alignment

**A documentation patch: the draft technical manifesto is removed (inbound links retargeted to live architecture docs; no replacement manifesto), and the forge workhorse standard is aligned with Roan, loopback-by-default, and required request-id middleware.**

### Why This Matters

**For readers and anyone landing from an old link:** the 2025-10 draft technical manifesto is no longer a front door. A bookmark or inbound link that used to open that draft should start at the [Fulmen Ecosystem Guide](docs/architecture/fulmen-ecosystem-guide.md). The layer cake, CRDL, helper/forge contracts, and coding/safety standards already live there (and in the documents it points to). There is no replacement manifesto. Historical release notes that mention the old file stay historical.

**For forge implementers and operators:** the workhorse standard now names **Roan** (Rust / rsfulmen) and **Tuvan** (TypeScript / tsfulmen) in the same canonical breed set as Groningen and Percheron — a Rust or TypeScript workhorse is a first-class variant, not an unnamed cousin. New HTTP workhorses default `{PREFIX}HOST` to `127.0.0.1` (binding `0.0.0.0` is an explicit opt-in) and MUST honor, generate, and echo `X-Request-ID` so a support dump can correlate one request across logs and responses. This restates the existing logging and HTTP REST specs. The workhorse standard remains draft.

### Highlights

- **Manifesto retired**: draft technical manifesto deleted; inbound links retargeted to live architecture docs; no replacement manifesto
- **Workhorse variants**: Roan (Rust / rsfulmen) and Tuvan (TypeScript / tsfulmen) in the same canonical breed set as Groningen and Percheron
- **Loopback default**: `{PREFIX}HOST` defaults to `127.0.0.1`; bind `0.0.0.0` only as an explicit opt-in
- **Request ID required**: HTTP workhorses MUST honor inbound `X-Request-ID`, generate a UUID when absent, and echo it on every response

### Changes

| Area | Change                                                                                     |
| ---- | ------------------------------------------------------------------------------------------ |
| Docs | Draft technical manifesto removed; inbound links retargeted to live architecture docs      |
| Docs | Workhorse standard: Roan and Tuvan in the canonical breed set; Clydesdale example removed  |
| Docs | Workhorse `{PREFIX}HOST` default `127.0.0.1`; `0.0.0.0` explicit opt-in                    |
| Docs | Workhorse HTTP surface requires request-id / `X-Request-ID` honor/generate/echo middleware |

**None** to public API or schema versions — patch release; all schemas remain at their current versions. Documentation-only.

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

[View complete changelog →](CHANGELOG.md)
