package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

const dialect2020 = "https://json-schema.org/draft/2020-12/schema"

func write(t *testing.T, root, path, body string) {
	t.Helper()
	p := filepath.Join(root, path)
	if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(body), 0644); err != nil {
		t.Fatal(err)
	}
}

func schemaEntry(path string) Entry {
	return Entry{Path: path, Kind: "schema", Provenance: "canonical", Dialect: dialect2020}
}

func fixture(t *testing.T) (string, Manifest) {
	t.Helper()
	root := t.TempDir()
	write(t, root, "schemas/plain.json", `{"$schema":"`+dialect2020+`","$id":"https://example.test/plain","type":"string"}`)
	write(t, root, "schemas/schema.yaml", "$schema: "+dialect2020+"\ntype: integer\n")
	write(t, root, "schemas/inherited.yml", "type: boolean\n")
	write(t, root, "schemas/boolean.json", "false")
	write(t, root, "schemas/catalog.yaml", "name: catalog\n")
	m := Manifest{Version: 1, Roots: []string{"schemas"}, Entries: []Entry{schemaEntry("schemas/plain.json"), schemaEntry("schemas/schema.yaml"), schemaEntry("schemas/inherited.yml"), schemaEntry("schemas/boolean.json"), {Path: "schemas/catalog.yaml", Kind: "data", Provenance: "canonical", Owner: "maintainers", Reason: "Test catalog"}}}
	return root, m
}

func TestInventoryAndDialects(t *testing.T) {
	r, m := fixture(t)
	compiled, err := validate(r, m)
	if err != nil {
		t.Fatal(err)
	}
	if len(compiled) != 4 {
		t.Fatalf("compiled %d, expected 4", len(compiled))
	}
	if compiled["schemas/boolean.json"].Validate(nil) == nil {
		t.Fatal("false schema accepted an instance")
	}
	if compiled["schemas/inherited.yml"].Validate(true) != nil {
		t.Fatal("inherited dialect not compiled")
	}
}

func TestDefinitionClosureAndNestedIdentity(t *testing.T) {
	for _, tc := range []struct{ name, body, want string }{
		{"unused reference", `{"$defs":{"unused":{"$ref":"https://unreachable.invalid/unused"}}}`, "offline catalog"},
		{"nested duplicate", `{"$defs":{"nested":{"$id":"https://example.test/plain"}}}`, "duplicate resource ID"},
		{"nested dialect", `{"$defs":{"nested":{"$schema":"https://unknown.invalid/dialect"}}}`, "unknown nested dialect"},
		{"required vocabulary", `{"$vocabulary":{"https://unknown.invalid/vocabulary":true}}`, "unsupported required vocabulary"},
		{"reserved ID", `{"$id":"https://json-schema.org/custom","type":42}`, "reserved metaschema ID"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r, m := fixture(t)
			write(t, r, "schemas/schema.yaml", tc.body)
			_, err := validate(r, m)
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("want %s, got %v", tc.want, err)
			}
		})
	}
}

func TestLosslessNumbers(t *testing.T) {
	for _, ext := range []string{"json", "yaml"} {
		v, err := parse("number."+ext, []byte(`{"const":123456789012345678901234567890}`))
		if err != nil {
			t.Fatal(err)
		}
		if v.(map[string]any)["const"] != json.Number("123456789012345678901234567890") {
			t.Fatalf("number lost precision: %v", v)
		}
	}
	for value, want := range map[string]string{
		"123456789012345678901234567890_123": "123456789012345678901234567890123",
		"0x20000000000001":                   "9007199254740993",
		"+9007199254740993":                  "9007199254740993",
		"1_234.567_890":                      "1234.567890",
		"0xEF":                               "239",
		"0o777":                              "511",
	} {
		v, err := parse("number.yaml", []byte("const: "+value+"\n"))
		if err != nil || v.(map[string]any)["const"] != json.Number(want) {
			t.Fatalf("number %s lost precision: %v (%v)", value, v, err)
		}
	}
	for _, value := range []string{".inf", ".nan", "!!int true", "!!float null", "!!int 1.5", "!!float false", "!!float '[1]'"} {
		_, err := parse("number.yaml", []byte("const: "+value+"\n"))
		if err == nil || !strings.Contains(err.Error(), "unsupported lossless spelling") {
			t.Fatalf("non-JSON numeric spelling %s was not explicitly rejected: %v", value, err)
		}
	}
}

