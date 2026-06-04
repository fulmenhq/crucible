BIN_DIR := $(CURDIR)/bin
TOOLS_MANIFEST := .goneat/tools.yaml
VERSION_FILE := VERSION

# External tooling bootstrap
# NOTE: `goneat` is expected to be installed globally (user-space) via `sfetch --install`.
# If you need to use a repo-local build for development, invoke targets with:
#   make <target> GONEAT=./bin/goneat
GONEAT ?= goneat
GONEAT_VERSION ?= v0.5.12
SFETCH_INSTALL_URL ?= https://github.com/3leaps/sfetch/releases/latest/download/install-sfetch.sh

# Crucible Makefile
# Standards forge for the FulmenHQ ecosystem

.PHONY: all help bootstrap tools sync test build build-all clean version fmt fmt-check lint lint-fix lint-config upstream-validate upstream-sync-3leaps upstream-check typecheck
.PHONY: sync-schemas sync-to-lang generate-snapshots test-go test-ts test-python test-rust build-python build-rust lint-python lint-rust fmt-rust
.PHONY: version-set version-propagate version-bump-major version-bump-minor version-bump-patch
.PHONY: release-check release-build release-prepare release-clean
.PHONY: release-guard-tag-version release-tag release-verify-tag release-verify-remote-tag release-publish-assets
.PHONY: lint-check pr-final pr-final-drift-check
.PHONY: prepush precommit check-all
.PHONY: validate-schemas verify-codegen codegen-exit-codes codegen-fulpack codegen-fulpack-python codegen-fulencode codegen-roles codegen-all

# Default target
all: sync-schemas

# Help target
help: ## Show this help message
	@echo "Crucible - Available Make Targets"
	@echo ""
	@grep -E '^[a-zA-Z_:-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""

bootstrap: ## Install required external tools (sfetch, goneat, and manifest tools)
	@echo "Installing external tools..."
	@mkdir -p "$(BIN_DIR)"
	@if ! command -v sfetch >/dev/null 2>&1; then echo "→ Installing sfetch (trust anchor)..."; if command -v curl >/dev/null 2>&1; then curl -sSfL "$(SFETCH_INSTALL_URL)" | bash -s -- --yes; elif command -v wget >/dev/null 2>&1; then wget -qO- "$(SFETCH_INSTALL_URL)" | bash -s -- --yes; else echo "❌ curl or wget is required to bootstrap sfetch"; exit 1; fi; fi
	@if ! command -v goneat >/dev/null 2>&1; then echo "→ Installing goneat ($(GONEAT_VERSION)) via sfetch..."; if [ "$(GONEAT_VERSION)" = "latest" ]; then sfetch --repo fulmenhq/goneat --latest --install; else sfetch --repo fulmenhq/goneat --tag "$(GONEAT_VERSION)" --install; fi; fi
	@bun run scripts/bootstrap-tools.ts --install --manifest $(TOOLS_MANIFEST)

tools: ## Verify external tooling is available
	@if ! command -v sfetch >/dev/null 2>&1; then echo "❌ sfetch not found. Run 'make bootstrap' first."; exit 1; fi
	@if ! command -v goneat >/dev/null 2>&1; then echo "❌ goneat not found. Run 'make bootstrap' first."; exit 1; fi
	@bun run scripts/bootstrap-tools.ts --verify --manifest $(TOOLS_MANIFEST)
	@echo "✅ All tools verified"

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
	@$(MAKE) test-go
	@$(MAKE) test-ts
	@$(MAKE) test-python
	@$(MAKE) test-rust

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
	@$(GONEAT) format
	@cd lang/typescript && bun run format >/dev/null
	@cd lang/python && uv run ruff format . >/dev/null 2>&1 || true
	@cd lang/rust && cargo fmt >/dev/null 2>&1 || true

fmt-rust: ## Format Rust code (matches GitHub Actions)
	@cd lang/rust && cargo fmt

