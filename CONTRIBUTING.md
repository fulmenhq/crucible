# Contributing to Crucible

Welcome! We're glad you're interested in contributing to Crucible, the standards forge for the FulmenHQ ecosystem.

## How to Contribute

### Reporting Issues

- Use GitHub Issues to report bugs or request features
- Provide detailed steps to reproduce bugs
- Include your environment (OS, Go version, Node version, etc.)

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `go test ./lang/go/...` and `npm test` in `lang/typescript/`
5. Commit with conventional commits: `git commit -m "feat: add new terminal config"`
6. Push to your fork
7. Create a Pull Request

### Code Standards

- Follow the coding standards in `docs/standards/`
- Add tests for new functionality
- Update documentation as needed
- Ensure CI/CD passes

### Adding Schemas

- Schemas go in `schemas/` with versioning
- Include JSON Schema validation
- Add examples and documentation
- Update language wrappers

### Adding Templates

- Templates go in `templates/`
- Include all necessary files
- Document usage in README
- Test the template works

## Versioning

This repository uses **Calendar Versioning (CalVer)** with format `YYYY.0M.MICRO`.

See [Repository Versioning Standard](docs/standards/repository-versioning.md) for details.

**Single source of truth**: `VERSION` file in repository root.

Before tagging a release, copy `RELEASE_CHECKLIST.md` into the release PR/issue and complete every item. The template reflects the minimum quality gates for Crucible.

### Version Management

```bash
# Current version
cat VERSION

# Bump version (use appropriate scripts when implemented)
# For now, manually edit VERSION file and update git tags
```

## Prerequisites

**Required for all contributors:**

- [Bun](https://bun.sh) >= 1.2.0 - Cross-platform JavaScript runtime and toolkit

Bun is required for running internal scripts (sync, build, etc.) and ensures consistent behavior across Windows, macOS, and Linux.

**Install Bun:**

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Language-specific tools:**

- Go >= 1.21 (for Go package development)
- Node.js or Bun (for TypeScript package development)

## Development Setup

### Sync Assets

Before working with language wrappers, sync root assets:

```bash
# Sync schemas and docs to lang/go/ and lang/typescript/
bun run sync:to-lang

# Or use make
make sync-to-lang
```

### Maintainer Checklist

When preparing a PR that changes shared assets or publishing a release, run through this quick checklist:

1. **Author in the root** – edit `schemas/`, `docs/`, `templates/` directly (never modify `lang/` copies by hand).
2. **Sync wrappers** – `bun run sync:to-lang` to mirror root assets into `lang/go` and `lang/typescript`.
3. **Align versions** – `bun run version:update` so `lang/*` exports match the CalVer in the root `VERSION` file.
4. **Run tests** – `bun run test:go` and `bun run test:ts` to ensure both language packages still pass.
5. **Document changes** – update relevant docs (schema READMEs, standards) and note updates in changelog/release notes.

### Go Development

```bash
cd lang/go
go mod tidy
go test -v
```

### TypeScript Development

```bash
cd lang/typescript
bun install
bun run build
bun test
```

## Commit Convention

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