func TestIsolatedMetaschemaStillValidated(t *testing.T) {
	r, m := fixture(t)
	write(t, r, "schemas/meta.json", `{"$schema":"`+dialect2020+`","$id":"`+dialect2020+`","deprecated":"prose"}`)
	e := schemaEntry("schemas/meta.json")
	e.Kind = "metaschema"
	e.Owner = "maintainers"
	e.Reason = "Distribution copy"
	m.Entries = append(m.Entries, e)
	_, err := validate(r, m)
	if err == nil || !strings.Contains(err.Error(), "deprecated") {
		t.Fatalf("local metaschema bypassed validation: %v", err)
	}
}

func TestExplicitAliasesAndNestedResources(t *testing.T) {
	r, m := fixture(t)
	write(t, r, "schemas/schema.yaml", `{"$id":"https://example.test/outer","$defs":{"inner":{"$id":"nested","type":"integer"}},"$ref":"https://example.test/published"}`)
	m.Aliases = map[string]string{"https://example.test/published": "schemas/plain.json"}
	compiled, err := validate(r, m)
	if err != nil {
		t.Fatal(err)
	}
	if compiled["schemas/schema.yaml"].Validate("hello") != nil || compiled["schemas/schema.yaml"].Validate(false) == nil {
		t.Fatal("alias did not enforce referenced schema")
	}
	write(t, r, "schemas/inherited.yml", `{"$ref":"https://example.test/nested"}`)
	compiled, err = validate(r, m)
	if err != nil {
		t.Fatal(err)
	}
	if compiled["schemas/inherited.yml"].Validate(1) != nil || compiled["schemas/inherited.yml"].Validate("hello") == nil {
		t.Fatal("nested resource did not enforce schema")
	}
}

func TestSupportedWrapperADRUse(t *testing.T) {
	for _, lang := range []string{"typescript", "python", "rust"} {
		t.Run(lang, func(t *testing.T) {
			r, m, _ := adrFixture(t)
			for _, e := range m.Entries {
				canonical, err := os.ReadFile(filepath.Join("../..", e.Path))
				if err != nil {
					t.Fatal(err)
				}
				wrapper, err := os.ReadFile(filepath.Join("../../lang", lang, e.Path))
				if err != nil {
					t.Fatal(err)
				}
				if !bytes.Equal(canonical, wrapper) {
					t.Fatalf("wrapper parity: %s", e.Path)
				}
				write(t, r, e.Path, string(wrapper))
			}
			compiled, err := validate(r, m)
			if err != nil {
				t.Fatal(err)
			}
			for _, status := range []string{"proposal", "experimental", "accepted", "stable", "deprecated", "superseded", "retired"} {
				instance := map[string]any{"id": "ADR-0001", "title": "Test decision", "status": status, "date": "2026-01-01", "deciders": []any{"@maintainer"}, "scope": "Ecosystem", "deprecation_date": "2026-02-01", "superseded_by": "ADR-0002"}
				if err := compiled[adrDir+"adr-frontmatter.schema.json"].Validate(instance); err != nil {
					t.Fatal(err)
				}
				for _, bad := range []any{"unknown", false, 42, nil, []any{}, map[string]any{}} {
					instance["status"] = bad
					if compiled[adrDir+"adr-frontmatter.schema.json"].Validate(instance) == nil {
						t.Fatalf("accepted invalid wrapper status %v", bad)
					}
				}
			}
		})
	}
}

