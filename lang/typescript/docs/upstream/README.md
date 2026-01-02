# Upstream Documentation

Vendored documentation from upstream repositories.

## Status

**Not yet populated.** This directory is reserved for future use.

## Purpose

When fulmenhq/crucible needs to include documentation from upstream sources (e.g., 3leaps/crucible standards that should render on our documentation site), those files will be vendored here.

## Planned Structure

```
docs/upstream/
├── README.md           # This file
└── 3leaps/             # Future: vendored from 3leaps/crucible
    ├── PROVENANCE.md   # Source tracking
    └── ...             # Vendored docs
```

## When to Use

Vendor upstream docs when:

- Standards docs need to render on fulmenhq doc sites
- Reference material should be available offline
- Version-locked docs are required for compliance

## When NOT to Use

Don't vendor if you can:

- Link to canonical upstream URLs
- Reference via relative sibling path (`../../../3leaps/crucible/docs/...`)

## Sync Pattern

Will follow the same pattern as `schemas/upstream/`:

1. Copy files from upstream
2. Track source in `PROVENANCE.md`
3. Exclude from lint/format via `.goneatignore`
4. Validate in CI

## References

- [Upstream Sync Consumer Guide](../ops/upstream-sync-consumer.md)
- [schemas/upstream/](../../schemas/upstream/) - Current upstream content
