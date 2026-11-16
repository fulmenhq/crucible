# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.5.0 - Schema Contract Enforcement & Verified Release Provenance

**Schema contracts are enforced offline against an exact inventory of every published schema and wrapper copy, the ADR lifecycle schema moves its metadata under `x-adr-metadata`, several published configuration shapes gain schemas or optional fields, and tag signing and release publication run against committed public pins.**

### Why This Matters

**For raw-schema readers:** `adr-lifecycle-status.json` metadata moved from `/definitions/statusDescriptions` and `/definitions/sortOrder` to `/x-adr-metadata/statusDescriptions` and `/x-adr-metadata/sortOrder`. Instance validation is unchanged; the `$id`, dialect and the seven status values are unchanged.

**For fixture and configuration consumers:** `taxonomy/fixture` v2.0.0 (scenario arrays) and `branding/v1.0.0/ecosystem` are new schemas; `similarity` v1.0.0 returns to the distance, normalization and suggestions categories (split metrics stay in v2.0.0); exit-codes, server-management, site-branding and site-styling gain optional fields.

**For release operators:** signing, verification and publication read committed key pins, anchors and tagger identity, and require an independently supplied approved OpenPGP primary fingerprint.

### Highlights

- **Offline schema contracts**: every published schema compiles offline under its declared dialect; an exact inventory covers schemas, data files and byte-identical wrapper copies; `Schema Contracts` workflow
- **Configuration contracts**: new ecosystem branding and fixture-catalog v2.0.0 schemas; optional fields on four existing schemas; signals fixture field names aligned
- **Signed tags and publication**: committed pins and anchors, `make release-tag` / `release-push-tag`, required minisign attestation pair, staged release publication, `Release trust verification` workflow; retired OpenPGP identity recorded
- **Toolchain**: goneat v0.6.8 via verified sfetch v0.4.12 bootstrap, Go 1.26.11, Bun 1.4.3, refreshed JavaScript and Python tooling, actions pinned by commit SHA
- **Docs**: trademark notice states North Carolina LLC; `LICENSE` is plain MIT with `LICENSE-CC0` and `NOTICE` carrying the dual-license scope
- **Consumer guidance**: bootstrap guide and operations SOP describe the check-only `precommit`/`prepush` profile and the consumer's declared reference toolchain

### Changes

| Area      | Change                                                                                    |
| --------- | ----------------------------------------------------------------------------------------- |
| Schemas   | ADR lifecycle metadata to `x-adr-metadata`; new ecosystem and fixture-catalog v2.0.0      |
| Schemas   | Optional fields on exit-codes, server-management, site-branding, site-styling             |
| Schemas   | `similarity` v1.0.0 distance, normalization and suggestions categories                    |
| Tooling   | Offline schema contract validator; signed-tag, attestation and staged publication tooling |
| Toolchain | goneat v0.6.8, Go 1.26.11, Bun 1.4.3, refreshed JS/Python tooling                         |
| Docs      | Release security and publication documents; license layout; North Carolina LLC            |

**No change** to schema ids or version paths. Raw-schema readers of `adr-lifecycle-status.json` use the new JSON pointers above.

**Full release notes**: [release-notes/v0.5.0.md](release-notes/v0.5.0.md)

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

[View complete changelog →](CHANGELOG.md)
