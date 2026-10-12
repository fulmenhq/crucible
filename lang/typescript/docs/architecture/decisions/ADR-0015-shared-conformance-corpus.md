---
id: "ADR-0015"
title: "Shared Language-Neutral Conformance Corpus for Helper Libraries"
status: "proposal"
date: "2026-10-12"
last_updated: "2026-10-12"
deciders:
  - "@fulmenhq"
scope: "Ecosystem"
tags:
  - "testing"
  - "conformance"
  - "parity"
  - "sync"
  - "fulhash"
  - "config"
related_adrs:
  - "ADR-0001"
  - "ADR-0004"
  - "ADR-0013"
adoption:
  gofulmen: "planned"
  pyfulmen: "planned"
  tsfulmen: "planned"
  rsfulmen: "planned"
  csfulmen: "not-applicable"
---

# ADR-0015: Shared Language-Neutral Conformance Corpus for Helper Libraries

## Status

**Current Status**: Proposal. No code changes accompany this record. Implementation starts only after the
open questions below are resolved and the record moves to `accepted`.

## Context

Crucible is the SSOT for module semantics, but the evidence that each helper library honors those semantics is
written four times, by hand, in four repositories. When a library wants parity with another, it ports test cases
manually. The most recent example is rsfulmen porting gofulmen `MergeMaps` cases into
`src/config/testdata/gofulmen-merge-parity.yaml`: five YAML cases with base/overlay/expected, plus a header that
lists Go-only cases that could not be ported. That file is useful, but it is a copy of another library's tests,
it lives in one consumer, and the other two libraries cannot see it.

### What exists today

**Crucible fixture files** (all under `config/library/<module>/`):

| File                                                                            | Schema                                                                    | Validated in Crucible CI            | Consumed by                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `fulhash/fixtures.yaml`                                                         | `library/fulhash/v1.0.0/fixtures` (closed, `additionalProperties: false`) | No                                  | gofulmen (schema-validated), tsfulmen, pyfulmen. Not rsfulmen |
| `foundry/signal-resolution-fixtures.yaml`                                       | `library/foundry/v1.0.0/signal-resolution-fixtures`                       | No                                  | gofulmen                                                      |
| `similarity/fixtures.yaml`                                                      | `library/similarity/v2.0.0/similarity`                                    | Yes (`scripts/validate-schemas.ts`) | All four                                                      |
| `fulencode/fixtures/`, `fulpack/fixtures/`, `repository/app-identity/fixtures/` | Mixed / binary                                                            | Partially                           | Uneven                                                        |

`fulhash/fixtures.yaml` carries `xxh3_128` and `sha256` only. **No library loads CRC32 or CRC32C vectors from
Crucible**, although the [FulHash standard](../../standards/library/modules/fulhash.md) lists both algorithms.
CRC coverage today is uneven:

- tsfulmen and pyfulmen assert the CRC32 check value with local, hand-written cases.
- gofulmen's CRC tests check only digest length and self-consistency, not known values.
- rsfulmen implements neither CRC32 nor CRC32C; its fulhash supports `xxh3-128` and `sha256` only.

**How libraries consume Crucible.** All four libraries use `goneat ssot sync` driven by
`.goneat/ssot-consumer.yaml`, recording provenance in `.goneat/ssot/provenance.json`. gofulmen also depends on
the Crucible Go module. Pins currently differ (gofulmen and rsfulmen at v0.4.19, tsfulmen and pyfulmen at
v0.4.15). Each library resolves fixture paths its own way (relative paths, `include_str!`, `process.cwd()`,
`Path(...)`), and each skips unsupported cases its own way (`t.Skip`, `it.skip`, `pytest.skip`, comments).
No library has a mechanism that fails when a Crucible fixture case is silently not executed.

**Everything under Crucible `config/` ships in production artifacts.** The Crucible Go module embeds `config`
(`//go:embed config`), rsfulmen's `build.rs` embeds `config/crucible-rs` via `include_bytes!`, the pyfulmen
wheel force-includes `config`, and the tsfulmen npm package lists `config/crucible-ts` in `files`. Today's
fixture files therefore already ship to end users. A growing test corpus must not follow that path.

### Semantic drift the corpus would expose immediately

