# Crucible

**Blueprints for Enterprise Scale: SSOT Enabling High-Performance, Reliable Applications Across Fulmen Layers**

<div align="center">

🔥 **The standards forge for the FulmenHQ ecosystem** 🔥

_Single source of truth for schemas, standards, templates, and quality enforcement—foundational infoarch (level 0) in Fulmen's layer cake, powering libraries (level 1), templates (level 2), and apps/analytics (level 3+)._

[![Go Tests](https://github.com/fulmenhq/crucible/workflows/Test%20Go/badge.svg)](https://github.com/fulmenhq/crucible/actions)
[![TypeScript Tests](https://github.com/fulmenhq/crucible/workflows/Test%20TypeScript/badge.svg)](https://github.com/fulmenhq/crucible/actions)
[![Python Tests](https://github.com/fulmenhq/crucible/workflows/Test%20Python/badge.svg)](https://github.com/fulmenhq/crucible/actions)
[![Schema Validation](https://github.com/fulmenhq/crucible/workflows/Validate%20Schemas/badge.svg)](https://github.com/fulmenhq/crucible/actions)

</div>

---

## What is Crucible?

**Crucible** is where the patterns, standards, and schemas that enable massive scale are refined, tested, and proven. Just as a crucible uses heat and pressure to purify materials, this repository refines development practices through rigorous validation and real-world usage.

### The Forge in the Fulmen Ecosystem

```

Fulmen Layer Cake

Layer 0: Crucible (Infoarch SSOT) ⚡

├── Schemas - Data contracts

├── Standards - Coding practices

├── Processes/SOPs - Governance

└── Documentation - Living specifications

Layer 1: Helper Libraries (*fulmen)

├── gofulmen - Go foundations

├── tsfulmen - TypeScript foundations

├── pyfulmen - Python foundations

└── {rsfulmen, csfulmen} - Future languages

Layer 2: Templates (Fulmens)

├── forge-workhorse-groningen - Go backend

├── forge-workhorse-percheron - Python backend

└── {Future forges} - CLI, frontend, services

Layer 3: DX/Dev Tools

├── goneat - Quality & formatting

├── fulward - Protection & approvals

└── pathfinder - Safe discovery

Layer 4: Apps/Services

├── brooklyn-mcp - Workflow orchestration

├── sumpter - Advanced data extraction/ELT

├── Analytics platforms

└── Production forges

```

See [Fulmen Ecosystem Guide](docs/architecture/fulmen-ecosystem-guide.md) for detailed layer interactions—including the virtuous flywheel where Layer 0 refines → Layer 1 embeds → Layer 2 scaffolds → Layer 3 automates → Layer 4 deploys—and [Technical Manifesto](docs/architecture/fulmen-technical-manifesto.md) for core tenets.

**Crucible ensures**:

- All Fulmens maintain enterprise-grade quality
- Schemas ensure interoperability across projects
- Standards enable "Start Fast, Thrive on Scale"
- Quality gates enforce "Be Persnickety About Code"

## Quick Start

> **⚠️ Platform Support**: Development tooling currently supports **macOS** and **Linux** hosts. Windows support is planned but not yet fully tested. Windows users may encounter issues with `.tar.gz` extraction and external tool bootstrapping.

Before any language-specific steps, bootstrap external tooling (installs binaries into `./bin/`):

```bash
make bootstrap
make tools # optional verification
```

### For Go Libraries/Tools

```bash
go get github.com/fulmenhq/crucible@latest
```

> **Note**: As of v0.1.4 (formerly v2025.10.5), the Go module lives at repository root (not `lang/go/`) for standard external installation and `go:embed` support. See [ADR-0009](docs/architecture/decisions/ADR-0009-go-module-root-relocation.md) for details. Crucible adopted Semantic Versioning as of v0.2.0 per [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md).

```go
import "github.com/fulmenhq/crucible"

// Access pathfinder schemas
schema, _ := crucible.SchemaRegistry.Pathfinder().V1_0_0().FindQuery()

// Load terminal catalog
catalog, _ := crucible.LoadTerminalCatalog()
iterm, _ := crucible.GetTerminalConfig("iTerm2")

// Access coding standards
goStandards, _ := crucible.StandardsRegistry.Coding().Go()
```

### For TypeScript Libraries/Tools

```bash
bun add @fulmenhq/crucible
```

```typescript
import { schemas, loadTerminalCatalog, standards } from "@fulmenhq/crucible";

// Access pathfinder schemas
const schema = schemas.pathfinder().v1_0_0().findQuery();

// Load terminal catalog
const catalog = loadTerminalCatalog();
const iterm = getTerminalConfig("iTerm2");

// Access coding standards
const goStandards = standards.coding().go();
```

### For Templates/Documentation

Use pull scripts to vendor assets:

```bash
# Copy pull script
cp ../crucible/scripts/pull/crucible-pull.ts scripts/

# Pull schemas and docs
bun run scripts/crucible-pull.ts --schemas --docs
```

**Full Integration Guide**: See [docs/guides/integration-guide.md](docs/guides/integration-guide.md) (and for sync workflows, [Sync Consumers Guide](docs/guides/sync-consumers-guide.md)).

## What's Available

### Schemas

Crucible provides JSON schemas for cross-language consistency:

- **Pathfinder** (`schemas/pathfinder/v1.0.0/`)
  - `find-query.schema.json` - File discovery parameters
  - `finder-config.schema.json` - Finder configuration
  - `path-result.schema.json` - Discovery results
  - `error-response.schema.json` - Standard error responses
  - `metadata.schema.json` - File metadata structure
  - `path-constraint.schema.json` - Safety boundaries

- **ASCII** (`schemas/ascii/v1.0.0/`)
  - `string-analysis.schema.json` - Unicode-aware string analysis
  - `box-chars.schema.json` - Box drawing characters

- **Schema Validation** (`schemas/schema-validation/v1.0.0/`)
  - `validator-config.schema.json` - Validator configuration
  - `schema-registry.schema.json` - Schema registry management

- **Terminal** (`schemas/terminal/v1.0.0/`)
  - Terminal configuration catalog (iTerm2, Ghostty, Apple Terminal)

- **Foundry Catalog** (`schemas/library/foundry/v1.0.0/`)
  - `country-codes.schema.json` - ISO 3166 country codes with alpha-2/alpha-3/numeric normalization
  - `http-status-groups.schema.json` - HTTP status code groupings and semantic meanings
  - `mime-types.schema.json` - Common MIME type classifications
  - `patterns.schema.json` - Text similarity and normalization patterns
  - `similarity.schema.json` - String similarity algorithm configurations
  - `signals.schema.json` - Signal handling semantics with OS mappings and behavior definitions

- **Observability** (`schemas/observability/`)
  - Logging schemas (`v1.0.0/`) - Logger configuration, log events, severity filters, middleware
  - Metrics schemas (`v1.0.0/`) - Metrics event structure

### Standards & Documentation

- **Coding Standards** (`docs/standards/coding/`)
  - Go coding practices (with schema-driven config hydration)
  - TypeScript coding practices
  - Python coding practices

- **Library Standards** (`docs/standards/library/`)
  - **Modules**: Crucible Shim, Docscribe, Config Path API, Three-Layer Config, Schema Validation, Signal Handling
  - **Catalogs**: Foundry (country codes, HTTP status, MIME types, text similarity, signal handling)
  - Helper library standard with Crucible Overview and version documentation requirements

- **Repository Standards** (`docs/standards/`)
  - Frontmatter standard for documentation
  - Repository versioning (SemVer and CalVer)
  - Repository lifecycle (experimental → LTS)
  - Error handling patterns
  - Configuration standardization
  - Agentic attribution

- **Architecture** (`docs/architecture/`)
  - Fulmen ecosystem guide and technical manifesto
  - Pseudo-monorepo strategy and sync model
  - Helper library standard

- **SOPs** (`docs/sop/`)
  - Repository structure requirements and operations
  - Version adoption process
  - CI/CD operations

- **Guides** (`docs/guides/`)
  - Integration guide (production + development)
  - Sync strategy (pull scripts vs packages)
  - Bootstrap guides (goneat, helper libraries)

## What's Inside

### 📋 Schemas - Data Contracts

Version-controlled JSON schemas for all FulmenHQ tools:

- **Terminal Configurations** (`schemas/terminal/`) - Unicode width overrides for terminal emulators
- **Policy Schemas** (`schemas/policy/`) - Fulward protection policies
- **Config Schemas** (`schemas/config/`) - Tool-specific configuration schemas

**Benefits**:

- Type-safe data contracts across languages
- Validation before runtime
- Interoperability between tools
- Versioned for backward compatibility

### 📚 Standards - Coding Practices

Shared standards across the FulmenHQ ecosystem:

- **Go Coding Standards** - Best practices for Go projects
- **TypeScript Standards** - TypeScript/JavaScript patterns
- **Commit Conventions** - Conventional commits
- **API Design** - REST/GraphQL patterns
- **Agentic Attribution** - AI agent contribution standards

**Benefits**:

- Consistent quality across projects
- Reduced onboarding time
- Automated enforcement via CI/CD
- Living documentation

### 📐 Templates - Project Patterns

Proven templates for bootstrapping new projects:

- **go-cli-tool** - Command-line tool template
- **go-library** - Library template with testing
- **typescript-library** - TypeScript library template

**Benefits**:

- Start with best practices
- Avoid common pitfalls
- Consistent structure
- Battle-tested patterns

### 🌍 Language Support

Crucible provides native libraries for multiple languages with an **asymmetric repository structure** optimized for each ecosystem:

- **Go** (at repository root): `import "github.com/fulmenhq/crucible"`
  - Standard Go module structure for external `go get` installation
  - Embeds schemas/docs directly from root SSOT via `//go:embed`
  - Adopted SemVer (v0.2.0+) for Go module compatibility per [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md)
  - Previous CalVer tags (v2025.10.1-v2025.10.5) mapped to SemVer (v0.1.0-v0.1.4)

- **TypeScript** (`lang/typescript/`): `import { ... } from '@fulmenhq/crucible'`
  - Standard npm package structure with synced assets

- **Python** (`lang/python/`): `from crucible import ...`
  - Standard Python package structure with synced assets

- **Future**: Rust (`rsfulmen`) and C# (`csfulmen`) as ecosystem needs evolve

**Features**:

- Embedded/vendored schemas (no runtime dependencies)
- Type-safe APIs
- Comprehensive tests
- Zero-config usage

**Architecture**: See [Library Ecosystem Guide](docs/architecture/library-ecosystem.md) for detailed information on how Crucible supports multiple languages while maintaining SSOT discipline.

## Usage

### Terminal Configuration

```go
// Go
import "github.com/fulmenhq/crucible"

catalog, err := crucible.LoadTerminalCatalog()
if err != nil {
    panic(err)
}

// Get specific terminal
config, err := crucible.GetTerminalConfig("iTerm2")
fmt.Printf("Emoji Width: %d\n", config.Overrides.EmojiWidth)
```

```typescript
// TypeScript
import { loadTerminalCatalog, getTerminalConfig } from "@fulmenhq/crucible";

const catalog = loadTerminalCatalog();
const config = getTerminalConfig("iTerm2");
console.log(`Emoji Width: ${config?.overrides.emoji_width}`);
```

### Policy Configuration

```go
// Go
policy, err := crucible.LoadPolicyExample("strict")
fmt.Printf("Policy version: %s\n", policy.Version)
```

```typescript
// TypeScript
import { loadPolicyExample } from "@fulmenhq/crucible";

const policy = loadPolicyExample("strict");
console.log(`Policy version: ${policy.version}`);
```

### Schema Validation

```go
// Go - Get raw schema for external validators
schema, err := crucible.GetPolicySchema()
// Use with JSON Schema validator
```

```typescript
// TypeScript - Get schema
import { getPolicySchema, getTerminalSchema } from "@fulmenhq/crucible";

const policySchema = getPolicySchema();
const terminalSchema = getTerminalSchema();
```

## Directory Structure

```
crucible/
├── go.mod                # Go module at root (v0.1.4+)
├── *.go                  # Go sources at root
├── schemas/              # Version-controlled schemas (SSOT)
│   ├── terminal/
│   ├── policy/
│   └── config/
├── docs/                 # Shared documentation (SSOT)
│   ├── standards/
│   ├── architecture/
│   └── guides/
├── config/               # Configuration catalogs (SSOT)
├── templates/            # Project templates
│   ├── go-cli-tool/
│   ├── go-library/
│   └── typescript-library/
├── lang/                 # Non-Go language wrappers
│   ├── go/               # Breadcrumb README (see ADR-0009)
│   ├── typescript/       # TypeScript package (synced)
│   └── python/           # Python package (synced)
└── scripts/              # Utilities and sync tooling
```

**Note**: Go lives at repository root for standard `go get` installation and direct SSOT embedding. Python and TypeScript remain in `lang/` subdirectories with synced assets. See [ADR-0009](docs/architecture/decisions/ADR-0009-go-module-root-relocation.md) for the rationale behind this asymmetric structure.

### Pseudo-Monorepo Strategy

Crucible intentionally sits between a classic mono-repo and a pure package registry with an **asymmetric language structure** (v0.1.4+):

- **Single Source, Many Consumers** – `schemas/`, `docs/`, and `config/` live once at the root as the authoritative SSOT for all language implementations and downstream repos.

- **Asymmetric Language Structure**:
  - **Go at root**: Go module (`go.mod`, `*.go`) lives at repository root, embedding SSOT directly via `//go:embed` directives
  - **Python/TypeScript in `lang/`**: Standard package structures with synced copies of SSOT assets
  - **Rationale**: Enables standard Go `go get` installation, Go embed support, while maintaining conventional package structures for other languages

- **Sync Automation** – `bun run scripts/sync-to-lang.ts` syncs SSOT to Python/TypeScript before releases (Go embeds directly from root, no sync needed)

- **Unified Versioning** – Root `VERSION` file (SemVer) drives all language packages, ensuring coordinated releases

- **Dual Distribution**:
  - **Go**: Published module at `github.com/fulmenhq/crucible`
  - **TypeScript**: Published package at `@fulmenhq/crucible`
  - **Python**: Published package at `fulmenhq-crucible`
  - **Pull Scripts**: `scripts/pull/crucible-pull.ts` for vendoring into templates/workhorses

**Golden Rule**: Root directories (`schemas/`, `docs/`, `config/`) are authoritative. Never edit synced copies in `lang/python/` or `lang/typescript/` directly—edit root SSOT and regenerate via sync scripts.

See [ADR-0009](docs/architecture/decisions/ADR-0009-go-module-root-relocation.md) for the asymmetric structure decision and [Library Ecosystem Guide](docs/architecture/library-ecosystem.md) for detailed architecture.

## Projects Using Crucible

- **[goneat](https://github.com/fulmenhq/goneat)** - Format/lint tool

- **[fulward](https://github.com/fulmenhq/fulward)** - Infrastructure protection

- **[gofulmen](https://github.com/fulmenhq/gofulmen)** - Shared Go libraries

- **[tsfulmen](https://github.com/fulmenhq/tsfulmen)** - Shared TypeScript libraries

- **[pyfulmen](https://github.com/fulmenhq/pyfulmen)** - Shared Python libraries

## Contributing

### Adding Terminal Configurations

1. Test your terminal with the calibration tool:

   ```bash
   goneat terminal calibrate
   ```

2. Add config to `schemas/terminal/v1.0.0/catalog/<terminal-name>.yaml`

3. Validate against schema:

   ```bash
   ajv validate -s schemas/terminal/v1.0.0/schema.json \
     -d schemas/terminal/v1.0.0/catalog/<terminal-name>.yaml
   ```

4. Submit PR with:
   - New terminal config
   - Screenshot showing rendering
   - Terminal version tested

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Licensing

Crucible uses a hybrid license model - see [LICENSE](LICENSE) for complete details.

**Trademarks**: "Fulmen" and "3 Leaps" are trademarks of 3 Leaps, LLC. While code is open source, please use distinct names for derivative works to prevent confusion. See LICENSE for full guidelines.

### OSS Policies (Organization-wide)

- Authoritative policies repository: https://github.com/3leaps/oss-policies/
- Code of Conduct: https://github.com/3leaps/oss-policies/blob/main/CODE_OF_CONDUCT.md
- Security Policy: https://github.com/3leaps/oss-policies/blob/main/SECURITY.md
- Contributing Guide: https://github.com/3leaps/oss-policies/blob/main/CONTRIBUTING.md

## Status

**Version**: 0.2.9 (SemVer: MAJOR.MINOR.PATCH)

Active development. Core schemas, standards, and helper library contracts stabilized. Go module relocated to repository root for standard external installation (v0.1.4). Adopted Semantic Versioning for Go module compatibility (v0.2.0). Signal handling module (v0.2.5) establishes SSOT for graceful shutdown, Ctrl+C handling, and cross-platform signal semantics. Platform introspection API (v0.2.6) enables runtime signal support detection. Metrics taxonomy (v0.2.7) provides 26 standardized metrics with namespace governance and automated version synchronization. CDRL template standard system (v0.2.8) provides comprehensive customization framework. Forge standards enhanced (v0.2.9) with real implementation feedback, Enterprise Three-Layer Config renamed for clarity, cross-language Crucible documentation access patterns established, L'Orage Central DevSecOps schemas Wave 4 complete (Recipe + Runbooks), microtool repository category added, and repository naming standard published. Progressive logging, Foundry catalog patterns, and docscribe module ready for ecosystem integration.

---

---

<div align="center">

⚡ **Start Fast. Thrive on Scale.** ⚡

_Standards forge for the FulmenHQ ecosystem_

<br><br>

**Built with ⚡ by the 3 Leaps team**  
**Part of the [Fulmen Ecosystem](https://fulmenhq.dev) - Lightning-fast enterprise development**

**Initial Release** • **Schema Standards** • **Single Source of Truth**

</div>
