# Crucible

**Blueprints for Scale**

<div align="center">

🔥 **The standards forge for the FulmenHQ ecosystem** 🔥

_Single source of truth for schemas, standards, templates, and quality enforcement_

[![Go Tests](https://github.com/fulmenhq/crucible/workflows/Test%20Go/badge.svg)](https://github.com/fulmenhq/crucible/actions)
[![TypeScript Tests](https://github.com/fulmenhq/crucible/workflows/Test%20TypeScript/badge.svg)](https://github.com/fulmenhq/crucible/actions)
[![Schema Validation](https://github.com/fulmenhq/crucible/workflows/Validate%20Schemas/badge.svg)](https://github.com/fulmenhq/crucible/actions)

</div>

---

## What is Crucible?

**Crucible** is where the patterns, standards, and schemas that enable massive scale are refined, tested, and proven. Just as a crucible uses heat and pressure to purify materials, this repository refines development practices through rigorous validation and real-world usage.

### The Forge in the Fulmen Ecosystem

```
Fulmen Ecosystem
├── Crucible - Where quality blueprints are forged ⚡
│   ├── Schemas - Data contracts
│   ├── Standards - Coding practices
│   ├── Templates - Project patterns
│   └── Documentation - Living specifications
├── Libraries - Shared implementations
│   ├── gofulmen - Go foundation libraries
│   ├── tsfulmen - TypeScript foundation libraries
│   └── {lang}fulmen - Additional language support
├── Tools - Developer utilities
│   ├── goneat - Code quality and formatting
│   ├── fulward - Infrastructure protection
│   └── pathfinder - Safe file discovery
└── Fulmens - Project templates
    ├── fulmen-cockpit - Control plane template
    └── fulmen-runner-forge - Execution template
```

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

**Full Integration Guide**: See [docs/guides/integration-guide.md](docs/guides/integration-guide.md)

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

### Standards & Documentation

- **Coding Standards** (`docs/standards/coding/`)
  - Go coding practices
  - TypeScript coding practices

- **Repository Standards** (`docs/standards/`)
  - Frontmatter standard for documentation
  - Repository versioning (SemVer and CalVer)
  - Error handling patterns
  - Configuration standardization
  - Agentic attribution

- **SOPs** (`docs/sop/`)
  - Repository structure requirements
  - Version adoption process

- **Guides** (`docs/guides/`)
  - Integration guide (production + development)
  - Sync strategy (pull scripts vs packages)

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

Native libraries for Go and TypeScript:

- **Go**: `import "github.com/fulmenhq/crucible"`
- **TypeScript**: `import { ... } from '@fulmenhq/crucible'`

**Features**:

- Embedded schemas (no runtime dependencies)
- Type-safe APIs
- Comprehensive tests
- Zero-config usage

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
├── schemas/          # Version-controlled schemas
│   ├── terminal/
│   ├── policy/
│   └── config/
├── docs/            # Shared documentation
│   ├── standards/
│   ├── architecture/
│   └── guides/
├── templates/       # Project templates
│   ├── go-cli-tool/
│   ├── go-library/
│   └── typescript-library/
├── lang/           # Language wrappers
│   ├── go/
│   └── typescript/
└── scripts/        # Utilities
```

### Pseudo-Monorepo Strategy

Crucible intentionally sits between a classic mono-repo and a pure package registry:

- **Single Source, Many Consumers** – `schemas/`, `docs/`, and `templates/` live once at the root so every language wrapper and downstream repo syncs from the same truth.
- **Language Facades in `lang/`** – `lang/go` and `lang/typescript` mirror the root assets so we can publish idiomatic packages without duplicating maintenance logic elsewhere.
- **Automation Keeps Them in Sync** – `bun run scripts/sync-to-lang.ts` and `bun run scripts/update-version.ts` guarantee the facades stay current before every release.
- **Dual Distribution Options** – Consumers pick the published packages (`github.com/fulmenhq/crucible`, `@fulmenhq/crucible`) for runtime use or the pull script (`scripts/pull/crucible-pull.ts`) when they need vendored files.
- **Versioned Like a Mono-Repo** – The root `VERSION` file (CalVer) drives every artifact, so release coordination stays simple even though the repo fans out into multiple packages.

When in doubt, treat the root directories as authoritative and regenerate the language wrappers with the provided scripts instead of editing under `lang/` directly.

## Projects Using Crucible

- **[goneat](https://github.com/fulmenhq/goneat)** - Format/lint tool
- **[fulward](https://github.com/fulmenhq/fulward)** - Infrastructure protection
- **[gofulmen](https://github.com/fulmenhq/gofulmen)** - Shared Go libraries

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

Crucible uses a hybrid license model:

- Code (language wrappers and automation) is MIT-licensed.
- Schemas, registries, documentation, and templates are dedicated to the public domain under CC0 1.0.

See `LICENSE` for details and https://github.com/3leaps/oss-policies for the 3 Leaps open-source policies that govern contributions and usage.

## Status

Bootstrap phase. Schemas and standards under active development for FulmenHQ ecosystem integration.

---

---

<div align="center">

🔥 **Blueprints for Scale** 🔥

_Standards forge for the FulmenHQ ecosystem_

<br><br>

**Built with ⚡ by the 3 Leaps team** **Part of the [Fulmen Ecosystem](https://fulmenhq.dev) -
Lightning-fast enterprise development**

**Bootstrap Release** • **Schema Standards** • **Single Source of Truth**

</div>
