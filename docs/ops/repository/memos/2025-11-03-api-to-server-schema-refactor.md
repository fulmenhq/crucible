# API to Protocol Schema Refactor - November 3, 2025

## Context

During v0.2.3 development, we introduced server management schemas (`schemas/server/management/`) alongside existing HTTP response schemas (`schemas/api/http/`). This created a naming inconsistency and missed the opportunity to establish a protocol-centric namespace for message contracts.

## Issue

**Taxonomy confusion**:

1. `schemas/api/http/` suggested generic API contracts (client or server unclear)
2. `schemas/server/management/` clearly indicated server-specific configuration
3. Reality: HTTP schemas define **message contracts** used by both client and server
4. Templates implement both servers (Workhorse Groningen) and clients (future SDK templates)
5. Need neutral namespace that doesn't imply ownership by either client or server

**Future-proofing concern**:

- Client-side templates will send requests and expect conformant responses
- "API" is ambiguous (client API? server API?)
- "Server" implies server-owned, but clients also need these contracts
- Need protocol-centric model: defines **what goes over the wire**

## Decision

Refactor `schemas/api/http/` → `schemas/protocol/http/` to establish protocol-centric domain model:

- `schemas/protocol/http/` - HTTP message contracts (request + response schemas, neutral ownership)
- `schemas/server/management/` - Server lifecycle configuration (server-owned operational concerns)
- `schemas/client/` - Reserved for SDK concerns (retry logic, auth helpers, client-side mocks - future)

**Rationale**:

- **Protocol-centric**: Neither client nor server "owns" the HTTP contract, it's the wire format both must honor
- **Request + Response**: Future additions will include request schemas alongside responses (e.g., POST body schemas)
- **Multi-protocol extensibility**: Pattern works for gRPC, WebSocket, GraphQL, etc.
- **Clear separation**: Server management is operational (ports, health checks), protocol is contractual (messages)

## Why No Schema Version Bump

**Pre-launch timing**: v0.2.3 not yet released, zero external consumers:

- No published releases referencing `api/http` schemas
- Workhorse Groningen: Uncommitted code, easy to update imports
- Forge Codex Pulsar: Uncommitted code, easy to update imports
- Helper libraries: Will sync via `make sync`, no manual updates needed

**Schema content unchanged**: Only paths and `$id` URLs modified, not structure or validation rules. Bumping versions would:

- Imply breaking schema changes (there are none)
- Create duplicate v1.0.0 and v1.0.1 with identical content
- Confuse consumers: "What changed?" → "Nothing, just paths"

**Standard practice**: Schema versioning is for content changes, not administrative reorganization. Renaming files before public release is the right time to fix taxonomy.

## Changes Made

### File Moves

```bash
git mv schemas/api schemas/protocol
git mv examples/api examples/protocol
```

**Result**:

- `schemas/protocol/http/v1.0.0/` - HTTP message contract schemas
- `examples/protocol/http/v1.0.0/` - Example HTTP messages

### Schema $id URL Updates

Updated `$id` field in all HTTP schemas:

**Before**:

```json
{
  "$id": "https://schemas.fulmenhq.dev/api/http/v1.0.0/health-response.schema.json",
  ...
}
```

**After**:

```json
{
  "$id": "https://schemas.fulmenhq.dev/protocol/http/v1.0.0/health-response.schema.json",
  ...
}
```

**Schemas updated**:

- health-response.schema.json
- version-response.schema.json
- success-response.schema.json
- error-response.schema.json

### Documentation Updates

**Moved**:

- `docs/standards/api/` → `docs/standards/protocol/`
- `http-rest-standards.md` updated with protocol-centric language
- `grpc-standards.md` (placeholder) now in protocol/ namespace

**Updated references**:

- `docs/architecture/fulmen-server-management.md` - Schema references
- `docs/standards/library/modules/server-management.md` - Schema references
- `docs/standards/protocol/http-rest-standards.md` - Internal schema paths, added future endpoints
- All documentation references updated from `api/http` to `protocol/http`

### Validation Scripts

Updated `scripts/validate-schemas.ts`:

- Path updates from `examples/api/http/` → `examples/protocol/http/`
- No logic changes, only path strings

### Language Wrapper Sync

Ran `make sync` to propagate changes:

- `lang/typescript/schemas/protocol/http/` created
- `lang/python/schemas/protocol/http/` created
- `lang/go/` embeds directly from root (automatic via `//go:embed`)

## Impact Analysis

### Breaking Changes for External Consumers

**None**: v0.2.3 not yet released. No published versions contained `api/http` schemas.

### Changes for Internal Consumers

**Workhorse Groningen** (uncommitted):

- Update imports from `@fulmenhq/tsfulmen/schemas/api/http/` → `@fulmenhq/tsfulmen/schemas/protocol/http/`
- Zero consumers exist yet, easy coordination

**Forge Codex Pulsar** (uncommitted):

- Update schema references in documentation
- Update validation scripts if they hardcoded `api/http` paths

**Helper Libraries** (gofulmen, tsfulmen, pyfulmen):

- Sync via `make sync` propagates changes automatically
- Go embeds directly from Crucible root (no action needed)
- TypeScript/Python wrappers receive updated `protocol/http/` schemas

## Rollback Plan

If issues discovered (unlikely):

1. Revert commit with schema moves
2. Revert commit with $id updates
3. Re-run `make sync`
4. Notify workhorse teams of reversion

**Low risk**: No external consumers, workhorse implementations uncommitted.

## Future Extensibility

This refactor enables clear future expansion:

**Protocol namespace** (message contracts):

- `schemas/protocol/http/` - HTTP request + response schemas
- `schemas/protocol/grpc/` - gRPC service definitions (future)
- `schemas/protocol/websocket/` - WebSocket message schemas (future)
- `schemas/protocol/graphql/` - GraphQL schema definitions (future)

**Server namespace** (operational concerns):

- `schemas/server/management/` - Lifecycle configuration
- `schemas/server/deployment/` - Deployment manifests (future)

**Client namespace** (SDK concerns, future):

- `schemas/client/retry/` - Retry policy configuration
- `schemas/client/auth/` - Client-side auth helpers
- `schemas/client/mocks/` - Test fixture schemas

Protocol-centric model clarifies: protocol = wire format, server = how to run it, client = how to call it.

## Related Documentation

- **Feature Brief**: `.plans/active/v0.2.3/api-to-protocol-schema-refactor.md`
- **Architecture**: `docs/architecture/fulmen-server-management.md`
- **Module Spec**: `docs/standards/library/modules/server-management.md`
- **HTTP Standards**: `docs/standards/protocol/http-rest-standards.md`

## Lessons Learned

1. **Early refactoring wins**: Fixing taxonomy before external adoption prevents breaking changes later
2. **Protocol-centric model**: Separating wire format (protocol) from operational concerns (server, client) clarifies intent
3. **Future-proofing**: Considering both client and server needs now prevents awkward refactors later
4. **Version bump discipline**: Schema versioning is for content changes, not administrative reorganization

---

**Status**: Completed in v0.2.3
**Impact**: Zero breaking changes (pre-launch refactor)
**Maintainer**: Schema Cartographer
**Approved By**: @3leapsdave