func TestFailClosed(t *testing.T) {
	tests := []struct {
		name, want string
		mutate     func(*testing.T, string, *Manifest)
	}{
		{"bad keyword", "deprecated", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/plain.json", `{"deprecated":"prose"}`) }},
		{"malformed JSON", "parse schemas/plain.json", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/plain.json", `{"type":`) }},
		{"malformed YAML", "parse schemas/schema.yaml", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/schema.yaml", "type: [\n") }},
		{"duplicate key", "duplicate key", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/plain.json", `{"type":"string","type":"number"}`)
		}},
		{"non-string YAML key", "non-string", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/schema.yaml", "1: value\n") }},
		{"multi document", "exactly one", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/schema.yaml", "true\n---\nfalse\n") }},
		{"YAML alias cycle", "aliases", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/schema.yaml", "&a {type: *a}\n") }},
		{"unknown dialect", "dialect", func(t *testing.T, r string, m *Manifest) { m.Entries[0].Dialect = "https://unknown.test/draft" }},
		{"declared dialect drift", "dialect mismatch", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/plain.json", `{"$schema":"https://unknown.test/draft"}`)
		}},
		{"duplicate resource", "duplicate resource ID", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/schema.yaml", "$id: https://example.test/plain\n")
		}},
		{"unresolved remote", "offline catalog", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/plain.json", `{"$ref":"https://unreachable.invalid/schema"}`)
		}},
		{"unresolved local file", "offline catalog", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/plain.json", `{"$ref":"file:///etc/passwd"}`)
		}},
		{"unknown pointer", "not found", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/plain.json", `{"$ref":"#/$defs/missing"}`)
		}},
		{"missing expected", "missing expected path", func(t *testing.T, r string, m *Manifest) {
			if err := os.Remove(filepath.Join(r, "schemas/plain.json")); err != nil {
				t.Fatal(err)
			}
		}},
		{"moved expected", "missing expected path", func(t *testing.T, r string, m *Manifest) {
			if err := os.Rename(filepath.Join(r, "schemas/plain.json"), filepath.Join(r, "schemas/moved.json")); err != nil {
				t.Fatal(err)
			}
		}},
		{"new candidate", "unclassified", func(t *testing.T, r string, m *Manifest) { write(t, r, "schemas/new.yml", "true") }},
		{"zero candidates", "zero inventory", func(t *testing.T, r string, m *Manifest) {
			if err := os.Mkdir(filepath.Join(r, "empty"), 0755); err != nil {
				t.Fatal(err)
			}
			m.Roots = []string{"empty"}
		}},
		{"missing root", "no such file", func(t *testing.T, r string, m *Manifest) { m.Roots = []string{"missing"} }},
		{"unreadable root", "readable", func(t *testing.T, r string, m *Manifest) {
			p := filepath.Join(r, "schemas")
			if err := os.Chmod(p, 0000); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = os.Chmod(p, 0755) })
		}},
		{"unreadable file", "unreadable", func(t *testing.T, r string, m *Manifest) {
			p := filepath.Join(r, "schemas/plain.json")
			if err := os.Chmod(p, 0000); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = os.Chmod(p, 0644) })
		}},
		{"link cycle", "symlink", func(t *testing.T, r string, m *Manifest) {
			if err := os.Symlink(".", filepath.Join(r, "schemas/cycle")); err != nil {
				t.Fatal(err)
			}
		}},
		{"file symlink", "symlink", func(t *testing.T, r string, m *Manifest) {
			if err := os.Symlink("plain.json", filepath.Join(r, "schemas/link.json")); err != nil {
				t.Fatal(err)
			}
		}},
		{"ancestor symlink", "real directory", func(t *testing.T, r string, m *Manifest) {
			if err := os.Symlink("schemas", filepath.Join(r, "linked")); err != nil {
				t.Fatal(err)
			}
			m.Roots = []string{"linked"}
		}},
		{"duplicate manifest path", "duplicate manifest", func(t *testing.T, r string, m *Manifest) { m.Entries = append(m.Entries, m.Entries[0]) }},
		{"overlapping roots", "overlapping", func(t *testing.T, r string, m *Manifest) { m.Roots = append(m.Roots, "schemas") }},
		{"unknown classification", "unknown classification", func(t *testing.T, r string, m *Manifest) { m.Entries[0].Kind = "guess" }},
		{"data is not dialect", "data schema target mismatch", func(t *testing.T, r string, m *Manifest) {
			m.Entries[0].Kind = "data"
			m.Entries[0].Owner = "maintainers"
			m.Entries[0].Reason = "test"
		}},
		{"unknown instance target", "unknown instance schema", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/catalog.yaml", "$schema: https://unknown.test/application\n")
			m.Entries[4].Schema = "https://unknown.test/application"
		}},
		{"changed exclusion", "changed exclusion", func(t *testing.T, r string, m *Manifest) {
			m.Entries[4].Kind = "excluded"
			m.Entries[4].SHA256 = strings.Repeat("0", 64)
		}},
		{"wrapper drift", "wrapper parity", func(t *testing.T, r string, m *Manifest) {
			write(t, r, "schemas/copy.json", `true`)
			m.Entries = append(m.Entries, Entry{Path: "schemas/copy.json", Kind: "wrapper", Provenance: "wrapper", Source: "schemas/plain.json"})
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, m := fixture(t)
			tt.mutate(t, r, &m)
			_, err := validate(r, m)
			if err == nil || !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("want %q, got %v", tt.want, err)
			}
		})
	}
}