The [Three-Layer Config standard](../../standards/library/modules/enterprise-three-layer-config.md#merge-semantics)
says arrays replace, and an explicit `null` in a higher layer deletes the key. Implementations today:

| Library  | Merge function                                | Maps      | Sequences | Overlay `null`         |
| -------- | --------------------------------------------- | --------- | --------- | ---------------------- |
| gofulmen | `config.MergeMaps`                            | recursive | replace   | deletes key            |
| rsfulmen | `config::merge`                               | recursive | replace   | deletes key            |
| tsfulmen | `deepMerge` (private, `src/config/loader.ts`) | recursive | replace   | **sets key to `null`** |
| pyfulmen | `deep_merge` (`config/merger.py`)             | recursive | replace   | **sets key to `None`** |

Two of four libraries contradict the standard, and no shared test catches it. That is the clearest argument for
a shared corpus: parity claims are currently unbacked by shared evidence.

### Forces

- **Independence of evidence.** Expected results must come from the standard or an external authority, never
  from one library's output (3leaps EPR-0005, test evidence independence). A port of gofulmen tests makes
  gofulmen the oracle.
- **Gates must be able to fail.** Absent evidence must fail, skips must be declared, and a gate must be shown
  capable of failing (3leaps EPR-0002, verification gate integrity).
- **Language-specific semantics are real.** Go distinguishes typed-nil maps and slices from untyped `nil`; YAML,
  JSON, Rust `serde_yaml::Value`, TypeScript, and Python have no equivalent. These cases must stay out of the
  shared corpus without being lost.
- **Production artifacts must stay lean.** Test vectors must not be embedded into shipped binaries, wheels, or
  npm packages.
- **Small, reversible adoption.** Each library must be able to adopt the corpus in a few small PRs without a
  coordinated release.

### Terminology

This record says **conformance vectors** (individual cases) and **conformance corpus** (the collection).
It avoids the word "fixture" for the new structure, because the
[Fixture Standard](../fulmen-fixture-standard.md) already uses "fixture" for a repository category
(`fixture-<mode>-<category>-<name>` test servers).

## Decision

Establish a single, language-neutral **conformance corpus** in Crucible. Every helper library consumes it at
its pinned Crucible version, runs it through a thin per-library harness, and declares its coverage and skips in
a machine-checked manifest.

### 1. Location

A new **top-level `conformance/` directory** in Crucible, outside `config/`, so it is never embedded by the
Crucible Go module or by any library's runtime asset embedding.

```
conformance/
├── README.md                              # authoring rules, links to this ADR
├── index.yaml                             # suite registry (discovery entry point for harnesses)
├── three-layer-config/
│   └── merge-maps.vectors.yaml            # suite: three-layer-config.merge-maps
├── fulhash/
│   └── crc32.vectors.yaml                 # suite: fulhash.crc32 (CRC32 + CRC32C)
└── _controls/
    └── rejects/                           # suite files that MUST fail validation (negative controls)

schemas/conformance/v1.0.0/
├── index.schema.json                      # index.yaml
├── suite.schema.json                      # common suite envelope
├── coverage.schema.json                   # per-library coverage manifest
└── cases/
    ├── merge-maps.case.schema.json        # input/expect shape for three-layer-config.merge-maps
    └── checksum.case.schema.json          # input/expect shape for fulhash.crc32
```

Directory names under `conformance/` use module ids from the
[module registry](../../standards/fulmen/module-registry.md). Suite ids are `<module>.<suite>`.

### 2. Suite file format

Suites are YAML restricted to the **JSON data model**, so every library parses them with its standard YAML
library and gets the same value:

- String mapping keys only. No anchors, aliases, merge keys (`<<`), or custom tags.
- No NaN or Infinity. Integers stay within ±2^53 so JavaScript reads them exactly.
- Strings that YAML 1.1 parsers would coerce (`yes`, `no`, `on`, `off`, `~`, octal-looking numbers) are quoted.
- Byte inputs use hex strings, never integer arrays. Text inputs are UTF-8.
- Crucible CI converts every suite to JSON and back and fails on any difference.

Common envelope (`suite.schema.json`):

| Field           | Required | Meaning                                                                                                      |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `$schema`       | yes      | Envelope schema URL                                                                                          |
| `suite`         | yes      | Suite id, e.g. `three-layer-config.merge-maps`                                                               |
| `suite_version` | yes      | SemVer of this suite's vectors (see Versioning)                                                              |
| `operation`     | yes      | Abstract operation name the harness maps to a library function                                               |
| `case_schema`   | yes      | Schema for each case's `input` and `expect`                                                                  |
| `standard`      | yes      | Link to the normative section the vectors encode                                                             |
| `authority`     | yes      | Where expected values come from: `kind` (`standard`, `rfc`, `external-reference`), `reference`, `derivation` |
| `invariants`    | no       | Properties every harness asserts on every case (e.g. `inputs-unchanged`)                                     |
| `cases`         | yes      | List of cases                                                                                                |

Each case:

| Field         | Required | Meaning                                                                                               |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Kebab-case, unique within the suite, immutable, never reused                                          |
| `description` | yes      | One sentence describing the behavior under test                                                       |
| `tier`        | yes      | `core` (every implementing library MUST run it) or `extended`                                         |
| `requires`    | no       | Capabilities the case needs (e.g. `fulhash.crc32c`). Libraries declare capabilities in their manifest |
| `input`       | yes      | Operation-specific, validated by `case_schema`                                                        |
| `expect`      | yes      | Exactly one of `value` (expected result) or `error` (expected error `code`)                           |
| `notes`       | no       | Rationale, provenance, edge-case explanation                                                          |

Example, `three-layer-config.merge-maps` (abridged):

```yaml
$schema: https://schemas.fulmenhq.dev/crucible/conformance/v1.0.0/suite.schema.json
suite: three-layer-config.merge-maps
suite_version: 1.0.0
operation: merge_maps
case_schema: https://schemas.fulmenhq.dev/crucible/conformance/v1.0.0/cases/merge-maps.case.schema.json
standard: docs/standards/library/modules/enterprise-three-layer-config.md#merge-semantics
authority:
  kind: standard
  reference: docs/standards/library/modules/enterprise-three-layer-config.md#merge-semantics
  derivation: Hand-authored from the standard. No implementation output is used as the oracle.
invariants:
  - inputs-unchanged
cases:
  - id: maps-merge-recursively
    tier: core
    description: Nested mappings merge key by key; keys absent from the overlay are kept.
    input:
      base: { keep: base, object: { base: kept } }
      overlay: { object: { overlay: added } }
    expect:
      value: { keep: base, object: { base: kept, overlay: added } }
  - id: sequences-replace
    tier: core
    description: An overlay sequence replaces the base sequence; it is not concatenated.
    input:
      base: { list: [a, b] }
      overlay: { list: [c] }
    expect:
      value: { list: [c] }
  - id: null-deletes-key
    tier: core
    description: An explicit null in the overlay removes the key from the result.
    input:
      base: { remove: { nested: value }, keep: value }
      overlay: { remove: null }
    expect:
      value: { keep: value }
```

Example, `fulhash.crc32` (abridged):

```yaml
suite: fulhash.crc32
operation: checksum
authority:
  kind: external-reference
  reference: CRC catalogue check values (CRC-32/ISO-HDLC, CRC-32/ISCSI) and RFC 3720 section B.4
  derivation: >-
    Values recomputed in Crucible CI by an independent reference (language standard library CRC32 and a
    bitwise CRC32C), never by a helper library.
cases:
  - id: crc32-check-value
    tier: core
    description: Standard check input "123456789".
    input: { algorithm: crc32, data: { utf8: "123456789" } }
    expect: { value: "crc32:cbf43926" }
  - id: crc32c-rfc3720-zeros-32
    tier: core
    requires: [fulhash.crc32c]
    description: RFC 3720 B.4, 32 bytes of 0x00.
    input: { algorithm: crc32c, data: { repeat: { hex: "00", count: 32 } } }
    expect: { value: "crc32c:8a9136aa" }
    notes: >-
      RFC 3720 prints this CRC in transmitted byte order (aa 36 91 8a). FulHash renders the 32-bit value
      big-endian, as all four libraries do today.
  - id: crc32c-streamed-equals-block
    tier: core
    requires: [fulhash.crc32c]
    description: Chunked input produces the same digest as the whole input.
    input:
      {
        algorithm: crc32c,
        data: { chunks: [{ utf8: "Hello, " }, { utf8: "World!" }] },
      }
    expect: { value: "crc32c:4d551068" }
```

`data` accepts exactly one of `utf8`, `hex`, `repeat` (`hex` pattern and `count`), or `chunks` (a list of the
others). When `chunks` is present, the harness MUST use the library's streaming API. Expected values reuse the
existing `library/fulhash/v1.0.0/checksum-string` schema, so vectors and runtime output share one format.

### 3. What belongs in the corpus, and what does not

A case belongs in the corpus only if its input and expected output are fully representable in the JSON data
model and the behavior is required by a Crucible standard. Everything else stays as library-local tests,
listed in the library's manifest under `local_only` so the parity matrix can show it.

Explicitly **out of scope** for `three-layer-config.merge-maps`:

- Go typed-nil map merging as an empty object (`var m map[string]any`)
- Go typed-nil slice replacing as a nil slice (`var s []any`)
- `MergeMaps(nil, nil)` returning a non-nil empty map
- Cycle rejection, `json.Number`, NaN/Inf, and unsupported native types
- Non-string mapping keys, and non-mapping roots (a root-level `null` or scalar)

The portable stand-ins for the typed-nil cases (overlay `{}` on an existing key is an identity merge; overlay
`{}` on an absent key yields `{}`) are in the corpus as normal cases, as rsfulmen already does.

Input immutability (no aliasing) is a property, not a vector. It is declared once as the suite invariant
`inputs-unchanged`, and every harness asserts it on every case.

### 4. Library coverage manifest

Each library commits `conformance.yaml` at its repository root, validated against `coverage.schema.json`:

```yaml
# Illustrative manifest; issue numbers and local test paths are placeholders.
$schema: https://schemas.fulmenhq.dev/crucible/conformance/v1.0.0/coverage.schema.json
library: tsfulmen
capabilities: [fulhash.crc32, fulhash.crc32c]
suites:
  fulhash.crc32:
    status: implemented
  three-layer-config.merge-maps:
    status: implemented
    skips:
      - case: null-deletes-key
        reason: known-divergence
        tracking: https://github.com/fulmenhq/tsfulmen/issues/NNN
local_only:
  - suite: three-layer-config.merge-maps
    test: src/config/__tests__/merge.test.ts
    rationale: TypeScript-specific undefined-versus-absent handling
```

Rules:

- `status` is one of:
  - `implemented`: the harness runs the suite.
  - `planned`: the library does not implement the operation yet. Requires a `tracking` link; the harness
    records the whole suite as skipped. For example, rsfulmen declares `fulhash.crc32` as `planned` until it
    implements CRC32 and CRC32C.
  - `not-applicable`: requires a rationale.

  A suite missing from the manifest fails the harness, so new suites cannot be ignored silently.

- `skips[].reason` is `known-divergence` or `not-implemented`. Both are transitional and require a `tracking`
  link (EPR-0005: local exceptions are transitional with an owner and a trigger). There is no `unrepresentable`
  reason, because unrepresentable cases are kept out of the corpus by Section 3.
- A `core` case may be skipped only by an explicit, tracked entry. A case gated by `requires` is skipped
  automatically when the library does not declare the capability, and the result records that.
- In CI, a library MUST declare every capability its standard requires. For example, pyfulmen runs with its
  CRC32C dependency installed, so `fulhash.crc32c` is declared and those cases execute.

### 5. Harness behavior

Each library implements a thin harness, test-only code that ships in no artifact. It:

1. Loads `index.yaml` from the synced corpus and validates the manifest against it.
2. For each declared suite, maps `operation` to the library function and runs every case.
3. Compares results structurally in the JSON data model: mappings unordered, sequences ordered, integers
   compared as integers.
4. Asserts every suite `invariant` on every case.
5. **Fails** on any of the following:
   - A mismatch.
   - A case that was neither run nor skipped by a manifest entry or capability gate.
   - A skip entry naming an unknown case (stale skip).
   - A skipped case that now passes (unexpected pass: the skip must be removed).
   - A missing or unreadable corpus. Absent evidence is a failure, not a skip.
   - A corpus whose provenance commit differs from the library's Crucible pin.
6. Includes a self-test that feeds one deliberately corrupted vector and asserts that the harness reports
   failure (EPR-0002 negative control).
7. Writes `conformance-results.json` (library, version, Crucible ref, per-case pass, fail, or skip with reason)
   as a CI artifact.

### 6. Versioning

- **The corpus is pinned by the Crucible release tag.** No separate corpus version. One pin means a standard and
  its vectors always move together (3leaps EPR-0003, claim integrity: a claim moves on every surface at once).
- **`suite_version` (SemVer, per suite):**
  - MINOR: add cases, or add optional envelope fields.
  - PATCH: fix descriptions or notes without changing any `input` or `expect`.
  - MAJOR: change the `expect` of an existing case, or remove a case. A MAJOR bump requires a matching change to
    the normative standard in the same PR and a CHANGELOG entry.
- Case ids are immutable and never reused, mirroring decision-record numbering.
- Schemas follow the existing `schemas/<domain>/v{MAJOR}.{MINOR}.{PATCH}/` layout.
- Bumping the Crucible pin in a library is a deliberate PR. If new cases fail, that PR either fixes the library
  or adds tracked skips. Corpus growth never breaks a library's `main` without a reviewed change.

### 7. Sync into libraries

- Crucible's `sync-to-lang` mirrors `conformance/` into `lang/{python,typescript,rust}/conformance/`, the same
  pattern as `schemas/`, `config/`, and `docs/` (ADR-0013). Libraries keep a single `sync_path_base`. The mirror
  is excluded from Crucible's own published wrapper packages (for example, a `Cargo.toml` `exclude` for
  `lang/rust`).
