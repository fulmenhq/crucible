---
title: "Fulmen Forge Microtool Standard"
description: "Standard structure and capabilities for Fulmen Microtool forges - production-ready templates for ultra-narrow, single-purpose CLI deployment tools"
author: "Schema Cartographer (@schema-cartographer)"
date: "2025-11-15"
last_updated: "2025-11-15"
status: "draft"
tags: ["architecture", "forge", "microtool", "template", "2025.10.2"]
---

# Fulmen Forge Microtool Standard

This document defines the standardized structure and pre-integrated capabilities for Fulmen Microtool forges. Microtool forges provide production-ready templates for ultra-narrow, single-purpose CLI deployment and automation tools (e.g., fixture deployment, config synchronization, asset management) that must remain focused and lightweight. They embody the CDRL philosophy (Clone → Degit → Refit → Launch) and align with the repository category taxonomy (`microtool` key from [repository-categories.yaml](config/taxonomy/repository-categories.yaml)).

Microtools are distinguished from other categories by their **architectural constraints**:

- **Single primary purpose** (if scope grows → promote to `cli` category)
- **No library exports** (no `pkg/` directory, CLI-only interface)
- **Helper library dependency** (SHOULD import gofulmen/tsfulmen/rsfulmen)
- **One-way dependency flow** (microtool → helper → SSOT, prevents circular dependencies)
- **No web server endpoints** (CLI stdin/stdout/stderr only)

Microtool forges use **tool/instrument** themed names to distinguish from workhorse (horse breeds) and codex (documentation) templates.

The canonical list of forge categories and statuses is maintained in the [Repository Category Taxonomy](config/taxonomy/repository-categories.yaml); consult that before proposing new forges or changing lifecycle states.

## Scope

Applies to Microtool-specific forge templates (e.g., `forge-microtool-anvil`, `forge-microtool-chisel`). Microtools MUST remain narrow in scope - a tool that grows beyond single purpose violates the category and must be promoted to `cli`. Forges are not SSOT repos or full applications but starters that integrate Fulmen helper libraries (gofulmen, pyfulmen, tsfulmen) to enforce standards while staying lightweight.

Core philosophy: Ship minimal, focused templates that handle authentication, configuration, logging, and graceful shutdown consistently - then get out of the way for single-purpose logic. No "useful" functionality (no domain-specific code); just standardized foundations for deployment automation.

**CDRL Guide**: Users follow Clone → Degit → Refit → Launch; see `docs/development/fulmen_cdrl_guide.md` for details. During refit, users rename the tool identifier (e.g., `anvil` → `my-deployer`) throughout the codebase.

Implementers MUST comply with ecosystem standards in Crucible's `docs/standards/` (e.g., exit codes, logging conventions, signal handling) to ensure consistency.

## Language Constraints

**REQUIRED**: Microtools MUST be written in **Go, TypeScript/Bun, or Rust only**.

No other languages are permitted. This constraint ensures:

- Helper library availability (gofulmen, tsfulmen, rsfulmen)
- Single-binary compilation capabilities
- Consistent ecosystem tooling

**Helper Library Import**:

- **SHOULD** import helper library (gofulmen, tsfulmen, or rsfulmen)
- **If NOT imported**: MUST NOT recreate any helper functionality
  - Exit codes, logger, signals, config loading must be implemented independently
  - Cannot copy or replicate helper library patterns
  - Must still obey Fulmen standards (exit codes, logging format, signal handling)

**Rationale**: Importing the helper library is the easiest path to compliance. Implementing independently is permitted but requires significantly more work to meet standards.

## Required Library Modules

Microtool forges that import the helper library MUST integrate these modules to ensure ecosystem compliance. All modules are accessed via the language-specific helper library (gofulmen, pyfulmen, tsfulmen) - no direct Crucible dependencies.

**Note**: If a microtool does NOT import the helper library, it must implement equivalent functionality independently while adhering to the same standards.

### Core Identity & Configuration Modules

