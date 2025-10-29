package crucible

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"gopkg.in/yaml.v3"
)

type orderedPair struct {
	Key   string
	Value any
}

type orderedMap []orderedPair

func (om orderedMap) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('{')

	for i, pair := range om {
		if i > 0 {
			buf.WriteByte(',')
		}

		keyBytes, err := json.Marshal(pair.Key)
		if err != nil {
			return nil, err
		}
		buf.Write(keyBytes)
		buf.WriteByte(':')

		valueBytes, err := json.Marshal(pair.Value)
		if err != nil {
			return nil, err
		}
		buf.Write(valueBytes)
	}

	buf.WriteByte('}')
	return buf.Bytes(), nil
}

// NormalizeSchema converts JSON or YAML schemas into canonical, pretty-printed JSON.
func NormalizeSchema(input []byte) ([]byte, error) {
	trimmed := bytes.TrimSpace(input)
	if len(trimmed) == 0 {
		return nil, errors.New("schema content is empty")
	}

	var raw any
	if err := yaml.Unmarshal(trimmed, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse schema: %w", err)
	}

	converted := convertYAML(raw)
	canonical := canonicalize(converted)

	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetIndent("", "  ")
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(canonical); err != nil {
		return nil, fmt.Errorf("failed to encode schema: %w", err)
	}

	return bytes.TrimSpace(buf.Bytes()), nil
}

// CompareSchemas normalizes and compares two schema documents.
func CompareSchemas(a, b []byte) (bool, []byte, []byte, error) {
	normA, err := NormalizeSchema(a)
	if err != nil {
		return false, nil, nil, err
	}

	normB, err := NormalizeSchema(b)
	if err != nil {
		return false, nil, nil, err
	}

	return bytes.Equal(normA, normB), normA, normB, nil
}

func convertYAML(value any) any {
	switch v := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(v))
		for key, val := range v {
			result[key] = convertYAML(val)
		}
		return result
	case map[any]any:
		result := make(map[string]any, len(v))
		for key, val := range v {
			result[fmt.Sprint(key)] = convertYAML(val)
		}
		return result
	case []any:
		for i, item := range v {
			v[i] = convertYAML(item)
		}
		return v
	default:
		return v
	}
}

func canonicalize(value any) any {
	switch v := value.(type) {
	case map[string]any:
		keys := make([]string, 0, len(v))
		for key := range v {
			keys = append(keys, key)
		}
		sort.Strings(keys)

		ordered := make(orderedMap, len(keys))
		for i, key := range keys {
			ordered[i] = orderedPair{Key: key, Value: canonicalize(v[key])}
		}
		return ordered
	case []any:
		for i := range v {
			v[i] = canonicalize(v[i])
		}
		return v
	default:
		return v
	}
}