- Each library adds one asset to `.goneat/ssot-consumer.yaml`:
  `source_path: conformance`, `paths: ["**/*"]`, `subdir: testdata/crucible-conformance`. The same path is used
  in all four libraries.
- `testdata/crucible-conformance/` is outside every shipped surface. Go ignores `testdata` when building.
  rsfulmen's `build.rs` embeds only `*/crucible-rs`. The tsfulmen npm `files` list and the pyfulmen wheel and
  sdist include lists do not cover it. Each library's adoption PR verifies this with a packaging check.

### 8. How CI proves parity

| Layer       | Gate                                                                                                                            | Proves                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Crucible CI | Schema-validate `index.yaml`, every suite, and every case. Every file in `_controls/rejects/` must fail                         | Corpus is well-formed, and the validator can fail                    |
| Crucible CI | JSON round-trip, unique case ids, `suite_version` bump check against the merge base                                             | Portable data model and versioning discipline                        |
| Crucible CI | `external-reference` suites recomputed by an independent checker in `scripts/` (CRC via standard library and bitwise reference) | Expected values do not depend on any helper library                  |
| Library CI  | Harness inside the normal `make test`; manifest validated against the schema                                                    | Each library matches the corpus, with every gap declared and tracked |
| Estate      | Parity matrix generated from the four committed manifests (and later from `conformance-results.json`)                           | One view of which library passes which suite and which gaps remain   |

