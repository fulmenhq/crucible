BIN_DIR := $(CURDIR)/bin
TOOLS_MANIFEST := .goneat/tools.yaml
VERSION_FILE := VERSION

# Crucible Makefile
# Standards forge for the FulmenHQ ecosystem

.PHONY: help bootstrap tools sync test build build-all clean version fmt fmt-check lint typecheck
.PHONY: sync-schemas sync-to-lang test-go test-ts test-python build-python lint-python
.PHONY: version-set version-propagate version-bump-major version-bump-minor version-bump-patch
.PHONY: release-check release-build release-prepare prepush precommit check-all
.PHONY: validate-schemas

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

sync-to-lang: ## Sync schemas and docs to Go and TypeScript packages
	@bun run scripts/sync-to-lang.ts

# Test targets
test: ## Run all language wrapper tests (matches GitHub Actions)
	@echo "Running Go tests..."
	@cd lang/go && go test ./...
	@echo ""
	@echo "Running TypeScript tests..."
	@cd lang/typescript && bun run test
	@echo ""
	@echo "Running Python tests..."
	@cd lang/python && uv run pytest

test-go: ## Run Go wrapper tests (matches GitHub Actions)
	@cd lang/go && go test ./...

test-ts: ## Run TypeScript wrapper tests (matches GitHub Actions)
	@cd lang/typescript && bun run test

test-python: ## Run Python wrapper tests (matches GitHub Actions)
	@cd lang/python && uv run pytest

# Build targets
build: fmt sync-to-lang build-go build-ts build-python ## Build language wrappers (matches GitHub Actions)
	@echo "✅ Language wrappers built"

build-go: ## Build Go wrapper (matches GitHub Actions)
	@cd lang/go && go build ./...

build-ts: ## Build TypeScript wrapper (matches GitHub Actions)
	@cd lang/typescript && bun run build

build-python: ## Build Python wrapper (matches GitHub Actions)
	@cd lang/python && uv sync

# Format, Lint, Typecheck targets
fmt: ## Format code files using goneat and Biome
	@$(BIN_DIR)/goneat format --verbose
	@cd lang/typescript && bun run format >/dev/null

fmt-check: ## Check if files are formatted without modifying
	@$(BIN_DIR)/goneat format --check --verbose

lint: ## Run linting (matches GitHub Actions)
	@echo "Linting TypeScript/JavaScript files..."
	@cd lang/typescript && bun run lint
	@echo ""
	@echo "Linting Python files..."
	@cd lang/python && uv run ruff check .
	@echo ""
	@echo "Running goneat assessment (Go, YAML, schemas)..."
	@cd lang/go && $(BIN_DIR)/goneat assess --categories format,security --check
	@$(BIN_DIR)/goneat assess --categories format --check --exclude "lang/**" --exclude "**/*.go"

lint-python: ## Lint Python code (matches GitHub Actions)
	@cd lang/python && uv run ruff check .

typecheck: ## Type-check TypeScript files
	@echo "Type-checking TypeScript files..."
	@bunx tsc --noEmit
	@echo "✅ TypeScript type-check complete"

# Hook stubs
prepush: check-all ## Run pre-push hooks (check-all + build)
	@echo "✅ Pre-push checks passed"

precommit: check-all ## Run pre-commit hooks (check-all + build)
	@echo "✅ Pre-commit checks passed"

check-all: validate-schemas build lint test typecheck ## Run all checks (lint, test, typecheck) after ensuring build/sync
	@echo "✅ All checks passed"

# Clean build artifacts
clean: ## Clean any build artifacts
	@echo "Cleaning artifacts..."
	@rm -rf dist/ lang/*/dist/ .plans/ bin/
	@echo "✅ Clean completed"

validate-schemas: ## Validate taxonomy registries and logging schema changes
	@bun run scripts/validate-schemas.ts

# Version management
version: ## Print current repository version
	@cat $(VERSION_FILE)

version-set: ## Update VERSION and propagate to package.json (usage: make version-set VERSION=2025.11.0)
ifndef VERSION
	$(error VERSION is required. Usage: make version-set VERSION=2025.11.0)
endif
	@$(BIN_DIR)/goneat version set $(VERSION)
	@$(MAKE) version-propagate
	@echo "✅ Version set to $(VERSION) and propagated"

version-propagate: ## Propagate VERSION to package managers (package.json, etc.)
	@$(BIN_DIR)/goneat version propagate
	@echo "✅ Version propagated to package managers"

version-bump-major: ## Bump major version (CalVer year.month)
	@$(BIN_DIR)/goneat version bump major
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (major) and propagated"

version-bump-minor: ## Bump minor version (CalVer patch within month)
	@$(BIN_DIR)/goneat version bump minor
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (minor) and propagated"

version-bump-patch: ## Bump patch version (CalVer micro within day)
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
