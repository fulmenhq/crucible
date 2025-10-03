# Crucible Go Wrapper

Go-native access to FulmenHQ standards and schemas.

## Installation

```bash
go get github.com/fulmenhq/crucible@latest
```

## Usage

```go
import "github.com/fulmenhq/crucible"

// Load terminal catalog
catalog, err := crucible.LoadTerminalCatalog()
if err != nil {
    panic(err)
}

// Get specific terminal config
config, err := crucible.GetTerminalConfig("iTerm2")
if err != nil {
    panic(err)
}

fmt.Printf("Terminal: %s\n", config.Name)
```

## API

- `LoadTerminalCatalog()` - Load all terminal configurations
- `GetTerminalConfig(name)` - Get specific terminal config
- `Version` - Current crucible version

## Status

Bootstrap implementation. Full embedding and additional schema support coming soon.