fmt-check: | bootstrap ## Check if files are formatted without modifying
	@$(GONEAT) format --check --verbose

lint: | bootstrap ## Run linting (check only, no auto-fix - use 'make lint-fix' to auto-fix)
	@cd lang/typescript && bun run lint
	@cd lang/python && uv run ruff check .
	@cd lang/rust && cargo clippy -- -D warnings
	@$(GONEAT) assess --categories format,security --check --include "**/*.go"
	@$(GONEAT) assess --categories format --check --exclude "lang/**" --exclude "**/*.go"

lint-check: | bootstrap ## Non-mutating format+lint check via goneat for CI prep (no auto-fix, no mutation)
	@$(GONEAT) assess --categories format,lint --check

lint-fix: | bootstrap ## Run linting with auto-fix (Python only - TypeScript uses biome via fmt)
	@echo "Auto-fixing Python linting issues..."
	@cd lang/python && uv run ruff check --fix .

lint-python: ## Lint Python code (matches GitHub Actions)
	@cd lang/python && uv run ruff check .

lint-rust: ## Lint Rust code (matches GitHub Actions)
	@cd lang/rust && cargo clippy -- -D warnings

lint-config: ## Validate config data files against schemas (excludes upstream/)
	@echo "Validating config data files..."
	@if command -v $(GONEAT) >/dev/null 2>&1; then \
		for f in config/agentic/roles/*.yaml; do \
			[ -f "$$f" ] || continue; \
			echo "  Validating $$f..."; \
			$(GONEAT) validate data --schema-file schemas/upstream/3leaps/crucible/schemas/agentic/v0/role-prompt.schema.json --data "$$f" || exit 1; \
		done; \
		echo "✅ Config validation complete"; \
	else \
		echo "⚠️  goneat not found, skipping config validation"; \
	fi

upstream-validate: ## Validate vendored upstream files (bypasses .goneatignore)
	@echo "Validating vendored upstream files..."
	@if command -v $(GONEAT) >/dev/null 2>&1; then \
		echo "  Validating vendored schemas against meta-schemas..."; \
		$(GONEAT) validate schemas/upstream/ --force-include "schemas/upstream/**/*.schema.json" || exit 1; \
		echo "✅ Upstream validation complete"; \
	else \
		echo "⚠️  goneat not found, skipping upstream validation"; \
	fi

upstream-sync-3leaps: ## Sync from 3leaps/crucible and check for issues
	@echo "Syncing from 3leaps/crucible..."
	@echo "NOTE: This syncs FROM the upstream 3leaps/crucible repo (not this repo)"
	@echo "      Vendored content will be placed in schemas/upstream/3leaps/crucible/"
	@bun run scripts/3leaps-crucible-upstream-pull.ts
	@echo "Checking upstream content for format/lint issues..."
	@$(MAKE) upstream-check
	@echo "✅ Upstream sync complete - review changes with: git diff schemas/upstream/"

upstream-check: ## Check upstream content for format/lint issues (no auto-fix)
	@echo "Checking upstream content (format + lint)..."
	@if command -v $(GONEAT) >/dev/null 2>&1; then \
		$(GONEAT) assess schemas/upstream/ --check --categories format,lint \
			--force-include "schemas/upstream/**" || \
		(echo "❌ Upstream content has format/lint issues - fix at source"; exit 1); \
		echo "✅ Upstream content passes format/lint checks"; \
	else \
		echo "⚠️  goneat not found, skipping upstream check"; \
	fi

typecheck: ## Type-check TypeScript files
	@echo "Type-checking TypeScript files..."
	@bunx tsc --noEmit
	@echo "✅ TypeScript type-check complete"

# Hook stubs
prepush: precommit ## Run pre-push hooks (depends on precommit for completeness)
	@echo "✅ Pre-push checks passed"

