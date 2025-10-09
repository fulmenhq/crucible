# Crucible Python Wrapper

Python-native access to FulmenHQ standards and schemas.

## Installation

```bash
pip install fulmenhq-crucible
```

Or with `uv`:

```bash
uv add fulmenhq-crucible
```

## Requirements

- Python 3.12 or later
- PyYAML 6.0.1+

## Usage

### Loading Schemas

```python
from crucible import get_schema, list_schemas

schema = get_schema("terminal", "v1.0.0", "schema.json")
print(schema["$schema"])

schemas = list_schemas("pathfinder", "v1.0.0")
for name in schemas:
    print(f"  - {name}")
```

### Terminal Configuration

```python
from crucible import get_terminal_config, load_terminal_catalog

config = get_terminal_config("iTerm2")
print(f"Terminal: {config['name']}")
print(f"Overrides: {config['overrides']}")

catalog = load_terminal_catalog()
print(f"Loaded {len(catalog)} terminal configs")
```

### Version Information

```python
from crucible import __version__

print(f"Crucible version: {__version__}")
```

## API Reference

### Schemas

- `get_schema(category: str, version: str, name: str) -> dict[str, Any]` - Load specific schema
- `list_schemas(category: str, version: str) -> list[str]` - List available schemas in category/version

### Terminal Configuration

- `load_terminal_catalog() -> dict[str, Any]` - Load all terminal configurations
- `get_terminal_config(name: str) -> dict[str, Any]` - Get specific terminal config by name

### Schema Validation

Schema validation is provided by the `goneat` binary, not this Python package. Use:

```bash
goneat schema validate-schema schemas/terminal/v1.0.0/schema.json
```

Or via Makefile from repository root:

```bash
make validate-schemas
```

## Development

This package uses `uv` for dependency management.

### Setup

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone repository and sync schemas
cd crucible
make sync-to-lang

# Install dependencies
cd lang/python
uv sync
```

### Running Tests

```bash
# From lang/python/
uv run pytest

# From repository root
make test-python
```

### Linting

```bash
# From lang/python/
uv run ruff check .

# From repository root
make lint-python
```

### Building

```bash
# From lang/python/
uv build

# From repository root
make build-python
```

## Package Structure

```
lang/python/
├── src/crucible/        # Package source
│   ├── __init__.py      # Public API
│   ├── schemas.py       # Schema loading
│   ├── terminal.py      # Terminal config
│   └── py.typed         # PEP 561 marker
├── tests/               # Test suite
├── schemas/             # Embedded schemas (synced)
├── config/              # Embedded configs (synced)
├── docs/                # Embedded docs (synced)
├── pyproject.toml       # Package metadata
├── ruff.toml            # Linting config
└── .python-version      # Python version pin
```

## Status

MVP implementation complete. PyPI publishing and CI/CD automation deferred pending approval.

## License

MIT License - See repository root LICENSE file.

## Links

- Repository: https://github.com/fulmenhq/crucible
- Issues: https://github.com/fulmenhq/crucible/issues
- FulmenHQ: https://github.com/fulmenhq
