# Crucible Rust Bindings

Generated Rust types and constants from the FulmenHQ Crucible SSOT repository.

## Overview

This crate (`crucible-codegen`) provides Rust bindings for Crucible's standardized types:

- **Exit Codes** - Standardized CLI exit codes with Display and Error implementations
- **Fulpack Types** - Archive format types and structures
- **Fulencode Types** - Encoding format types
- **Fulhash Types** - Hash algorithm types

## Installation

### From Git

```toml
[dependencies]
crucible-codegen = { git = "https://github.com/fulmenhq/crucible", path = "lang/rust" }
```

### From crates.io (Future)

```toml
[dependencies]
crucible-codegen = "0.1"
```

## Usage

```rust
use crucible_codegen::foundry::ExitCode;

fn main() {
    match run() {
        Ok(()) => std::process::exit(ExitCode::Success.code()),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(ExitCode::GeneralError.code());
        }
    }
}
```

## MSRV Policy

Minimum Supported Rust Version: **1.70**

This crate uses only stable Rust features and avoids nightly-only functionality.

## Development

### Prerequisites

- Rust 1.70+ (via rustup)
- The `rustfmt` and `clippy` components

### Building

```bash
cd lang/rust
cargo build
```

### Testing

```bash
cargo test
```

### Linting

```bash
cargo clippy -- -D warnings
```

### Formatting

```bash
cargo fmt
```

## Architecture

This crate follows the Crucible sync pattern (see [ADR-0013](../../docs/architecture/decisions/ADR-0013-rust-sync-pattern-validation.md)):

- Source catalogs live at repository root (`config/library/foundry/`)
- Assets are synced to `lang/rust/{schemas,config,docs}/` via `make sync`
- Codegen produces Rust modules in `src/foundry/`
- Generated code includes `serde` derives for serialization

### Directory Structure

```
lang/rust/
├── Cargo.toml           # Crate manifest
├── rust-toolchain.toml  # MSRV pinning
├── src/
│   ├── lib.rs           # Crate root
│   └── foundry/
│       ├── mod.rs       # Foundry module
│       └── *.rs         # Generated modules (exit_codes, etc.)
├── tests/               # Integration tests
├── schemas/             # Synced from root (SSOT)
├── config/              # Synced from root (SSOT)
└── docs/                # Synced from root (SSOT, excluding ops/)
```

## Generation

Types in this crate are generated from YAML catalogs. Do not edit generated files directly.

To regenerate after catalog changes:

```bash
# From repository root
make sync           # Sync assets to lang/rust/
make codegen        # Regenerate Rust modules
make fmt-rust       # Format generated code
```

## Related

- [rsfulmen](https://github.com/fulmenhq/rsfulmen) - Rust helper library (consumes this crate)
- [Crucible](https://github.com/fulmenhq/crucible) - SSOT repository
- [ADR-0013](../../docs/architecture/decisions/ADR-0013-rust-sync-pattern-validation.md) - Sync pattern decision

## License

MIT - See [LICENSE](../../LICENSE) in repository root.
