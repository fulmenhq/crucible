BIN_DIR := $(CURDIR)/bin
TOOLS_MANIFEST := .goneat/tools.yaml
VERSION_FILE := VERSION

# Crucible Makefile
# Standards forge for the FulmenHQ ecosystem

.PHONY: help bootstrap tools sync test build build-all clean version fmt fmt-check lint lint-fix typecheck
.PHONY: sync-schemas sync-to-lang generate-snapshots test-go test-ts test-python test-rust build-python build-rust lint-python lint-rust fmt-rust
.PHONY: version-set version-propagate version-bump-major version-bump-minor version-bump-patch
.PHONY: release-check release-build release-prepare prepush precommit check-all
.PHONY: validate-schemas verify-codegen codegen-exit-codes codegen-fulpack codegen-fulpack-python codegen-fulencode codegen-all

# Default target
all: sync-schemas

# Help target
help: ## Show this help message
	@echo "Crucible - Available Make Targets"
	@echo ""
	@grep -E '^[a-zA-Z_:-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""

bootstrap: ## Install required external tools declared in $(TOOLS_MANIFEST)
	@bun run scripts/bootstrap-tools.ts --install --manifest $(TOOLS_MANIFEST)

tools: ## Verify external tooling is available (no-op if none declared)
	@bun run scripts/bootstrap-tools.ts --verify --manifest $(TOOLS_MANIFEST)

# Sync targets
sync: sync-to-lang ## Alias for sync-to-lang (most common sync operation)

sync-schemas: ## Fetch curated JSON Schema meta-schemas (network required)
	@bun run scripts/sync-schemas.ts

generate-snapshots: ## Generate JSON snapshots from YAML catalogs (exit codes, etc.)
	@bun run scripts/generate-exit-code-snapshots.ts

sync-to-lang: ## Sync schemas and docs to Go and TypeScript packages (includes snapshot generation)
	@bun run scripts/sync-to-lang.ts

# Test targets
test: ## Run all language wrapper tests (matches GitHub Actions)
	@echo "Running Go tests..."
	@go test ./...
	@echo ""
	@echo "Running TypeScript tests..."
	@cd lang/typescript && bun run test
	@echo ""
	@echo "Running Python tests..."
	@cd lang/python && uv run pytest
	@echo ""
	@echo "Running Rust tests..."
	@cd lang/rust && cargo test

test-go: ## Run Go wrapper tests (matches GitHub Actions)
	@go test ./...

test-ts: ## Run TypeScript wrapper tests (matches GitHub Actions)
	@cd lang/typescript && bun run test

test-python: ## Run Python wrapper tests (matches GitHub Actions)
	@cd lang/python && uv run pytest

test-rust: ## Run Rust crate tests (matches GitHub Actions)
	@cd lang/rust && cargo test

# Build targets
build: sync-to-lang fmt build-go build-ts build-python build-rust ## Build language wrappers (matches GitHub Actions)
	@echo "✅ Language wrappers built"

build-go: ## Build Go wrapper (matches GitHub Actions)
	@go build ./...

build-ts: ## Build TypeScript wrapper (matches GitHub Actions)
	@cd lang/typescript && bun run build

build-python: ## Build Python wrapper (matches GitHub Actions)
	@cd lang/python && uv sync

build-rust: ## Build Rust crate (matches GitHub Actions)
	@cd lang/rust && cargo build

# Format, Lint, Typecheck targets
# Note: fmt depends on sync-to-lang having run (via build target order) to format synced files in lang/ directories
fmt: | bootstrap ## Format code files (Go/markdown/YAML via goneat, TypeScript via biome, Python via ruff, Rust via rustfmt)
	@$(BIN_DIR)/goneat format
	@cd lang/typescript && bun run format >/dev/null
	@cd lang/python && uv run ruff format . >/dev/null 2>&1 || true
	@cd lang/rust && cargo fmt >/dev/null 2>&1 || true

fmt-rust: ## Format Rust code (matches GitHub Actions)
	@cd lang/rust && cargo fmt

fmt-check: | bootstrap ## Check if files are formatted without modifying
	@$(BIN_DIR)/goneat format --check --verbose

lint: | bootstrap ## Run linting (check only, no auto-fix - use 'make lint-fix' to auto-fix)
	@echo "Linting TypeScript/JavaScript files..."
	@cd lang/typescript && bun run lint
	@echo ""
	@echo "Linting Python files..."
	@cd lang/python && uv run ruff check .
	@echo ""
	@echo "Linting Rust files..."
	@cd lang/rust && cargo clippy -- -D warnings
	@echo ""
	@echo "Running goneat assessment (Go, YAML, schemas)..."
	@$(BIN_DIR)/goneat assess --categories format,security --check --include "**/*.go"
	@$(BIN_DIR)/goneat assess --categories format --check --exclude "lang/**" --exclude "**/*.go"

lint-fix: | bootstrap ## Run linting with auto-fix (Python only - TypeScript uses biome via fmt)
	@echo "Auto-fixing Python linting issues..."
	@cd lang/python && uv run ruff check --fix .

lint-python: ## Lint Python code (matches GitHub Actions)
	@cd lang/python && uv run ruff check .

lint-rust: ## Lint Rust code (matches GitHub Actions)
	@cd lang/rust && cargo clippy -- -D warnings