1. **App Identity Module** (REQUIRED)
   - **Purpose**: Standardized application metadata (binary name, vendor, environment prefix)
   - **Spec**: [App Identity Module](../standards/library/modules/app-identity.md)
   - **Compliance**: MUST implement `.fulmen/app.yaml` with:
     - `binary_name`: Tool name for template (users rename during CDRL refit)
     - `vendor`: Default `fulmenhq` (users customize)
     - `env_prefix`: Environment variable prefix (e.g., `ANVIL_`)
     - `config_name`: Config directory name (usually same as binary_name)
   - **Helper API**: `app_identity.load()` → AppIdentity object
   - **CDRL Workflow**: Users update `.fulmen/app.yaml` FIRST, then run `make validate-app-identity`

2. **Crucible Shim Module** (RECOMMENDED)
   - **Purpose**: Access Crucible SSOT assets (schemas, configs) without direct sync
   - **Spec**: [Crucible Shim](../standards/library/modules/crucible-shim.md)
   - **Compliance**: Use helper's `crucible.GetSchema()`, `crucible.GetConfig()`
   - **When to skip**: If tool has no schema/config dependencies

3. **Three-Layer Config Module** (RECOMMENDED)
   - **Purpose**: Layered configuration (Crucible defaults → User config → Runtime overrides)
   - **Spec**: [Three-Layer Config](../standards/library/modules/three-layer-config.md)
   - **Compliance**:
     - Layer 1: Crucible defaults via helper (if applicable)
     - Layer 2: User config at `~/.config/{vendor}/{app}/config.yaml`
     - Layer 3: Runtime env var/flag overrides
   - **Standard Env Vars** (RECOMMENDED):
     - `{PREFIX}LOG_LEVEL` - Log level (trace|debug|info|warn|error, default: info)
     - `{PREFIX}CONFIG_PATH` - Config file path override
   - **Precedence**: CLI flags → Env vars → Config file → Defaults
   - **When to skip**: Very simple tools with minimal configuration

4. **Config Path API Module** (RECOMMENDED if using config files)
   - **Purpose**: Discover Fulmen config directories
   - **Spec**: [Config Path API](../standards/library/modules/config-path-api.md)
   - **Compliance**: Use `get_app_config_dir({app_name})` from App Identity

### Observability & Resilience Modules

5. **Logging Module** (REQUIRED)
   - **Purpose**: Structured logging with Crucible schema compliance
   - **Spec**: [Observability Logging](../standards/observability/logging.md)
   - **Compliance**:
     - Use SIMPLE or STRUCTURED profile from Crucible logging schemas
     - Tool name from App Identity (`binary_name`)
     - Support `{PREFIX}LOG_LEVEL` env var
     - Output to stderr (not stdout - keep stdout clean for data)
   - **Example**:
     ```go
     log.Info("deploying fixture",
         "fixture_id", fixture.ID,
         "target", target,
         "size_bytes", size,
     )
     ```

6. **Exit Code Module** (REQUIRED)
   - **Purpose**: Standardized exit codes for automation
   - **Spec**: [Exit Code Taxonomy](../standards/exit-codes.md)
   - **Compliance**: Use helper's exit code constants (SUCCESS, CONFIG_ERROR, NETWORK_ERROR, etc.)
   - **Critical**: Microtools are often invoked by CI/CD - consistent exit codes enable proper error handling

7. **Signal Handling Module** (REQUIRED)
   - **Purpose**: Graceful shutdown on SIGTERM/SIGINT
   - **Spec**: [Signal Handling](../standards/library/modules/signals.md)
   - **Compliance**:
     - Trap SIGTERM, SIGINT
     - Clean up resources (close files, network connections)
     - Exit with appropriate code
   - **Example**:

     ```go
     ctx, cancel := signals.WithShutdown(context.Background())
     defer cancel()

     // Use ctx in operations for cancellation
     ```

8. **Error Handling Module** (REQUIRED)
   - **Purpose**: Structured error propagation
   - **Spec**: [Error Handling](../standards/library/modules/error-handling.md)
   - **Compliance**: Wrap errors with context, use exit codes appropriately

### Optional Modules

