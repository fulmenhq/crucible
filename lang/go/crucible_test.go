package crucible

import (
	"testing"
)

func TestVersion(t *testing.T) {
	if Version == "" {
		t.Error("Version should not be empty")
	}
	t.Logf("Crucible version: %s", Version)
}

func TestTerminalSchemaEmbedded(t *testing.T) {
	schema, err := SchemaRegistry.Terminal().V1_0_0()
	if err != nil {
		t.Fatalf("Failed to load terminal schema: %v", err)
	}

	if len(schema) == 0 {
		t.Error("Terminal schema should not be empty")
	}

	t.Logf("Terminal schema loaded: %d bytes", len(schema))
}

func TestTerminalCatalog(t *testing.T) {
	catalogs, err := SchemaRegistry.Terminal().Catalog()
	if err != nil {
		t.Fatalf("Failed to load terminal catalog: %v", err)
	}

	if len(catalogs) == 0 {
		t.Error("Terminal catalog should not be empty")
	}

	t.Logf("Loaded %d terminal catalogs", len(catalogs))

	for name := range catalogs {
		t.Logf("  - %s", name)
	}
}

func TestLoadTerminalCatalog(t *testing.T) {
	catalog, err := LoadTerminalCatalog()
	if err != nil {
		t.Fatalf("Failed to load terminal catalog: %v", err)
	}

	if len(catalog) == 0 {
		t.Error("Should load at least one terminal config")
	}

	for name, config := range catalog {
		t.Logf("Terminal: %s", name)
		if config.Name == "" {
			t.Errorf("Terminal %s has empty name", name)
		}
	}
}

func TestGetTerminalConfig(t *testing.T) {
	config, err := GetTerminalConfig("iTerm2")
	if err != nil {
		t.Fatalf("Failed to get iTerm2 config: %v", err)
	}

	if config.Name != "iTerm2" {
		t.Errorf("Expected name iTerm2, got %s", config.Name)
	}

	t.Logf("iTerm2 emoji width: %d", config.Overrides.EmojiWidth)
}

func TestPathfinderSchemas(t *testing.T) {
	v1, err := SchemaRegistry.Pathfinder().V1_0_0()
	if err != nil {
		t.Fatalf("Failed to get pathfinder v1.0.0: %v", err)
	}

	tests := []struct {
		name   string
		loader func() ([]byte, error)
	}{
		{"FindQuery", v1.FindQuery},
		{"FinderConfig", v1.FinderConfig},
		{"PathResult", v1.PathResult},
		{"ErrorResponse", v1.ErrorResponse},
		{"Metadata", v1.Metadata},
		{"PathConstraint", v1.PathConstraint},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			schema, err := tt.loader()
			if err != nil {
				t.Fatalf("Failed to load %s schema: %v", tt.name, err)
			}

			if len(schema) == 0 {
				t.Errorf("%s schema should not be empty", tt.name)
			}

			t.Logf("%s schema loaded: %d bytes", tt.name, len(schema))
		})
	}
}

func TestASCIISchemas(t *testing.T) {
	v1, err := SchemaRegistry.ASCII().V1_0_0()
	if err != nil {
		t.Fatalf("Failed to get ascii v1.0.0: %v", err)
	}

	tests := []struct {
		name   string
		loader func() ([]byte, error)
	}{
		{"StringAnalysis", v1.StringAnalysis},
		{"BoxChars", v1.BoxChars},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			schema, err := tt.loader()
			if err != nil {
				t.Fatalf("Failed to load %s schema: %v", tt.name, err)
			}

			if len(schema) == 0 {
				t.Errorf("%s schema should not be empty", tt.name)
			}

			t.Logf("%s schema loaded: %d bytes", tt.name, len(schema))
		})
	}
}

func TestSchemaValidationSchemas(t *testing.T) {
	v1, err := SchemaRegistry.SchemaValidation().V1_0_0()
	if err != nil {
		t.Fatalf("Failed to get schema-validation v1.0.0: %v", err)
	}

	tests := []struct {
		name   string
		loader func() ([]byte, error)
	}{
		{"ValidatorConfig", v1.ValidatorConfig},
		{"SchemaRegistry", v1.SchemaRegistry},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			schema, err := tt.loader()
			if err != nil {
				t.Fatalf("Failed to load %s schema: %v", tt.name, err)
			}

			if len(schema) == 0 {
				t.Errorf("%s schema should not be empty", tt.name)
			}

			t.Logf("%s schema loaded: %d bytes", tt.name, len(schema))
		})
	}
}

func TestCodingStandards(t *testing.T) {
	goStd, err := StandardsRegistry.Coding().Go()
	if err != nil {
		t.Fatalf("Failed to load Go coding standards: %v", err)
	}

	if len(goStd) == 0 {
		t.Error("Go coding standards should not be empty")
	}

	t.Logf("Go coding standards loaded: %d bytes", len(goStd))
}

func TestGetSchema(t *testing.T) {
	schema, err := GetSchema("terminal/v1.0.0/schema.json")
	if err != nil {
		t.Fatalf("Failed to get schema: %v", err)
	}

	if len(schema) == 0 {
		t.Error("Schema should not be empty")
	}
}

func TestGetDoc(t *testing.T) {
	doc, err := GetDoc("standards/coding/go.md")
	if err != nil {
		t.Fatalf("Failed to get doc: %v", err)
	}

	if len(doc) == 0 {
		t.Error("Doc should not be empty")
	}
}

func TestListSchemas(t *testing.T) {
	items, err := ListSchemas("terminal/v1.0.0")
	if err != nil {
		t.Fatalf("Failed to list schemas: %v", err)
	}

	if len(items) == 0 {
		t.Error("Should list at least one item")
	}

	t.Logf("Found %d items in terminal/v1.0.0/", len(items))
	for _, item := range items {
		t.Logf("  - %s", item)
	}
}

func TestObservabilityLoggingSchemas(t *testing.T) {
	logging, err := SchemaRegistry.Observability().Logging().V1_0_0()
	if err != nil {
		t.Fatalf("Failed to get logging v1.0.0: %v", err)
	}

	tests := []struct {
		name   string
		loader func() ([]byte, error)
	}{
		{"Definitions", logging.Definitions},
		{"LogEvent", logging.LogEvent},
		{"LoggerConfig", logging.LoggerConfig},
		{"MiddlewareConfig", logging.MiddlewareConfig},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			schema, err := tt.loader()
			if err != nil {
				t.Fatalf("Failed to load %s schema: %v", tt.name, err)
			}

			if len(schema) == 0 {
				t.Errorf("%s schema should not be empty", tt.name)
			}

			t.Logf("%s schema loaded: %d bytes", tt.name, len(schema))
		})
	}
}
