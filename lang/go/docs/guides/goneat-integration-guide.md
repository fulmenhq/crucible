---
title: "Goneat Integration Guide"
description: "Adding Goneat release automation to your Fulmen library"
author: "Pipeline Architect"
author_of_record: "Dave Thompson (https://github.com/3leapsdave)"
supervised_by: "@3leapsdave"
date: "2025-10-08"
last_updated: "2025-10-08"
status: "draft"
tags: ["goneat", "releases", "automation", "dx"]
---

# Goneat Integration Guide

This guide explains how to integrate Goneat into your Fulmen library for automated release management, changelog generation, and version coordination.

**Prerequisites:** You should already have completed initial repository bootstrap (see [Fulmen Library Bootstrap Guide](fulmen-library-bootstrap-guide.md)) with FulDX for version management and SSOT syncing.

**When to add Goneat:** After initial development when you're ready for:

- Automated release workflows
- Changelog generation from commits
- Release checklist enforcement
- Cross-repository version coordination
- Production release automation

## Installation Methods

### Method 1: Go Install (For Go Repositories with Circular Dependencies Only)

**Use this method ONLY for repositories where Goneat depends on them:**

- `gofulmen` - Goneat imports it (circular dependency)
- Other core libraries that Goneat depends on (rare)

```bash
# Install latest Goneat globally
go install github.com/fulmenhq/goneat@latest

# Verify installation
goneat --version
```

**Note:** This installs Goneat globally to `$GOPATH/bin` (typically `~/go/bin`). Ensure this is in your PATH.

**Advantages:**

- Simple, standard Go tooling
- Always pulls latest version
- Works offline after initial install

**Disadvantages:**

- Global installation (not per-repository)
- Not version-pinned per-repository
- Only for Go projects with circular dependencies