`three-layer-config.merge-maps` has no external reference implementation. Its authority is the standard plus
review: every case cites the clause it encodes, and changes to `expect` require a standard change (Section 6).

### 9. Existing fixture files

`fulhash/fixtures.yaml`, `foundry/signal-resolution-fixtures.yaml`, and `similarity/fixtures.yaml` stay where
they are. Moving them would break every consumer's path, and changing the closed fulhash schema would break
gofulmen's schema-validation test on the next pin bump. New domains go into `conformance/` only. Migrating the
existing files (and stopping their shipment inside `config/`) is a separate, later decision.

## Rationale

### Where the corpus lives: Crucible versus a dedicated repository

| Criterion                            | In fulmenhq/crucible (`conformance/`)                                                                                                                     | New fulmenhq repository                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Standard and vectors change together | Same PR, same tag                                                                                                                                         | Two repos, two releases, version skew possible        |
| Consumer wiring                      | One more asset in an existing sync source and pin                                                                                                         | A second sync source, pin, and provenance per library |
| Existing infrastructure              | Schema validation, `make sync`, release process, attribution checks                                                                                       | Must be rebuilt                                       |
| Governance and taxonomy              | Covered by existing ADRs                                                                                                                                  | New repository category; "fixture" is already taken   |
| Release cadence                      | Tied to Crucible releases, which need maintainer approval                                                                                                 | Independent                                           |
| Large or binary specimens            | Inflates the Crucible clone and its `lang/*` mirrors                                                                                                      | Isolated                                              |
| Shipping risk                        | Avoided by placing the corpus outside `config/`                                                                                                           | None                                                  |
| Upstream precedent                   | 3leaps/crucible keeps vectors beside their contracts (durable-queue `vectors/`, segmented-snapshot `fixtures/`); its PDR-0006 permits standalone fixtures | None                                                  |

