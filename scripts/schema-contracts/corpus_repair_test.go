package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

func repairDocument(t *testing.T, path string) any {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("../..", path))
	if err != nil {
		t.Fatal(err)
	}
	v, err := parse(path, b)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func repairSchema(t *testing.T, path string) *jsonschema.Schema {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("../..", path))
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	write(t, root, path, string(b))
	m := Manifest{Version: 1, Roots: []string{"schemas"}, Entries: []Entry{schemaEntry(path)}}
	compiled, err := validate(root, m)
	if err != nil {
		t.Fatal(err)
	}
	return compiled[path]
}

func TestRepairedSimilarityV1HistoricalContract(t *testing.T) {
	const path = "schemas/library/similarity/v1.0.0/similarity.schema.json"
	doc := repairDocument(t, path).(map[string]any)
	group := doc["definitions"].(map[string]any)["TestCaseGroup"]
	// Historical source: b64d22a0f0f94e4f1f128172c04fd166cf255056,
	// schemas/library/foundry/v1.0.0/similarity.schema.json.
	// Hash covers canonical compact JSON of the complete historical TestCaseGroup,
	// so shallow CI checkouts need not retrieve git history to verify the repair.
	b, err := json.Marshal(group)
	if err != nil {
		t.Fatal(err)
	}
	h := sha256.Sum256(b)
	if hex.EncodeToString(h[:]) != "1c8238d5053b7648cb54bc191fbffacf8db28d4adcf95afec3e036782822e77c" {
		t.Fatal("v1 case group differs from the historical contract")
	}
	if doc["$id"] != "https://schemas.fulmenhq.dev/crucible/library/similarity/v1.0.0/similarity.schema.json" || doc["$schema"] != dialect2020 {
		t.Fatal("current identity or dialect changed")
	}
	s := repairSchema(t, path)
	cases := []struct{ category, body string }{
		{"distance", `{"input_a":"kitten","input_b":"sitting","expected_distance":3,"expected_score":0.5714285714}`},
		{"normalization", `{"input":"CAFÉ","expected":"cafe","options":{"strip_accents":true}}`},
		{"suggestions", `{"input":"versin","candidates":["version"],"expected":[{"value":"version","score":0.9}]}`},
	}
	for _, tc := range cases {
		t.Run(tc.category, func(t *testing.T) {
			v, err := parse("instance.json", []byte(`{"version":"2025.10.2","test_cases":[{"category":"`+tc.category+`","cases":[`+tc.body+`]}]}`))
			if err != nil {
				t.Fatal(err)
			}
			if err := s.Validate(v); err != nil {
				t.Fatal(err)
			}
			g := v.(map[string]any)["test_cases"].([]any)[0].(map[string]any)
			for _, bad := range []any{"levenshtein", "damerau", "jaro_winkler", "substring", "unknown", true} {
				g["category"] = bad
				if s.Validate(v) == nil {
					t.Fatalf("v1 accepted unsupported category %v", bad)
				}
			}
			g["category"] = tc.category
			g["cases"] = []any{}
			if s.Validate(v) == nil {
				t.Fatal("accepted empty case group")
			}
		})
	}
	for _, body := range []string{
		`{"input_a":"a","input_b":"b","expected_distance":-1,"expected_score":0.5}`,
		`{"input_a":"a","input_b":"b","expected_distance":1,"expected_score":2}`,
		`{"input_a":"a","input_b":"b","expected_distance":"1","expected_score":0.5}`,
		`{"input_a":"a","input_b":"b","expected_distance":1}`,
	} {
		v, err := parse("bad.json", []byte(`{"version":"2025.10.2","test_cases":[{"category":"distance","cases":[`+body+`]}]}`))
		if err != nil {
			t.Fatal(err)
		}
		if s.Validate(v) == nil {
			t.Fatalf("accepted invalid distance case %s", body)
		}
	}
}

func TestRepairedCompleteSignalFixture(t *testing.T) {
	const fixturePath = "config/library/foundry/fixtures/signals/valid/complete.yaml"
	s := repairSchema(t, "schemas/library/foundry/v1.0.0/signals.schema.json")
	doc := repairDocument(t, fixturePath)
	if err := s.Validate(doc); err != nil {
		t.Fatal(err)
	}
	canonical := repairDocument(t, "config/library/foundry/signals.yaml").(map[string]any)
	byID := map[string]map[string]any{}
	for _, value := range canonical["signals"].([]any) {
		signal := value.(map[string]any)
		byID[signal["id"].(string)] = signal
	}
	checked := 0
	for _, value := range doc.(map[string]any)["signals"].([]any) {
		signal := value.(map[string]any)
		fallback, ok := signal["windows_fallback"].(map[string]any)
		if !ok {
			continue
		}
		checked++
		id := signal["id"].(string)
		want := byID[id]["windows_fallback"].(map[string]any)
		for _, key := range []string{"fallback_behavior", "log_template", "operation_hint", "telemetry_tags"} {
			if !reflect.DeepEqual(fallback[key], want[key]) {
				t.Fatalf("%s/%s differs from canonical contract", id, key)
			}
		}
		for _, key := range []string{"fallback_behavior", "log_template", "operation_hint"} {
			original := fallback[key]
			delete(fallback, key)
			if s.Validate(doc) == nil {
				t.Fatalf("accepted %s without %s", id, key)
			}
			fallback[key] = false
			if s.Validate(doc) == nil {
				t.Fatalf("accepted non-string %s/%s", id, key)
			}
			fallback[key] = original
		}
		original := fallback["fallback_behavior"]
		fallback["fallback_behavior"] = "invented_fallback"
		if s.Validate(doc) == nil {
			t.Fatalf("accepted unknown fallback for %s", id)
		}
		fallback["fallback_behavior"] = original
		fallback["unexpected"] = true
		if s.Validate(doc) == nil {
			t.Fatalf("accepted unknown fallback property for %s", id)
		}
		delete(fallback, "unexpected")
	}
	if checked != 5 {
		t.Fatalf("checked %d fallback fixtures, expected 5", checked)
	}
	if err := s.Validate(doc); err != nil {
		t.Fatal(err)
	}
}

func TestRepairedCorpusWrapperParity(t *testing.T) {
	for _, path := range []string{
		"schemas/library/similarity/v1.0.0/similarity.schema.json",
		"config/library/foundry/fixtures/signals/valid/complete.yaml",
	} {
		canonical, err := os.ReadFile(filepath.Join("../..", path))
		if err != nil {
			t.Fatal(err)
		}
		for _, lang := range []string{"typescript", "python", "rust"} {
			copy, err := os.ReadFile(filepath.Join("../../lang", lang, path))
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Equal(canonical, copy) {
				t.Fatalf("wrapper drift: %s/%s", lang, path)
			}
		}
	}
}
