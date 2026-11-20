# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.5.1 - Tabular Exchange Contract

**A new `data` domain publishes the Tabular Exchange Standard, contract revision `tabular-exchange/0.1.0` (experimental, ADR-0015): schemas for typed tables, rows, conversion policies and conversion results, with vectors and a fixture corpus that a reference checker validates in CI.**

### Why This Matters

**For converter authors and consumers:** one published description of a typed table, its values, a conversion request and a conversion result. A caller matches a result to the output and to the request, with separate verdicts for output agreement and run completion. Pin the exact contract revision `tabular-exchange/0.1.0` from a Crucible release that contains it; no implementation is qualified against it yet.

### Highlights

- **Tabular Exchange Standard**: `docs/standards/data/tabular-exchange.md`; wire formats `tabular-exchange.schema/0`, `.policy/0`, `.result/0`
- **Schemas**: `schemas/data/tabular-exchange/v0.1.0/` (draft 2020-12): table schema, row, conversion policy, conversion result, plus semantic rules
- **Vectors and fixtures**: `config/data/tabular-exchange/v0.1.0/`: contract manifest, value, row, document and matching vectors, `valid/`, `invalid/`, `semantic-invalid/` fixtures
- **Validation**: `make validate-tabular-exchange` reference checker with regression controls, in `validate-schemas` and the `Schema Contracts` workflow
- **Release tooling**: publication commands name each unset per-release variable

### Changes

| Area    | Change                                                                                  |
| ------- | --------------------------------------------------------------------------------------- |
| Docs    | New `data` domain; Tabular Exchange Standard; ADR-0015 (experimental)                   |
| Schemas | `data/tabular-exchange/v0.1.0`: table schema, row, conversion policy, conversion result |
| Config  | `data/tabular-exchange/v0.1.0`: contract manifest, vectors and fixture corpus           |
| Tooling | Reference checker with regression controls; `make validate-tabular-exchange`            |
| Release | Publication commands name each unset per-release variable; checklist documents them     |

**None** breaking — the release adds a new schema family; existing schemas, ids and version paths are unchanged.

**Full release notes**: [release-notes/v0.5.1.md](release-notes/v0.5.1.md)

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

[View complete changelog →](CHANGELOG.md)