**Recommendation: Crucible, top-level `conformance/`.** Semantics and evidence are one contract and should
version as one. The consumer cost is one sync asset per library instead of a second pinned dependency. The main
cost is cadence: a new vector waits for a Crucible release. That is acceptable for semantics that change rarely.

The seam that keeps extraction cheap is that harnesses read only `index.yaml` and the envelope schema, never
Crucible-specific paths. Extracting the corpus later means changing one sync source per library. Revisit the
home if any of these triggers fires:

- The corpus exceeds roughly 5 MB, or needs binary specimens beyond small test archives.
- Vector updates are routinely blocked waiting on unrelated Crucible releases.
- Non-library consumers (CLIs, workhorses) need the corpus without the rest of Crucible.

### Why a manifest instead of skip annotations in test code

Skip annotations are invisible to every repository except their own. A schema-validated manifest makes gaps
reviewable, countable, and enforceable: stale and unexpectedly passing skips fail. It also feeds a parity matrix
without running any library's tests.

## Alternatives Considered

### Alternative 1: Continue per-library ports (status quo)

**Description**: Libraries copy cases from one another as needed, like the rsfulmen `MergeMaps` port.

**Pros**:

- No new structure or coordination.

**Cons**:

- The library ported from becomes the oracle (violates evidence independence).
- Ports drift, and divergence goes undetected. The tsfulmen and pyfulmen null handling shows this already
  happens.
