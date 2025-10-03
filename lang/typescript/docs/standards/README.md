# FulmenHQ Standards

This directory contains the shared standards and practices for all FulmenHQ projects.

## Directory Structure

```
standards/
├── README.md                    # This file
├── agentic-attribution.md       # AI agent contribution standards
├── ai-agents.md                 # Required artifacts for AI collaboration
├── frontmatter-standard.md      # Document metadata format
├── makefile-standard.md         # Required make targets & automation contract
├── observability/               # Logging, metrics, tracing standards
├── config/                      # Configuration discovery standards
├── repository-versioning.md     # Version management strategies
├── schema-normalization.md      # Canonical schema comparison utilities
├── release-checklist-standard.md # Release checklist template + usage guidance
├── makefile-standard.md         # Required make targets & automation contract
└── coding/                      # Language-specific coding standards
    ├── go.md                   # Go coding standards
    └── typescript.md           # TypeScript coding standards
```

## Standards Hierarchy

1. **Repository Standards** - Cross-cutting repository practices
   - [Frontmatter Standard](frontmatter-standard.md) - Document metadata format
   - [Repository Versioning](repository-versioning.md) - SemVer and CalVer strategies
   - [Release Checklist Standard](release-checklist-standard.md) - Shared release playbook template
   - [AI Agent Collaboration Standard](ai-agents.md) - Documentation + identity rules for AI maintainers
   - [Makefile Standard](makefile-standard.md) - Required make targets and automation contract
   - Observability standards (logging, metrics, traces) – see [observability/README.md](observability/README.md)
   - Configuration standards – see [config/README.md](config/README.md)
2. **Agentic Attribution** - How AI agents contribute to projects
3. **Coding Standards** - Language-specific best practices
   - Go standards for all Go projects
   - TypeScript standards for all TypeScript projects

## Contributing to Standards

When adding new standards:

1. Place in appropriate subdirectory
2. Follow existing naming conventions
3. Update this README if adding new categories
4. Ensure cross-references are updated

## Related Documentation

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - General contribution guidelines
- [LICENSE](../../LICENSE) - Licensing information
