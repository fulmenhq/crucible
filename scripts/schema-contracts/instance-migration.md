# Configuration instance contracts

## Ecosystem branding

`schemas/branding/v1.0.0/ecosystem.schema.json` supplies the ID already declared
by `config/branding/ecosystem.yaml`. It describes the published motto-based
summary: required `version`, `motto`, `built_by`, `url`, and structured `metadata`;
optional `$schema` and `motto_extended`. Metadata requires `org`, `maintainer`,
`url`, `source`, and `tagline`. Both objects are closed. Display text is nonempty;
URLs are absolute HTTP(S) strings. There is no arbitrary extension map.

The historical `short`/`extended`/`full` branding shape was replaced by the
motto-based configuration in `ac81be9`; this new schema describes the current
published shape. Consumers holding that older data must migrate its display
text and attribution explicitly. The schema does not introduce a helper API.

## Additive v1 fields

Exit-code entries accept optional `signal_catalog`, `linux_calculation`, and
`macos_calculation` strings. Signal references use
`config/library/foundry/signals.yaml#<signal-id>`. Calculations are nonempty
descriptive text, not executable expressions. Required fields, numeric ranges,
and closed entry objects are unchanged. The annotations were published in
`8ead9a0`; the snapshot generator continues selecting its existing fields.

Server-management, site-branding, and site-styling accept optional root
`$schema`, `version`, and `description` fields alongside their existing runtime
properties. No nested `metadata` object is introduced. `$schema` accepts exactly
the canonical `/crucible/` ID and the existing published alias without that
prefix; the offline inventory maps those aliases explicitly. `version` is a
three-component numeric version with an optional `v`/`V` prefix; `description`
is a string. All three fields may be omitted independently. Required runtime
properties and closed objects retain their existing constraints. These envelopes
were already present in the defaults introduced in `360c87e`.

## Fixture taxonomy: v1 variants and v2 scenarios

The v1.0.0 fixture schema remains byte-for-byte unchanged and validates variant
maps. The v2.0.0 schema validates scenario arrays and optional fixture-level
`description`. The current catalog declares v2.0.0; its content version remains
1.1.0. Schema and catalog content versions are independent.

The scenario representation was published in `2313ee3` and is described in
the [fixture standard](../../docs/architecture/fulmen-fixture-standard.md#registry-schema).
Readers should choose their schema from `$schema`, not infer it from `version`.
Do not alias the old schema ID to the new schema.

To migrate a v1 catalog:

1. For each fixture, take `variants` values in ascending three-digit key order.
2. Store those objects in a nonempty `scenarios` array, preserving `name`,
   `description`, translations, and lifecycle status; remove `variants`.
3. Change `$schema` to
   `https://schemas.fulmenhq.dev/crucible/taxonomy/fixture/v2.0.0/fixture-catalog.schema.json`.
4. Version the catalog content separately and validate the complete document.

Scenario objects remain closed and require a name and description. The schema
rejects exact duplicate objects; JSON Schema `uniqueItems` does not enforce
uniqueness of names across objects with differing metadata. Consumers using
names as lookup keys must check that semantic constraint themselves. Numeric
variant codes are not represented in v2; consumers needing those identifiers
should retain their v1 catalog or an explicit migration mapping.

`instance_repair_test.go` covers canonical whole-document validation, legacy
unannotated/envelope-free inputs, malformed and unknown fields, preserved v1
variants, new scenarios, and the migration boundary. The full inventory gate
also requires supported wrapper synchronization and byte parity.