const adrDir = "schemas/config/standards/v1.0.0/"

func adrFixture(t *testing.T) (string, Manifest, []byte) {
	t.Helper()
	r := t.TempDir()
	m := Manifest{Version: 1, Roots: []string{"schemas"}}
	var lifecycle []byte
	for _, name := range []string{"adr-lifecycle-status.json", "adr-adoption-status.json", "adr-frontmatter.schema.json"} {
		p := adrDir + name
		b, err := os.ReadFile(filepath.Join("../..", p))
		if err != nil {
			t.Fatal(err)
		}
		write(t, r, p, string(b))
		m.Entries = append(m.Entries, schemaEntry(p))
		if name == "adr-lifecycle-status.json" {
			lifecycle = b
		}
	}
	return r, m, lifecycle
}

func TestADRMetadataAndUse(t *testing.T) {
	r, m, b := adrFixture(t)
	original := bytes.Replace(b, []byte(`"x-adr-metadata"`), []byte(`"definitions"`), 1)
	h := sha256.Sum256(original)
	if hex.EncodeToString(h[:]) != "0e306afd913958a6527b12d020041a8ebc64bc0e63ac4aefb93bbe8eb291f57d" {
		t.Fatal("original schema content changed beyond metadata relocation")
	}
	before, err := parse("original.json", original)
	if err != nil {
		t.Fatal(err)
	}
	after, err := parse("fixed.json", b)
	if err != nil {
		t.Fatal(err)
	}
	a := after.(map[string]any)
	o := before.(map[string]any)
	if !equal(o["definitions"], a["x-adr-metadata"]) {
		t.Fatal("metadata not deeply equal")
	}
	delete(o, "definitions")
	delete(a, "x-adr-metadata")
	if !equal(o, a) {
		t.Fatal("remaining schema changed")
	}
	compiled, err := validate(r, m)
	if err != nil {
		t.Fatal(err)
	}
	lifecycle := compiled[adrDir+"adr-lifecycle-status.json"]
	front := compiled[adrDir+"adr-frontmatter.schema.json"]
	for _, status := range []string{"proposal", "experimental", "accepted", "stable", "deprecated", "superseded", "retired"} {
		if err := lifecycle.Validate(status); err != nil {
			t.Fatal(err)
		}
		instance := map[string]any{"id": "ADR-0001", "title": "Test decision", "status": status, "date": "2026-01-01", "deciders": []any{"@maintainer"}, "scope": "Ecosystem", "adoption": map[string]any{"gofulmen": "verified"}}
		if status == "deprecated" {
			instance["deprecation_date"] = "2026-02-01"
		}
		if status == "superseded" {
			instance["superseded_by"] = "ADR-0002"
		}
		if err := front.Validate(instance); err != nil {
			t.Fatal(err)
		}
		for _, bad := range []any{"unknown", nil, true, 42, []any{}, map[string]any{}} {
			instance["status"] = bad
			if lifecycle.Validate(bad) == nil || front.Validate(instance) == nil {
				t.Fatalf("accepted invalid status %#v", bad)
			}
		}
	}
	write(t, r, adrDir+"adr-lifecycle-status.json", string(original))
	_, err = validate(r, m)
	if err == nil || !strings.Contains(err.Error(), "deprecated") {
		t.Fatalf("original must fail semantically at deprecated, got %v", err)
	}
}

