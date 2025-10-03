# Crucible TypeScript Wrapper

TypeScript-native access to FulmenHQ standards and schemas.

## Installation

```bash
npm install @fulmenhq/crucible
```

## Usage

```typescript
import {
  loadTerminalCatalog,
  getTerminalConfig,
  getTerminalSchema,
} from "@fulmenhq/crucible";

const catalog = loadTerminalCatalog();
console.log(`Loaded ${catalog.size} terminal configs`);

const config = getTerminalConfig("iTerm2");
console.log(`Terminal: ${config?.name}`);

const schema = getTerminalSchema();
console.log("Schema loaded:", typeof schema);
```

## API

- `loadTerminalCatalog()` - Load all terminal configurations
- `getTerminalConfig(name)` - Get specific terminal config
- `getTerminalSchema()` - Get terminal schema
- `VERSION` - Current package version

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Status

Bootstrap implementation. Full schema embedding and additional APIs coming soon.
