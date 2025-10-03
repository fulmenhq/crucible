---
title: "FulmenHQ Document Frontmatter Standard"
description: "Required frontmatter format for documentation files across FulmenHQ repositories"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "approved"
tags: ["standards", "documentation", "metadata"]
---

# Document Frontmatter Standard

## Overview

This standard defines the required frontmatter format for all documentation files across FulmenHQ repositories. Frontmatter provides structured metadata that enables automated processing, search, and organization of documentation.

## Required Frontmatter Fields

All documentation files MUST include frontmatter using YAML format with the following required fields:

```yaml
---
title: "Document Title"
description: "Brief description of the document's purpose and scope"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "draft"
tags: ["tag1", "tag2", "tag3"]
---
```

## Field Definitions

### Required Fields

- **title** (string): The document title, used for navigation and indexing
- **description** (string): Brief description (1-2 sentences) explaining the document's purpose
- **author** (string): Author name or handle (e.g., "Dave Thompson" or "@3leapsdave")
- **date** (string): Creation date in ISO 8601 format (YYYY-MM-DD)
- **last_updated** (string): Last modification date in ISO 8601 format (YYYY-MM-DD)
- **status** (enum): Document status - one of: `draft`, `review`, `approved`, `deprecated`
- **tags** (array): Array of relevant tags for categorization and search

### Optional Fields

- **reviewers** (array): List of reviewers for collaborative documents
- **related_docs** (array): Links to related documentation
- **version** (string): Document version for versioned content
- **category** (string): Document category (e.g., "standards", "schemas", "architecture")
- **revision** (integer): Revision number for tracking changes (useful for schemas)

## Examples

### Standard Document

```yaml
---
title: "Repository Versioning Standard"
description: "Standards for version management across FulmenHQ repositories"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "approved"
tags: ["standards", "versioning", "semver", "calver"]
---
```

### Schema Document

```yaml
---
title: "Terminal Schema v1.0.0"
description: "JSON Schema for terminal configuration overrides"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "approved"
version: "v1.0.0"
revision: 1
tags: ["schemas", "terminal", "validation"]
---
```

### Collaborative Document

```yaml
---
title: "API Design Guidelines"
description: "Best practices for designing REST and GraphQL APIs in FulmenHQ"
author: "@3leapsdave"
date: "2025-10-02"
last_updated: "2025-10-02"
status: "review"
reviewers: ["@forge-warden", "@code-scout"]
tags: ["standards", "api", "rest", "graphql"]
---
```

## Implementation Guidelines

### File Naming

- Use kebab-case for filenames: `document-title.md`
- Include version in filename if needed: `schema-reference-v1.0.0.md`
- Store in appropriate directory: `docs/standards/`, `docs/architecture/`, etc.

### Validation

- Frontmatter must be valid YAML
- All required fields must be present
- Dates must follow ISO 8601 format (YYYY-MM-DD)
- Status must be one of: `draft`, `review`, `approved`, `deprecated`
- Tags should be lowercase with hyphens

### Document Lifecycle

**Status progression:**

1. `draft` - Initial creation, work in progress
2. `review` - Ready for review, reviewers assigned
3. `approved` - Reviewed and approved for use
4. `deprecated` - No longer current, replaced by newer version

### Revision Tracking

For schemas and frequently updated documents:

- Increment `revision` for content changes
- Update `last_updated` date
- Keep `version` stable unless breaking changes occur
- Document changes in adjacent CHANGELOG or revision history

### Tooling Integration

Frontmatter enables:

- Automated documentation generation
- Search and indexing systems
- Status tracking dashboards
- Cross-repository documentation discovery
- Revision history tracking

## Repository-Specific Extensions

Individual repositories MAY add optional fields specific to their needs:

```yaml
---
# Required fields...
schema_version: "v1.0.0"
schema_type: "json-schema-draft-2020-12"
related_schemas: ["terminal-catalog.yaml"]
---
```

Extended fields should be documented in the repository's `CONTRIBUTING.md`.

## Related Standards

- [Repository Versioning Standard](repository-versioning.md) - Version management approaches
- [Agentic Attribution Standard](agentic-attribution.md) - AI agent contribution standards
- [Repository Version Adoption SOP](../sop/repository-version-adoption.md) - Mandatory version strategy

---

**Status**: Approved  
**Last Updated**: 2025-10-02  
**Author**: @3leapsdave