- Four times the authoring effort for every new case.

**Decision**: Rejected.

### Alternative 2: Extend the existing per-module fixture files under `config/`

**Description**: Add CRC columns to `fulhash/fixtures.yaml` and a `config/library/config/merge-fixtures.yaml`.

**Pros**:

- Zero sync changes, and familiar to library authors.

**Cons**:

- Ships test data in every production artifact (Go embed, Rust `include_bytes!`, wheel, npm).
- The closed fulhash v1.0.0 schema would need a new version, breaking gofulmen's schema-validation test on the
  next pin bump.
- No common envelope, skip contract, or harness. Each file keeps its own ad hoc shape.

**Decision**: Rejected for new domains. Existing files remain (Section 9).

### Alternative 3: Dedicated corpus repository now

**Description**: Create a new fulmenhq repository holding only conformance vectors.

**Pros**:

- Independent cadence, room for large corpora, and clean test-only consumption.

**Cons**:

- Splits the standard from its evidence across repositories and releases.
- Adds a second pinned source to every library, plus a new repository category and governance.

**Decision**: Deferred. The format is designed so extraction stays cheap if a trigger above fires.

### Alternative 4: Shared executable conformance runner

**Description**: Publish a runner binary that drives each library through a subprocess protocol.

**Pros**:

- One harness implementation.

**Cons**:

- Every library needs a CLI shim and a wire protocol.
- Crucible ships no consumer-linked code (3leaps PDR-0006).
- Native-language harnesses are smaller and run inside existing test tooling.

**Decision**: Rejected.

## Consequences

### Positive

- ✅ A case authored once runs in all four libraries at their next pin bump.
- ✅ Divergence from Crucible standards becomes a failing test, not an audit finding. The first two suites
  expose the tsfulmen and pyfulmen null-handling gap and the missing rsfulmen CRC support on adoption.
- ✅ Gaps are explicit, tracked, and countable. Silent skips become impossible.
- ✅ Test data stays out of production artifacts.
- ✅ The rsfulmen port file can be retired, and language-specific semantics keep a documented home
  (`local_only`).

### Negative

