# Crucible Go Module - Relocated to Root

**Note**: The Crucible Go module has been relocated to the repository root as of v2025.10.5.

## Why the Move?

Starting with v2025.10.5, Crucible's Go module (`go.mod`, `*.go` sources) now lives at the **repository root** instead of `lang/go/`. This change was necessary to:

1. **Enable standard Go module installation**: `go get github.com/fulmenhq/crucible` now works without subdirectory workarounds
2. **Support `go:embed` directives**: Go code can embed schemas and docs directly from root SSOT directories
3. **Follow Go ecosystem conventions**: Root-level Go modules are the standard pattern for multi-language monorepos

## Migration Notes

### For External Consumers

If you're using Crucible from an external Go project:

```go
// Standard installation now works
go get github.com/fulmenhq/crucible@v2025.10.5

// Import paths unchanged
import "github.com/fulmenhq/crucible"
```

### For gofulmen and Downstream Libraries

Update your `go.mod` to use v2025.10.5 or later and **remove any replace directives**:

```go
// Before (v2025.10.4 and earlier)
require github.com/fulmenhq/crucible v2025.10.4
replace github.com/fulmenhq/crucible => ../crucible/lang/go

// After (v2025.10.5+)
require github.com/fulmenhq/crucible v2025.10.5
// No replace directive needed!
```

### For Crucible Contributors

The asymmetric structure is intentional:

- **Go**: Lives at root (supports `go:embed` and standard module installation)
- **Python**: Lives at `lang/python/` (standard Python package structure)
- **TypeScript**: Lives at `lang/typescript/` (standard npm package structure)

This pattern follows industry standards (see Terraform, Kubernetes, NATS) where the primary language occupies the root while other language bindings live in subdirectories.

## SSOT Sync Pattern

**Key Change**: Go no longer receives synced copies of schemas/docs/config.

- **Before v2025.10.5**: Root SSOT synced TO `lang/go/schemas/`, `lang/go/docs/`, `lang/go/config/`
- **After v2025.10.5**: Go embeds directly FROM root `schemas/`, `docs/`, `config/` via `//go:embed` directives

This eliminates sync overhead for Go while preserving the SSOT pattern for Python and TypeScript wrappers.

## Development Commands

All Go development now happens at repository root:

```bash
# Build
go build ./...

# Test
go test ./...

# From Makefile
make test-go
make build-go
```

## Documentation

- **Architecture Decision**: See [ADR-0009](../../docs/architecture/decisions/ADR-0009-go-module-root-relocation.md)
- **Repository Structure**: See [docs/sop/repository-structure.md](../../docs/sop/repository-structure.md)
- **API Reference**: Run `go doc github.com/fulmenhq/crucible` or visit [pkg.go.dev](https://pkg.go.dev/github.com/fulmenhq/crucible)

## Questions?

If you have questions about this change or encounter issues:

1. Check the [CHANGELOG](../../CHANGELOG.md) for migration notes
2. Review [ADR-0009](../../docs/architecture/decisions/ADR-0009-go-module-root-relocation.md) for technical rationale
3. Open an issue or contact @3leapsdave

---

**This directory is preserved for discoverability only.** All Go development happens at repository root.