9. **Telemetry/Metrics Module** (OPTIONAL)
   - **When to use**: If tool runs long enough to benefit from metrics
   - **Typically skip**: Most microtools are short-lived CLI operations

10. **Schema Validation Module** (OPTIONAL)
    - **When to use**: If tool reads/writes structured data
    - **Example**: Fixture manifest validation

## Prohibited Features

Microtools MUST NOT include:

- ❌ **Web server endpoints** (HTTP, gRPC) - use `workhorse` or `service` category instead
- ❌ **Long-running daemons** - use `workhorse` or `service` category instead
- ❌ **Exportable packages** - no `pkg/` directory, cannot be imported by other repos
- ❌ **Multi-purpose functionality** - keep single purpose or promote to `cli`
- ❌ **Recreated helper functionality** - if not importing helper, implement independently

## Directory Structure

**Standard Layout**:

```
fulmen-{toolname}/                    # e.g., fulmen-fixtures
├── .fulmen/
│   └── app.yaml                      # App Identity manifest (REQUIRED)
├── cmd/
│   └── {toolname}/                   # e.g., anvil/
│       ├── main.go                   # Entry point
│       ├── generate.go               # Subcommand: generate
│       ├── deploy.go                 # Subcommand: deploy
│       └── verify.go                 # Subcommand: verify
├── internal/                         # Internal implementation (not exported)
│   ├── config/
│   │   └── config.go                 # Tool-specific config
│   ├── client/
│   │   └── storage.go                # S3/storage client
│   └── generator/
│       └── generator.go              # Core generation logic
├── configs/                          # Default configs, recipes, templates
│   └── example.yaml
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Build, test, lint
│       └── release.yml               # Binary releases
├── Makefile                          # Standard targets (see below)
├── go.mod                            # Dependencies (imports gofulmen)
├── go.sum
├── README.md                         # Usage, CDRL guide
├── LICENSE                           # MIT recommended
└── fulmen_cdrl_guide.md             # CDRL workflow guide (REQUIRED)
```

**Key Points**:

- NO `pkg/` directory - microtools are not libraries
- ALL implementation in `internal/` (not exported)
- CLI commands in `cmd/{toolname}/` with subcommands as separate files
- Configs/recipes in `configs/` or similar (tool-specific)

**TypeScript/Bun Equivalent**:

```
fulmen-{toolname}/
├── .fulmen/app.yaml
├── src/
│   ├── commands/
│   │   ├── generate.ts
│   │   ├── deploy.ts
│   │   └── verify.ts
│   ├── lib/
│   │   ├── config.ts
│   │   ├── client.ts
│   │   └── generator.ts
│   └── index.ts
├── configs/
├── package.json                      # Imports tsfulmen
├── tsconfig.json
├── README.md
├── LICENSE
└── fulmen_cdrl_guide.md
```

## Makefile Standard Targets

**REQUIRED Targets**:

```makefile
# Build
.PHONY: build
build: ## Build binary
	go build -o bin/{toolname} cmd/{toolname}/main.go

# Install locally
.PHONY: install
install: build ## Install to $GOPATH/bin
	go install cmd/{toolname}/main.go

# Test
.PHONY: test
test: ## Run tests
	go test -v ./...

# Lint
.PHONY: lint
lint: ## Run linter
	golangci-lint run

# Format
.PHONY: fmt
fmt: ## Format code
	gofmt -s -w .

# App Identity validation
.PHONY: validate-app-identity
validate-app-identity: ## Validate app identity configuration
	@echo "Checking for hardcoded references to binary name..."
	# Implementation via helper library or script

# Doctor check (CDRL requirement)
.PHONY: doctor
doctor: ## Run health checks
	@echo "Running microtool health checks..."
	@which go || (echo "ERROR: Go not installed" && exit 1)
	@test -f .fulmen/app.yaml || (echo "ERROR: Missing .fulmen/app.yaml" && exit 1)
	@echo "✅ All checks passed"

# Help
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-20s %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
```

## CLI Command Structure

**Pattern**: Single binary with subcommands