func TestDimensionInstanceClassification(t *testing.T) {
	r := t.TempDir()
	paths := []string{"schemas/upstream/3leaps/crucible/schemas/classifiers/v0/dimension-definition.schema.json", "schemas/upstream/3leaps/crucible/config/classifiers/dimensions/access-tier.dimension.json"}
	m := Manifest{Version: 1, Roots: []string{"schemas"}}
	for _, p := range paths {
		b, err := os.ReadFile(filepath.Join("../..", p))
		if err != nil {
			t.Fatal(err)
		}
		write(t, r, p, string(b))
	}
	e := schemaEntry(paths[0])
	e.Provenance = "vendor"
	m.Entries = []Entry{e, {Path: paths[1], Kind: "data", Provenance: "vendor", Schema: "https://schemas.3leaps.dev/classifiers/v0/dimension-definition.schema.json", Owner: "3leaps/crucible maintainers", Reason: "Dimension instance"}}
	compiled, err := validate(r, m)
	if err != nil || len(compiled) != 1 {
		t.Fatalf("dimension classified as instance: %v", err)
	}
	write(t, r, paths[1], `{"$schema":"https://schemas.3leaps.dev/classifiers/v0/dimension-definition.schema.json"}`)
	_, err = validate(r, m)
	if err == nil || !strings.Contains(err.Error(), "instance ") {
		t.Fatalf("invalid dimension instance accepted: %v", err)
	}
}

// Invoke the production Make target, not a permissive test-only compiler.
func TestMakeTargetControls(t *testing.T) {
	r, m, b := adrFixture(t)
	manifest := filepath.Join(t.TempDir(), "inventory.json")
	mb, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(manifest, mb, 0644); err != nil {
		t.Fatal(err)
	}
	run := func() ([]byte, error) {
		cmd := exec.Command("make", "validate-schema-contracts", "SCHEMA_CONTRACT_ROOT="+r, "SCHEMA_CONTRACT_MANIFEST="+manifest)
		cmd.Dir = "../.."
		return cmd.CombinedOutput()
	}
	good, err := run()
	if err != nil {
		t.Fatalf("corrected target failed: %v\n%s", err, good)
	}
	if !bytes.Contains(good, []byte(engine)) || !bytes.Contains(good, []byte("Validated 3 schemas")) {
		t.Fatalf("validator identity/coverage missing: %s", good)
	}
	write(t, r, adrDir+"adr-lifecycle-status.json", string(bytes.Replace(b, []byte(`"x-adr-metadata"`), []byte(`"definitions"`), 1)))
	bad, err := run()
	if err == nil || !bytes.Contains(bad, []byte("deprecated")) || !bytes.Contains(bad, []byte("compile schemas/")) {
		t.Fatalf("original target must fail semantically, got %v\n%s", err, bad)
	}
	write(t, r, adrDir+"adr-lifecycle-status.json", string(b))
	badDoc := bytes.Replace(b, []byte(`"type": "string"`), []byte(`"type": 42`), 1)
	write(t, r, adrDir+"adr-lifecycle-status.json", string(badDoc))
	bad, err = run()
	if err == nil || !bytes.Contains(bad, []byte("/type")) {
		t.Fatalf("keyword-type control must fail semantically: %v\n%s", err, bad)
	}
}