- ⚠️ Each library maintains a harness (estimated under 200 lines of test code) and a manifest.
- ⚠️ A new vector reaches libraries only after a Crucible release and a pin bump.
- ⚠️ Mirroring into `lang/*` adds three in-repo copies of the corpus to Crucible, like existing assets.
- ⚠️ Fixing tsfulmen and pyfulmen null handling changes observable behavior for their users.

### Neutral

- ℹ️ Existing fixture files keep working unchanged. Their migration is a separate decision.
- ℹ️ The JSON data-model restriction deliberately excludes some YAML features from vectors.

## Implementation

Every step below is a separate, small PR. Crucible releases and tags require maintainer approval as usual.

### Phase 1: Crucible

| PR  | Content                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `schemas/conformance/v1.0.0/` (index, suite, coverage), `conformance/README.md`, empty `index.yaml`, `_controls/rejects/`, a `validate-conformance` target wired into `check-all`, and the `sync-to-lang` mirror                                                              |
| C2  | `merge-maps.case.schema.json`, `conformance/three-layer-config/merge-maps.vectors.yaml`, and clarifications in the Three-Layer Config standard (roots are mappings; null in a sequence is a value; base nulls not touched by the overlay are preserved, pending confirmation) |
| C3  | `checksum.case.schema.json`, `conformance/fulhash/crc32.vectors.yaml`, the independent checker in `scripts/`, and one normative sentence in the FulHash standard: CRC digests render the 32-bit value big-endian                                                              |
| R   | Crucible minor release carrying C1 to C3                                                                                                                                                                                                                                      |

Initial `three-layer-config.merge-maps` cases (all `core`), derived from the standard and cross-checked against
the gofulmen and rsfulmen tests:

- `scalar-last-writer-wins`
- `maps-merge-recursively`
- `sequences-replace`
- `empty-sequence-replaces`
- `null-deletes-key`
- `nested-null-deletes-only-that-key`
- `null-on-absent-key-is-noop`
- `empty-overlay-mapping-is-identity`
- `empty-mapping-on-absent-key`
- `map-replaces-scalar`
- `scalar-replaces-map`
- `null-inside-sequence-is-a-value`
- `empty-root-overlay-is-identity`

Initial `fulhash.crc32` cases, for both CRC32 and CRC32C:

- Empty input.
- The `123456789` check value.
- `Hello, World!`.
- The four RFC 3720 B.4 patterns: 32 × `0x00`, 32 × `0xFF`, ascending `0x00` to `0x1F`, and descending `0x1F`
  to `0x00`.
- A streamed-equals-block case.

### Phase 2: Libraries

Libraries can proceed in parallel once the release exists. Suggested order: gofulmen, then rsfulmen, then
tsfulmen and pyfulmen.

| Library  | PR 1: wire                                                                                                                     | PR 2: harness                                                                                               | PR 3: converge                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gofulmen | Pin bump, `conformance` sync asset into `testdata/crucible-conformance/`                                                       | Go harness and `conformance.yaml`; typed-nil and `MergeMaps(nil, nil)` tests listed under `local_only`      | Replace length-only CRC tests with corpus coverage                                                                                                                                  |
| rsfulmen | Pin bump, sync asset, crate `exclude` check                                                                                    | Rust harness and `conformance.yaml`; `fulhash.crc32` declared `planned` with a tracking issue               | Delete `src/config/testdata/gofulmen-merge-parity.yaml`; Rust-only cases stay as unit tests. Adding CRC32 and CRC32C is a separate feature PR that flips the suite to `implemented` |
| tsfulmen | Pin bump from v0.4.15 (kept apart from the harness so unrelated sync changes are reviewed alone), sync asset, `npm pack` check | TypeScript harness and `conformance.yaml`; null cases declared `known-divergence`                           | Make overlay `null` delete keys, remove the skips, add a CHANGELOG entry                                                                                                            |
| pyfulmen | Pin bump from v0.4.15, sync asset, wheel and sdist check                                                                       | Python harness and `conformance.yaml`; CI declares `fulhash.crc32c`; null cases declared `known-divergence` | Make overlay `None` delete keys, remove the skips, add a CHANGELOG entry                                                                                                            |

### Phase 3: Estate