```bash
# Tool name = binary name
{toolname} [global-flags] <command> [command-flags] [arguments]

# Examples
fulmen-fixtures generate --recipe recipe.yaml --output ./fixtures/
fulmen-fixtures deploy --recipe recipe.yaml --target s3://bucket/path
fulmen-fixtures verify --recipe recipe.yaml --source https://example.com
```

**Global Flags** (RECOMMENDED):

- `--config` - Config file path
- `--log-level` - Log level override
- `--help` - Show help
- `--version` - Show version

**Output Conventions**:

- **stdout**: Primary data output (machine-readable)
- **stderr**: Logs, diagnostics, progress (human-readable)
- **exit code**: Status (0 = success, non-zero = error)

**Examples**:

```bash
# Good: Data to stdout, logs to stderr
$ anvil generate --recipe r.yaml > output.json
2025-11-15T12:00:00Z INFO: Generating from recipe
2025-11-15T12:00:01Z INFO: Generated 10 items

# Good: Clean exit codes
$ anvil deploy --target invalid://url
2025-11-15T12:00:00Z ERROR: Invalid target URL
$ echo $?
70  # EXIT_CONFIG_ERROR

# Bad: Mixing logs with data on stdout (DON'T DO THIS)
$ anvil generate --recipe r.yaml  # Logs on stdout = unparseable
```

## Dependencies

**Helper Library** (RECOMMENDED):

```go
// go.mod
require (
    github.com/fulmenhq/gofulmen v0.x.x  // Core helper
)
```

**Common Dependencies** (as needed):

- CLI framework: `github.com/spf13/cobra` (Go) or similar
- Config parsing: `gopkg.in/yaml.v3`, `github.com/BurntSushi/toml`
- HTTP client: Standard library or `github.com/aws/aws-sdk-go-v2` (if S3)
- Testing: Standard library test framework

**Prohibited**:

- ❌ Web frameworks (chi, gin, echo, etc.)
- ❌ Heavy ORMs
- ❌ UI libraries (this is CLI only)

## Testing Requirements

**Unit Tests**:

- Test internal logic (generators, parsers, validators)
- Use helper library's test fixtures
- Aim for >70% coverage

**Integration Tests**:

- Test against real endpoints when possible (S3-compatible storage, etc.)
- Use environment variables for credentials (not hardcoded)
- Mark as integration tests (can skip in CI if credentials unavailable)

**CLI Tests**:

- Test command invocation
- Verify exit codes
- Check stdout/stderr output

**Example** (Go):

```go
func TestGenerateCommand(t *testing.T) {
    cmd := NewGenerateCmd()
    cmd.SetArgs([]string{"--recipe", "testdata/recipe.yaml"})

    err := cmd.Execute()
    if err != nil {
        t.Fatalf("command failed: %v", err)
    }

    // Verify output
}
```

## CDRL Workflow

**Clone → Degit → Refit → Launch**:

1. **Clone**: User clones template

   ```bash
   git clone https://github.com/fulmenhq/forge-microtool-anvil.git my-deployer
   cd my-deployer
   ```

2. **Degit**: Remove template git history

   ```bash
   rm -rf .git
   git init
   ```

3. **Refit**: Customize for their use case

   ```bash
   # Update .fulmen/app.yaml
   vim .fulmen/app.yaml  # Change binary_name, vendor, etc.

   # Validate and find hardcoded references
   make validate-app-identity

   # Rename tool throughout codebase (manual or script-assisted)
   # anvil → my-deployer
   ```

4. **Launch**: Build and use
   ```bash
   make build
   make install
   my-deployer --help
   ```

**Template Responsibilities**:

- Provide `fulmen_cdrl_guide.md` with specific refit instructions
- Use App Identity for binary name parameterization
- Make refit process as smooth as possible

## Naming Conventions

**Template Naming**: `forge-microtool-{instrument}`

**Language-Matching Pattern**: First letter of instrument matches implementation language for human readability.

**Go (G-instruments)**:

- `grinder` - Heavy processing tool
- `gauge` - Measurement/validation tool
- `gouge` - Data extraction tool

**TypeScript (T-instruments)**:

- `tongs` - Data handling tool
- `tap` - Threading/integration tool
- `trammel` - Precision layout tool

**Rust (R-instruments)**:

- `rasp` - File processing tool
- `reamer` - Data refinement tool
- `router` - Path/routing tool

**Avoid**:

- Horse breeds (reserved for workhorse category)
- Generic names (tool, util, helper)
- Instruments not matching language first letter

## Security Considerations

**Credentials**:

- NEVER hardcode credentials
- Use environment variables or config files
- Document credential sources in README
- Support multiple cloud providers (AWS, Azure, GCP, etc.) via configuration

**Input Validation**:

- Validate all user inputs
- Sanitize file paths (prevent traversal)
- Validate URLs/endpoints
- Use schemas where applicable

**Network Operations**:

- Use TLS/HTTPS by default
- Validate certificates
- Timeout all operations (no infinite hangs)
- Handle network errors gracefully

## Documentation Requirements

**README.md** (REQUIRED):

- Tool purpose (one sentence)
- Installation instructions
- Usage examples
- Configuration options
- Credential setup
- CDRL guide reference

**fulmen_cdrl_guide.md** (REQUIRED):

- Step-by-step refit instructions
- What to rename (binary name, imports, etc.)
- How to validate changes
- Common pitfalls

**Command Help** (REQUIRED):

- Every command has `--help`
- Show examples
- Document flags clearly

**godoc / JSDoc** (RECOMMENDED):

- Document exported functions (even in internal/)
- Explain non-obvious logic
- Link to Crucible specs where applicable

## Release & Distribution

**Binary Releases**:

- GitHub Releases with artifacts
- Multiple platforms: Linux (amd64, arm64), macOS (amd64, arm64), Windows (amd64)
- Checksums provided (SHA256)

**Package Managers** (OPTIONAL):

- Homebrew tap (macOS/Linux)
- Scoop bucket (Windows)
- Docker image (if applicable)

**Versioning**:

- Semantic versioning (v1.2.3)
- Tag releases in git
- Maintain CHANGELOG.md

## Examples

**Reference Implementations**:

- `fulmen-fixtures` - Fixture deployment and generation (first microtool)

**Coming Soon**:

- `forge-microtool-anvil` - Template based on fulmen-fixtures

## Graduation Criteria

If a microtool grows beyond single purpose, it must be promoted:

**Indicators**:

- Multiple unrelated features added
- Becomes multi-purpose tool
- Scope creep beyond original purpose

**Action**:

- Promote to `cli` category
- Update repository-categories.yaml
- May require architectural review
- Notify maintainers

**Example**: If `fulmen-fixtures` adds schema validation, code generation, and docs building → too broad, promote to `cli`

## Compliance Checklist

- [ ] Written in Go, TypeScript/Bun, or Rust only
- [ ] Single primary purpose documented
- [ ] Imports helper library (gofulmen/tsfulmen/rsfulmen) OR implements standards independently
- [ ] Uses exit codes from helper (or compliant implementation)
- [ ] Structured logging to stderr
- [ ] Graceful signal handling (SIGTERM, SIGINT)
- [ ] App Identity implemented (`.fulmen/app.yaml`)
- [ ] NO `pkg/` directory (not a library)
- [ ] NO web server endpoints
- [ ] Makefile with standard targets
- [ ] CDRL guide (`fulmen_cdrl_guide.md`)
- [ ] Help text for all commands
- [ ] README with usage examples
- [ ] Tests (unit + integration)

## See Also

- [Repository Category Taxonomy](../../config/taxonomy/repository-categories.yaml)
- [Fulmen Template CDRL Standard](fulmen-template-cdrl-standard.md)
- [App Identity Module](../standards/library/modules/app-identity.md)
- [Exit Code Taxonomy](../standards/exit-codes.md)
- [Observability Logging](../standards/observability/logging.md)
- [Signal Handling](../standards/library/modules/signals.md)

---

**Document Status**: Draft
**Last Updated**: 2025-11-15
**Maintained By**: Schema Cartographer
**Approval Required From**: EA Steward, Crucible Maintainers
