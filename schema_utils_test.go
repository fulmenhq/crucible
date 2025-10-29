package crucible

import "testing"

const jsonSchema = `{"type":"object","properties":{"name":{"type":"string"}}}`

const yamlSchema = `# sample schema
---
type: object
properties:
  name:
    type: string
`

func TestNormalizeSchema(t *testing.T) {
	normalized, err := NormalizeSchema([]byte(yamlSchema))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := `{
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "type": "object"
}`

	if string(normalized) != expected {
		t.Fatalf("unexpected normalization\nexpected:\n%s\nactual:\n%s", expected, normalized)
	}
}

func TestCompareSchemas(t *testing.T) {
	equal, normA, normB, err := CompareSchemas([]byte(jsonSchema), []byte(yamlSchema))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !equal {
		t.Fatalf("schemas should be equal\nA:%s\nB:%s", normA, normB)
	}
}

func TestNormalizeSchemaEmpty(t *testing.T) {
	if _, err := NormalizeSchema([]byte("")); err == nil {
		t.Fatal("expected error for empty schema content")
	}
}