**For most repositories**, use [Method 2: FulDX Tools Management](#method-2-fuldx-tools-management) instead for better repository isolation and version control.

### Method 2: FulDX Tools Management (Recommended)

**For most repositories - Python, TypeScript, and non-circular-dependency Go projects:**

This method uses FulDX to download and manage Goneat as a binary tool, providing repository-local installation and version pinning.

#### Step 1: Add Goneat to FulDX Tools Manifest

Create or update `.crucible/tools.yaml`:

```yaml
version: v1.0.0
binDir: ./bin
tools:
  - id: goneat
    version: latest # or pin to specific version: v0.5.0
    install:
      type: github-release
      repo: fulmenhq/goneat
      asset: goneat-{{os}}-{{arch}}
      checksums:
        # Optional: Add checksums for verification
        darwin-arm64: "sha256:abc123..."
        linux-x86_64: "sha256:def456..."
```

**Note:** The `type: github-release` feature is planned for FulDX v0.2.0 (Q1 2026). Currently, you can use `type: link` for local development:

```yaml
# Current workaround for local development
version: v1.0.0
binDir: ./bin
tools:
  - id: goneat
    install:
      type: link
      source: /path/to/goneat/binary
      binName: goneat
      destination: ./bin
```

#### Step 2: Install via FulDX

```bash
# Install all tools (including Goneat)
./bin/fuldx tools install

# Or via Makefile
make tools
```

#### Step 3: Add Makefile Targets

Update your `Makefile`:

```makefile
.PHONY: tools
tools: bin/fuldx
	@echo "Installing tools from .crucible/tools.yaml..."
	@./bin/fuldx tools install
	@echo "✓ Tools installed"

# Helper to ensure Goneat is available
# Note: Path depends on installation method:
#   - Method 1 (go install): Use 'goneat' directly (in PATH)
#   - Method 2 (FulDX): Use './bin/goneat' (repo-local)
.PHONY: goneat
goneat: tools
	@echo "Goneat ready: $(shell ./bin/goneat --version)"
```

**Advantages:**

- Repository-local installation (in `./bin/`)
- Version pinning per-repository
- Works for non-Go projects (Python, TypeScript, etc.)
- Supports local override via `.crucible/tools.local.yaml`

**Disadvantages:**

- Requires FulDX bootstrap first
- More configuration files to manage
- Planned feature (not fully implemented yet)

### Method 3: Package Managers (Future)

**Planned for future releases:**

```bash
# macOS
brew install fulmenhq/tap/goneat

# Windows
scoop install goneat

# Python projects
pip install goneat

# Node.js projects
npm install -g goneat
```

**Status:** Roadmap items for Goneat v1.0.0+

## Configuration

### Step 1: Create Goneat Config

Create `.goneat/config.yaml`:

```yaml
version: 1.0
project:
  name: pyfulmen
  type: library # library, service, cli, template
  language: python # python, go, typescript

versioning:
  scheme: semver # semver or calver
  sync:
    - file: VERSION
      format: plain
    - file: pyproject.toml
      format: toml
      path: project.version
    # Add more files as needed

releases:
  changelog:
    enabled: true
    format: keepachangelog # or conventional-commits
    output: CHANGELOG.md

  checklist:
    enabled: true
    template: .goneat/release-checklist.md

  automation:
    tag_prefix: v
    create_release: true
    publish_artifacts: false # Set true for CLI tools

integrations:
  crucible:
    enabled: true
    sync_before_release: true

  github:
    enabled: true
    create_release: true
```

### Step 2: Create Release Checklist Template

Create `.goneat/release-checklist.md`:

```markdown
# Release Checklist: {{version}}

## Pre-Release

- [ ] All tests passing (`make test`)
- [ ] Linting clean (`make lint`)
- [ ] CHANGELOG.md updated
- [ ] VERSION file updated
- [ ] Documentation updated
- [ ] Breaking changes documented (if any)

## Release

- [ ] Git tag created (`v{{version}}`)
- [ ] GitHub release created
- [ ] Artifacts published (if applicable)

## Post-Release

- [ ] Package published (PyPI/npm/crates.io)
- [ ] Documentation site updated
- [ ] Announcement posted (if major release)

## Notes

{{notes}}
```

### Step 3: Update Makefile

Add Goneat targets to your `Makefile`:

```makefile
# Goneat path - adjust based on installation method
# Method 1 (go install): GONEAT=goneat
# Method 2 (FulDX): GONEAT=./bin/goneat
GONEAT ?= ./bin/goneat

.PHONY: release-prep
release-prep: goneat
	@echo "Preparing release with Goneat..."
	@$(GONEAT) release prep
	@echo "✓ Release prepared"

.PHONY: release-major
release-major: goneat
	@$(GONEAT) release create --type major

.PHONY: release-minor
release-minor: goneat
	@$(GONEAT) release create --type minor

.PHONY: release-patch
release-patch: goneat
	@$(GONEAT) release create --type patch

.PHONY: release-check
release-check: goneat
	@$(GONEAT) release check
```

**Note:** The `GONEAT` variable defaults to `./bin/goneat` (Method 2). If using Method 1 (go install), override with `GONEAT=goneat make release-patch`.

## Usage Workflows

### Preparing a Release

```bash
# 1. Sync latest Crucible assets
make sync-crucible

# 2. Run pre-release checks
make release-check

# 3. Prepare release (updates CHANGELOG, runs checks)
make release-prep

# 4. Create release (bumps version, creates tag)
make release-patch  # or release-minor, release-major

# 5. Push to GitHub
git push origin main --tags
```

### Release Types

**Patch Release (0.1.0 → 0.1.1):**

- Bug fixes
- Documentation updates
- Minor improvements

```bash
make release-patch
```

**Minor Release (0.1.1 → 0.2.0):**

- New features (backwards compatible)
- Deprecations
- Significant improvements

```bash
make release-minor
```

**Major Release (0.2.0 → 1.0.0):**

- Breaking changes
- Major architectural changes
- API redesigns

```bash
make release-major
```

### Checking Release Status

```bash
# Check if ready for release
goneat release check

# View release history
goneat release list

# Show current version
goneat version show
```

## Integration with FulDX

Goneat and FulDX work together:

**FulDX responsibilities:**

- SSOT syncing (Crucible schemas/docs)
- Tool installation (including Goneat itself)
- Version management basics

**Goneat responsibilities:**

- Release automation and orchestration
- Changelog generation
- Release checklist enforcement
- Cross-repository coordination

**Typical workflow:**

```bash
# 1. Bootstrap with FulDX
make bootstrap

# 2. Install Goneat via FulDX
make tools

# 3. Develop features...
# 4. Use Goneat for releases
make release-minor
```

## Avoiding Circular Dependencies

### Problem: Goneat Depends on Gofulmen

If you're developing `gofulmen` (which Goneat imports), you can't use `go install github.com/fulmenhq/goneat@latest` because:

```
goneat → depends on → gofulmen (your repo)
```

### Solution: Use FulDX Tools Management

```yaml
# gofulmen/.crucible/tools.yaml
version: v1.0.0
binDir: ./bin
tools:
  - id: goneat
    install:
      type: link
      source: /Users/you/dev/fulmenhq/goneat/dist/goneat
      binName: goneat
      destination: ./bin
```

Or use `.crucible/tools.local.yaml` for local development:

```yaml
# gofulmen/.crucible/tools.local.yaml (gitignored)
version: v1.0.0
tools:
  - id: goneat
    install:
      type: link
      source: ../goneat/dist/goneat
```

This way, `gofulmen` uses a local Goneat binary instead of trying to install via `go install`.

## Language-Specific Considerations

### Python Projects

**pyproject.toml integration:**

```yaml
# .goneat/config.yaml
versioning:
  sync:
    - file: VERSION
    - file: pyproject.toml
      format: toml
      path: project.version
```

**Publishing to PyPI:**

```yaml
# .goneat/config.yaml
releases:
  automation:
    publish_artifacts: true
    publish_commands:
      - command: python -m build
      - command: twine upload dist/*
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${PYPI_TOKEN}
```

### Go Projects

**go.mod version tagging:**

```yaml
# .goneat/config.yaml
versioning:
  sync:
    - file: VERSION
    # Go modules use git tags, no file sync needed
```

**Publishing:**

Go modules are published via git tags automatically. No additional publish step needed.

### TypeScript Projects

**package.json integration:**

```yaml
# .goneat/config.yaml
versioning:
  sync:
    - file: VERSION
    - file: package.json
      format: json
      path: version
```

**Publishing to npm:**

```yaml
# .goneat/config.yaml
releases:
  automation:
    publish_artifacts: true
    publish_commands:
      - command: bun run build
      - command: npm publish
        env:
          NPM_TOKEN: ${NPM_TOKEN}
```

## Best Practices

### Version Management

- Use **SemVer** for libraries (0.1.0, 1.0.0, etc.)
- Use **CalVer** for applications/tools (2025.10.0)
- Keep VERSION file as single source of truth
- Let Goneat sync versions across files

### Release Cadence

- **Patch releases**: As needed for bug fixes (weekly)
- **Minor releases**: Monthly or when features accumulate
- **Major releases**: Quarterly or for breaking changes

### Changelog Management

- Use conventional commits for automatic changelog generation
- Manual edits to CHANGELOG.md are preserved by Goneat
- Review generated changelog before releasing

### Cross-Repository Coordination

When releasing libraries that others depend on:

1. **Release library first** (e.g., gofulmen)
2. **Update dependents** (e.g., goneat updates its go.mod)
3. **Release dependents** after verifying compatibility

Goneat can automate this with dependency graphs (future feature).

## Troubleshooting

### Goneat Not Found

```bash
# Check installation
which goneat
goneat --version

# Go install method:
echo $GOPATH
ls $GOPATH/bin/goneat

# FulDX method:
./bin/goneat --version
ls -la bin/
```

### Version Sync Issues

```bash
# Check config
goneat config show

# Manual version sync
goneat version sync

# Verify all files updated
git diff VERSION pyproject.toml package.json
```

### Circular Dependency Errors

If `go install github.com/fulmenhq/goneat@latest` fails:

```
error: import cycle not allowed
```

Use FulDX tools management instead (see [Method 2](#method-2-fuldx-tools-management)).

### Release Checklist Failures

```bash
# See what's failing
goneat release check

# Override checks (emergency only)
goneat release create --force

# View checklist template
cat .goneat/release-checklist.md
```

## Migration from Manual Releases

If you're currently releasing manually:

1. **Add Goneat config** (`.goneat/config.yaml`)
2. **Keep existing CHANGELOG.md** (Goneat will append to it)
3. **First release with Goneat**:
   ```bash
   goneat release prep --first
   goneat release create --type patch
   ```
4. **Future releases**: Use `goneat release create` normally

Goneat preserves existing release history.

## Future Features

**Planned for Goneat v1.0+:**

- Automatic dependency graph analysis
- Cross-repo release orchestration
- GitHub Actions integration
- Slack/Discord release notifications
- Homebrew/Scoop package publishing
- PyPI/npm/crates.io automatic publishing
- Release notes AI generation

## See Also

- [Fulmen Library Bootstrap Guide](fulmen-library-bootstrap-guide.md) - Initial repository setup
- [Repository Versioning Standard](../standards/repository-versioning.md) - CalVer vs SemVer
- [Release Checklist Standard](../standards/release-checklist-standard.md) - Checklist templates
- [Goneat Documentation](https://github.com/fulmenhq/goneat) - Goneat CLI reference and usage

---
