package crucible

import (
	"embed"
	"encoding/json"
	"fmt"
	"path"
)

//go:embed schemas
var schemasFS embed.FS

//go:embed docs
var docsFS embed.FS

const Version = "0.2.26"

type Schemas struct{}

var SchemaRegistry = &Schemas{}

func (s *Schemas) Terminal() *TerminalSchemas {
	return &TerminalSchemas{}
}

func (s *Schemas) Pathfinder() *PathfinderSchemas {
	return &PathfinderSchemas{}
}

func (s *Schemas) ASCII() *ASCIISchemas {
	return &ASCIISchemas{}
}

func (s *Schemas) SchemaValidation() *SchemaValidationSchemas {
	return &SchemaValidationSchemas{}
}

func (s *Schemas) Observability() *ObservabilitySchemas {
	return &ObservabilitySchemas{}
}

type TerminalSchemas struct{}

func (t *TerminalSchemas) V1_0_0() ([]byte, error) {
	return schemasFS.ReadFile("schemas/terminal/v1.0.0/schema.json")
}

func (t *TerminalSchemas) Catalog() (map[string][]byte, error) {
	catalogs := make(map[string][]byte)

	entries, err := schemasFS.ReadDir("schemas/terminal/v1.0.0/catalog")
	if err != nil {
		return nil, fmt.Errorf("failed to read catalog directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		data, err := schemasFS.ReadFile(path.Join("schemas/terminal/v1.0.0/catalog", name))
		if err != nil {
			return nil, fmt.Errorf("failed to read catalog file %s: %w", name, err)
		}

		catalogs[name] = data
	}

	return catalogs, nil
}

type PathfinderSchemas struct{}

func (p *PathfinderSchemas) V1_0_0() (*PathfinderSchemasV1, error) {
	return &PathfinderSchemasV1{}, nil
}

type PathfinderSchemasV1 struct{}

func (p *PathfinderSchemasV1) FindQuery() ([]byte, error) {
	return schemasFS.ReadFile("schemas/pathfinder/v1.0.0/find-query.schema.json")
}

func (p *PathfinderSchemasV1) FinderConfig() ([]byte, error) {
	return schemasFS.ReadFile("schemas/pathfinder/v1.0.0/finder-config.schema.json")
}

func (p *PathfinderSchemasV1) PathResult() ([]byte, error) {
	return schemasFS.ReadFile("schemas/pathfinder/v1.0.0/path-result.schema.json")
}

func (p *PathfinderSchemasV1) ErrorResponse() ([]byte, error) {
	return schemasFS.ReadFile("schemas/pathfinder/v1.0.0/error-response.schema.json")
}

func (p *PathfinderSchemasV1) Metadata() ([]byte, error) {
	return schemasFS.ReadFile("schemas/pathfinder/v1.0.0/metadata.schema.json")
}

func (p *PathfinderSchemasV1) PathConstraint() ([]byte, error) {
	return schemasFS.ReadFile("schemas/pathfinder/v1.0.0/path-constraint.schema.json")
}

type ASCIISchemas struct{}

func (a *ASCIISchemas) V1_0_0() (*ASCIISchemasV1, error) {
	return &ASCIISchemasV1{}, nil
}

type ASCIISchemasV1 struct{}

func (a *ASCIISchemasV1) StringAnalysis() ([]byte, error) {
	return schemasFS.ReadFile("schemas/ascii/v1.0.0/string-analysis.schema.json")
}

func (a *ASCIISchemasV1) BoxChars() ([]byte, error) {
	return schemasFS.ReadFile("schemas/ascii/v1.0.0/box-chars.schema.json")
}

type SchemaValidationSchemas struct{}

func (s *SchemaValidationSchemas) V1_0_0() (*SchemaValidationSchemasV1, error) {
	return &SchemaValidationSchemasV1{}, nil
}

type SchemaValidationSchemasV1 struct{}

func (s *SchemaValidationSchemasV1) ValidatorConfig() ([]byte, error) {
	return schemasFS.ReadFile("schemas/schema-validation/v1.0.0/validator-config.schema.json")
}

func (s *SchemaValidationSchemasV1) SchemaRegistry() ([]byte, error) {
	return schemasFS.ReadFile("schemas/schema-validation/v1.0.0/schema-registry.schema.json")
}

type ObservabilitySchemas struct{}

func (o *ObservabilitySchemas) Logging() *LoggingSchemas {
	return &LoggingSchemas{}
}

type LoggingSchemas struct{}

func (l *LoggingSchemas) V1_0_0() (*LoggingSchemasV1, error) {
	return &LoggingSchemasV1{}, nil
}

type LoggingSchemasV1 struct{}

func (l *LoggingSchemasV1) Definitions() ([]byte, error) {
	return schemasFS.ReadFile("schemas/observability/logging/v1.0.0/definitions.schema.json")
}

func (l *LoggingSchemasV1) LogEvent() ([]byte, error) {
	return schemasFS.ReadFile("schemas/observability/logging/v1.0.0/log-event.schema.json")
}

func (l *LoggingSchemasV1) LoggerConfig() ([]byte, error) {
	return schemasFS.ReadFile("schemas/observability/logging/v1.0.0/logger-config.schema.json")
}

func (l *LoggingSchemasV1) MiddlewareConfig() ([]byte, error) {
	return schemasFS.ReadFile("schemas/observability/logging/v1.0.0/middleware-config.schema.json")
}

func (l *LoggingSchemasV1) SeverityFilter() ([]byte, error) {
	return schemasFS.ReadFile("schemas/observability/logging/v1.0.0/severity-filter.schema.json")
}

type Standards struct{}

var StandardsRegistry = &Standards{}

func (s *Standards) Coding() *CodingStandards {
	return &CodingStandards{}
}

type CodingStandards struct{}

func (c *CodingStandards) Go() (string, error) {
	data, err := docsFS.ReadFile("docs/standards/coding/go.md")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (c *CodingStandards) TypeScript() (string, error) {
	data, err := docsFS.ReadFile("docs/standards/coding/typescript.md")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func GetSchema(schemaPath string) ([]byte, error) {
	fullPath := path.Join("schemas", schemaPath)
	return schemasFS.ReadFile(fullPath)
}

func GetDoc(docPath string) (string, error) {
	fullPath := path.Join("docs", docPath)
	data, err := docsFS.ReadFile(fullPath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func ListSchemas(basePath string) ([]string, error) {
	fullPath := path.Join("schemas", basePath)
	entries, err := schemasFS.ReadDir(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to list schemas at %s: %w", basePath, err)
	}

	var names []string
	for _, entry := range entries {
		names = append(names, entry.Name())
	}

	return names, nil
}

func ParseJSONSchema(data []byte) (map[string]any, error) {
	var schema map[string]any
	if err := json.Unmarshal(data, &schema); err != nil {
		return nil, fmt.Errorf("failed to parse JSON schema: %w", err)
	}
	return schema, nil
}