typecheck: ## Type-check TypeScript files
	@echo "Type-checking TypeScript files..."
	@bunx tsc --noEmit
	@echo "✅ TypeScript type-check complete"

# Hook stubs
prepush: precommit ## Run pre-push hooks (depends on precommit for completeness)
	@echo "✅ Pre-push checks passed"

precommit: check-all ## Run pre-commit hooks (check-all + build)
	@echo "✅ Pre-commit checks passed"

check-all: validate-schemas verify-codegen build lint test typecheck ## Run all checks (lint, test, typecheck) after ensuring build/sync
	@echo "✅ All checks passed"

# Clean build artifacts
clean: ## Clean any build artifacts
	@echo "Cleaning artifacts..."
	@rm -rf dist/ lang/*/dist/ bin/
	@echo "✅ Clean completed"

validate-schemas: | bootstrap ## Validate all schemas (meta + semantic validation)
	@echo "🔍 Phase 1: Meta-validating all .schema.json files..."
	@bun run scripts/validate-all-schemas.ts
	@echo ""
	@echo "🔍 Phase 2: Semantic validation of data files..."
	@bun run scripts/validate-schemas.ts
	@bun run scripts/validate-taxonomy-version.ts
	@bun run scripts/validate-module-registry.ts

verify-codegen: ## Verify generated code is up-to-date with catalog
	@bun run scripts/codegen/verify-exit-codes.ts
	@bun run scripts/codegen/verify-fulpack-types.ts
	@bun run scripts/codegen/verify-fulencode-types.ts

# Code generation targets
codegen-exit-codes: ## Generate exit codes for all languages
	@echo "Generating exit codes..."
	@bun run scripts/codegen/generate-exit-codes.ts --all --format
	@echo "✅ Exit codes generated"

codegen-fulpack: ## Generate fulpack types for all languages
	@echo "Generating fulpack types..."
	@bun run scripts/codegen/generate-fulpack-types.ts --all --format
	@echo "✅ Fulpack types generated"

codegen-fulpack-python: ## Generate fulpack types for Python only
	@echo "Generating fulpack types for Python..."
	@bun run scripts/codegen/generate-fulpack-types.ts --lang python --format
	@echo "✅ Fulpack types generated (Python)"

codegen-fulencode: ## Generate fulencode types for all languages
	@echo "Generating fulencode types..."
	@bun run scripts/codegen/generate-fulencode-types.ts --all --format
	@echo "✅ Fulencode types generated"

codegen-fulhash: ## Generate fulhash types for all languages
	@echo "Generating fulhash types..."
	@bun run scripts/codegen/generate-fulhash-types.ts --all --format
	@echo "✅ Fulhash types generated"

codegen-all: codegen-exit-codes codegen-fulpack codegen-fulencode codegen-fulhash ## Regenerate all generated code
	@echo "✅ All code generation complete"

# Version management
version: ## Print current repository version
	@cat $(VERSION_FILE)

version-set: | bootstrap ## Update VERSION and propagate to package.json (usage: make version-set VERSION=2025.11.0)
ifndef VERSION
	$(error VERSION is required. Usage: make version-set VERSION=2025.11.0)
endif
	@$(BIN_DIR)/goneat version set $(VERSION)
	@$(MAKE) version-propagate
	@echo "✅ Version set to $(VERSION) and propagated"

version-propagate: | bootstrap ## Propagate VERSION to package managers (package.json, etc.)
	@$(BIN_DIR)/goneat version propagate
	@bun run scripts/update-version.ts
	@echo "✅ Version propagated to package managers and taxonomy"

version-bump-major: | bootstrap ## Bump major version (CalVer year.month)
	@$(BIN_DIR)/goneat version bump major
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (major) and propagated"

version-bump-minor: | bootstrap ## Bump minor version (CalVer patch within month)
	@$(BIN_DIR)/goneat version bump minor
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (minor) and propagated"

version-bump-patch: | bootstrap ## Bump patch version (CalVer micro within day)
	@$(BIN_DIR)/goneat version bump patch
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (patch) and propagated"

# Release targets
release-check: test ## Validate release readiness (tests, sync, checklist)
	@echo "Checking release readiness..."
	@echo "✅ Tests passed"
	@echo "Checking VERSION file..."
	@test -f $(VERSION_FILE) || (echo "❌ VERSION file missing" && exit 1)
	@echo "✅ VERSION: $$(cat $(VERSION_FILE))"
	@echo "Checking release checklist..."
	@test -f RELEASE_CHECKLIST.md || (echo "❌ RELEASE_CHECKLIST.md missing" && exit 1)
	@echo "✅ Release checklist exists"
	@echo ""
	@echo "✅ Release check complete - ready for release-prepare"

release-build: build-all ## Build release artifacts (wrappers + packages)
	@echo "Building release artifacts..."
	@echo "✅ Release artifacts ready"

release-prepare: sync-to-lang test ## Prepare release (sync, test, ready for tagging)
	@echo "Preparing release..."
	@echo "✅ Assets synced to language wrappers"
	@echo "✅ Tests passed"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Review changes: git diff"
	@echo "  2. Commit: git add . && git commit -m 'chore: prepare release $$(cat $(VERSION_FILE))'"
	@echo "  3. Build artifacts: make release:build"
	@echo "  4. Tag (requires approval): git tag v$$(cat $(VERSION_FILE))"
	@echo "  5. Push (requires approval): git push origin main --tags"
