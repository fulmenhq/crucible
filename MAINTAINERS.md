# Crucible – Maintainers

**Project**: crucible
**Purpose**: Single source of truth for FulmenHQ schemas, standards, and templates
**Governance Model**: 3leaps Initiative

## Human Maintainers

| Name          | GitHub                                       | Email                    | Role            |
| ------------- | -------------------------------------------- | ------------------------ | --------------- |
| Dave Thompson | [@3leapsdave](https://github.com/3leapsdave) | dave.thompson@3leaps.net | Lead maintainer |

### @3leapsdave (Dave Thompson)

- **Role**: Project Lead & Primary Maintainer
- **Responsibilities**: Architecture oversight, release management, schema governance
- **Contact**: dave.thompson@3leaps.net | GitHub [@3leapsdave](https://github.com/3leapsdave) | X [@3leapsdave](https://x.com/3leapsdave)
- **Supervision**: All AI agent contributions

## Autonomous Agents

_None configured. This repository uses supervised mode only._

## AI-Assisted Development

This repository uses AI assistants in **supervised mode**. See [AGENTS.md](AGENTS.md) for operating model and role configuration.

All AI contributions must:

- Be reviewed by a human maintainer before commit
- Include proper attribution trailers (see [Git Commit Attribution](docs/catalog/agentic/attribution/git-commit.md))
- Pass quality gates (`make precommit`)
- Specify the role being operated as (`Role:` trailer)

## Governance Structure

- Human maintainers approve architecture, releases, and supervise AI agents.
- AI assistants execute tasks under supervision with explicit role context.
- See `REPOSITORY_SAFETY_PROTOCOLS.md` for guardrails and escalation paths.
- See [Agent Attribution Standard](docs/standards/agentic-attribution.md) for commit attribution requirements.