# PR-flow successor to prepush. Runs a non-mutating goneat check first, then the
# full prep, then a drift guard that fails if prep left any tracked-file changes
# uncommitted. (prepush/precommit predate the PR model — built for the microteam
# direct-commit era.) Note: uses lint-check (goneat assess --check) rather than
# fmt-check (goneat format --check), which currently false-positives on a couple
# of YAML files even when `goneat format` is idempotent on them.
pr-final: lint-check prepush pr-final-drift-check ## Final PR validation (non-mutating check + full prep + drift guard)
	@echo "✅ PR final validation passed!"

pr-final-drift-check: ## Verify PR-final validation left tracked files unchanged (catches uncommitted formatting/sync drift)
	@if ! git diff --quiet || ! git diff --cached --quiet; then \
		echo "❌ Tracked-file drift after validation. Run 'make fmt' and commit (or commit synced files) before pr-final:"; \
		git diff --name-only; git diff --cached --name-only; \
		exit 1; \
	fi
	@echo "✅ No tracked-file drift"

precommit: sync-to-lang check-all ## Run pre-commit hooks (sync + check-all)
	@echo "✅ Pre-commit checks passed"

check-all: validate-schemas lint-config verify-codegen build lint test typecheck ## Run all checks (lint, test, typecheck) after ensuring build/sync
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
	@bun run scripts/codegen/verify-role-types.ts

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

codegen-roles: ## Generate Rust role catalog types from config/agentic/roles/*.yaml
	@echo "Generating role types..."
	@bun run scripts/codegen/generate-role-types.ts --format
	@echo "✅ Role types generated"

codegen-all: codegen-exit-codes codegen-fulpack codegen-fulencode codegen-fulhash codegen-roles ## Regenerate all generated code
	@echo "✅ All code generation complete"

# Version management
version: ## Print current repository version
	@cat $(VERSION_FILE)

version-set: | bootstrap ## Update VERSION and propagate to package.json (usage: make version-set VERSION=0.2.26)
ifndef VERSION
	$(error VERSION is required. Usage: make version-set VERSION=0.2.26)
endif
	@$(GONEAT) version set $(VERSION)
	@$(MAKE) version-propagate
	@echo "✅ Version set to $(VERSION) and propagated"

version-propagate: | bootstrap ## Propagate VERSION to package managers (package.json, etc.)
	@$(GONEAT) version propagate
	@bun run scripts/update-version.ts
	@echo "✅ Version propagated to package managers and taxonomy"

version-bump-major: | bootstrap ## Bump major version (SemVer)
	@$(GONEAT) version bump major
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (major) and propagated"

version-bump-minor: | bootstrap ## Bump minor version (SemVer)
	@$(GONEAT) version bump minor
	@$(MAKE) version-propagate
	@echo "✅ Version bumped (minor) and propagated"

version-bump-patch: | bootstrap ## Bump patch version (SemVer)
	@$(GONEAT) version bump patch
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
	@echo "  3. Build artifacts: make release-build"
	@echo "  4. Tag (requires approval): make release-tag"
	@echo "  5. Verify tag: make release-verify-tag"
	@echo "  6. Push (requires approval): git push origin main && git push origin v$$(cat $(VERSION_FILE))"

release-clean: ## Remove local release artifacts (dist/release)
	@echo "Cleaning release artifacts..."
	@rm -rf dist/release
	@echo "✅ Release artifacts removed"

release-guard-tag-version: ## Guard: ensure tag matches VERSION (CI-friendly)
	@./scripts/release-guard-tag-version.sh

release-tag: ## Create and verify a signed git tag for VERSION (optional minisign attestation)
	@./scripts/release-tag.sh

release-verify-tag: ## Verify the signed git tag for VERSION (optional minisign attestation)
	@./scripts/release-verify-tag.sh

release-verify-remote-tag: ## Verify tag signature status via GitHub API (gh required)
	@./scripts/release-verify-remote-tag.sh

release-publish-assets: ## Publish GitHub Release assets (minisign attestations) for the current tag (gh required)
	@./scripts/release-publish-assets.sh