- A Crucible script renders the parity matrix from the four public `conformance.yaml` files.
- Move this record to `accepted` once two libraries have reached `verified`.
- Open a follow-up decision on migrating the existing fixture files into the corpus.

### Success and stop conditions

- **Success**: both suites run in all four libraries' CI with zero untracked skips (rsfulmen's CRC suite is
  `planned` with a tracking issue until it implements CRC), the rsfulmen port file is gone, and tsfulmen and
  pyfulmen conform to the null-deletion rule.
- **Stop and revisit**: any of the following.
  - A harness needs per-case language branches.
  - Fewer than about 80% of the first two domains' relevant existing tests can be expressed as vectors.
  - Harness code grows well beyond the estimate.

### Rollback

The corpus is test-only. A library can stay on its previous Crucible pin, or add tracked skips, with no runtime
impact. Removing the corpus means deleting one sync asset and the harness.

### Implementation Status

| Library  | Status         | Notes                                                                | PR/Issue |
| -------- | -------------- | -------------------------------------------------------------------- | -------- |
| gofulmen | planned        | Conforms to merge semantics today; CRC known values not yet asserted | n/a      |
| rsfulmen | planned        | Conforms to merge semantics; port file to be retired; no CRC support | n/a      |
| tsfulmen | planned        | Null handling diverges from standard                                 | n/a      |
| pyfulmen | planned        | Null handling diverges from standard                                 | n/a      |
| csfulmen | not-applicable | No active library                                                    | n/a      |

## Cross-Language Coordination

- **Go**: compare with `reflect.DeepEqual` after normalizing YAML-decoded integers. Typed-nil semantics stay in
  gofulmen tests.
- **Rust**: decode with `serde_yaml::Value` (as the existing port does) and compare `Value`s. Mapping-key order
  is irrelevant.
- **TypeScript**: decode with the `yaml` package in core-schema mode. Compare with a structural deep-equal that
  treats a missing key and an `undefined` value differently.
- **Python**: decode with a YAML 1.2 core-schema loader, not PyYAML's YAML 1.1 implicit typing, or rely on the
  quoting rule. Compare dicts and lists directly.

## Open Questions

1. Confirm the home: Crucible top-level `conformance/` (recommended) or a dedicated repository now.
2. Confirm the sync shape: mirror into `lang/*` (recommended, no tool change), or add a second goneat source at
   repository root if `goneat ssot` supports two sources from the same repository and ref.
3. Treatment of tsfulmen and pyfulmen null handling: plain fix in a minor release (both are 0.x), or a
   transitional option.
4. Confirm that a base `null` not touched by the overlay is preserved in the result. The standard is silent on
   this.
5. Schema directory: `v1.0.0` (fulmenhq convention, proposed here) or an experimental `v0` per the upstream
   versioning ADR until two libraries verify.
6. Decision-record shape: a single ecosystem ADR (proposed), or split the vector grammar into a design record
   using the upstream decision-record taxonomy.
7. Replace the placeholder `deciders` entry with the approving maintainers on acceptance.

## References

- [Three-Layer Config standard](../../standards/library/modules/enterprise-three-layer-config.md)
- [FulHash module standard](../../standards/library/modules/fulhash.md)
- [Crucible Sync Model](../sync-model.md)
- [ADR-0013: Rust Language Support Uses Sync Pattern](ADR-0013-rust-sync-pattern-validation.md)
- [Fulmen Fixture Standard](../fulmen-fixture-standard.md) (terminology boundary)
- 3leaps/crucible decision records: EPR-0002 verification gate integrity, EPR-0003 claim integrity, EPR-0005
  test evidence independence, PDR-0006 shipping charter, ADR-0001 schema and config versioning
- [RFC 3720, Appendix B.4: CRC examples](https://www.rfc-editor.org/rfc/rfc3720#appendix-B.4)
- rsfulmen `src/config/testdata/gofulmen-merge-parity.yaml` (motivating port)

## Revision History

| Date       | Status Change | Summary       | Updated By |
| ---------- | ------------- | ------------- | ---------- |
| 2026-10-12 | → proposal    | Initial draft | entarch    |

---

**Schema Conformance**: This ADR conforms to [ADR Frontmatter Schema v1.0.0](https://schemas.fulmenhq.dev/standards/adr-frontmatter-v1.0.0.json)
