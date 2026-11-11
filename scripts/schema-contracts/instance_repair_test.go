package main

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// Exercise the production inventory, parser, closed resolver, compilation and
// instance validation against all canonical/vendor sources. Wrapper parity is
// separately required by the full CLI gate after the supported sync operation.
func TestRepairedCanonicalInstanceInventory(t *testing.T) {
	m, err := loadManifest("inventory.json")
	if err != nil {
		t.Fatal(err)
	}
	m.Roots = []string{"schemas", "config"}
	var entries []Entry
	for _, e := range m.Entries {
		if !strings.HasPrefix(e.Path, "lang/") {
			entries = append(entries, e)
		}
	}
	m.Entries = entries
	compiled, err := validate("../..", m)
	if err != nil {
		t.Fatal(err)
	}
	expected := 0
	for _, e := range entries {
		if e.Kind == "schema" || e.Kind == "metaschema" {
			expected++
		}
	}
	if len(compiled) != expected {
		t.Fatalf("compiled %d of %d schemas", len(compiled), expected)
	}
	t.Logf("production validator: %d schemas, %d canonical/vendor inventory paths", len(compiled), len(entries))
}

func instanceMutation(t *testing.T, s *jsonschema.Schema, path, name string, mutate func(map[string]any), valid bool) {
	t.Helper()
	t.Run(name, func(t *testing.T) {
		v := repairDocument(t, path).(map[string]any)
		if err := s.Validate(v); err != nil {
			t.Fatalf("baseline: %v", err)
		}
		mutate(v)
		err := s.Validate(v)
		if (err == nil) != valid {
			t.Fatalf("valid=%v, validation error=%v", valid, err)
		}
	})
}

func TestRepairedEcosystemBrandContract(t *testing.T) {
	const path = "config/branding/ecosystem.yaml"
	s := repairSchema(t, "schemas/branding/v1.0.0/ecosystem.schema.json")
	for _, key := range []string{"version", "motto", "built_by", "url", "metadata"} {
		instanceMutation(t, s, path, "required/"+key, func(v map[string]any) { delete(v, key) }, false)
		instanceMutation(t, s, path, "type/"+key, func(v map[string]any) { v[key] = false }, false)
	}
	for _, key := range []string{"org", "maintainer", "url", "source", "tagline"} {
		instanceMutation(t, s, path, "metadata-required/"+key, func(v map[string]any) {
			delete(v["metadata"].(map[string]any), key)
		}, false)
		instanceMutation(t, s, path, "metadata-type/"+key, func(v map[string]any) {
			v["metadata"].(map[string]any)[key] = []any{"wrong"}
		}, false)
	}
	instanceMutation(t, s, path, "minimal", func(v map[string]any) {
		delete(v, "$schema")
		delete(v, "motto_extended")
	}, true)
	for _, key := range []string{"motto", "motto_extended", "built_by"} {
		instanceMutation(t, s, path, "empty/"+key, func(v map[string]any) { v[key] = "" }, false)
	}
	for _, value := range []any{"", "1.0", "v1.0.0", false} {
		instanceMutation(t, s, path, "invalid-version", func(v map[string]any) { v["version"] = value }, false)
	}
	for _, value := range []any{false, "relative/path", "https://", "https://bad host/path"} {
		instanceMutation(t, s, path, "invalid-url", func(v map[string]any) { v["url"] = value }, false)
	}
	instanceMutation(t, s, path, "unknown-root", func(v map[string]any) { v["extra"] = "no" }, false)
	instanceMutation(t, s, path, "unknown-metadata", func(v map[string]any) {
		v["metadata"].(map[string]any)["extra"] = "no"
	}, false)
	instanceMutation(t, s, path, "wrong-declaration", func(v map[string]any) { v["$schema"] = "https://example.org/other" }, false)
}

func exitEntries(v map[string]any) []map[string]any {
	var codes []map[string]any
	for _, category := range v["categories"].([]any) {
		for _, code := range category.(map[string]any)["codes"].([]any) {
			codes = append(codes, code.(map[string]any))
		}
	}
	return codes
}

func TestRepairedExitAnnotations(t *testing.T) {
	const path = "config/library/foundry/exit-codes.yaml"
	s := repairSchema(t, "schemas/library/foundry/v1.0.0/exit-codes.schema.json")
	keys := []string{"signal_catalog", "linux_calculation", "macos_calculation"}
	instanceMutation(t, s, path, "legacy-unannotated", func(v map[string]any) {
		for _, code := range exitEntries(v) {
			for _, key := range keys {
				delete(code, key)
			}
		}
	}, true)
	for _, key := range keys {
		for _, value := range []any{false, 138, []any{"128 + 10"}, ""} {
			instanceMutation(t, s, path, "invalid/"+key, func(v map[string]any) { exitEntries(v)[0][key] = value }, false)
		}
	}
	for _, value := range []string{"signals.yaml#usr1", "config/library/foundry/signals.yaml", "config/library/foundry/signals.yaml#SIGUSR1"} {
		instanceMutation(t, s, path, "invalid-reference", func(v map[string]any) { exitEntries(v)[0]["signal_catalog"] = value }, false)
	}
	instanceMutation(t, s, path, "descriptive-calculation", func(v map[string]any) {
		exitEntries(v)[0]["linux_calculation"] = "128 plus the Linux signal number (documentation only)"
	}, true)
	instanceMutation(t, s, path, "unknown-annotation", func(v map[string]any) { exitEntries(v)[0]["windows_calculation"] = "128 + 1" }, false)
	instanceMutation(t, s, path, "out-of-range-code", func(v map[string]any) { exitEntries(v)[0]["code"] = 256 }, false)
	instanceMutation(t, s, path, "missing-code", func(v map[string]any) { delete(exitEntries(v)[0], "code") }, false)
	// The published annotations must continue pointing to actual canonical IDs.
	signals := repairDocument(t, "config/library/foundry/signals.yaml").(map[string]any)
	ids := map[string]bool{}
	for _, value := range signals["signals"].([]any) {
		ids[value.(map[string]any)["id"].(string)] = true
	}
	for _, code := range exitEntries(repairDocument(t, path).(map[string]any)) {
		if ref, ok := code["signal_catalog"].(string); ok && !ids[strings.TrimPrefix(ref, "config/library/foundry/signals.yaml#")] {
			t.Fatalf("unresolved signal annotation: %s", ref)
		}
	}
}

func TestRepairedOptionalMetadataEnvelopes(t *testing.T) {
	for _, tc := range []struct {
		path, schema, required string
		breakRuntime           func(map[string]any)
	}{
		{"config/server/management/server-management.yaml", "schemas/server/management/v1.0.0/server-management.schema.json", "configurations", func(v map[string]any) {
			v["configurations"].(map[string]any)["dev"].(map[string]any)["preferredPort"] = 80
		}},
		{"config/web/branding/site-branding.yaml", "schemas/web/branding/v1.0.0/site-branding.schema.json", "name", func(v map[string]any) {
			v["logo"].(map[string]any)["unknown"] = true
		}},
		{"config/web/styling/site-styling.yaml", "schemas/web/styling/v1.0.0/site-styling.schema.json", "themes", func(v map[string]any) {
			v["themes"].(map[string]any)["light"].(map[string]any)["background"] = "not-a-color"
		}},
	} {
		t.Run(tc.path, func(t *testing.T) {
			s := repairSchema(t, tc.schema)
			instanceMutation(t, s, tc.path, "legacy-no-envelope", func(v map[string]any) {
				for _, key := range []string{"$schema", "version", "description"} {
					delete(v, key)
				}
			}, true)
			instanceMutation(t, s, tc.path, "canonical-id", func(v map[string]any) {
				v["$schema"] = repairDocument(t, tc.schema).(map[string]any)["$id"]
			}, true)
			for _, version := range []string{"1.0.0", "v1.0.0", "V1.0.0"} {
				instanceMutation(t, s, tc.path, version, func(v map[string]any) { v["version"] = version }, true)
			}
			for _, key := range []string{"$schema", "version", "description"} {
				instanceMutation(t, s, tc.path, "optional/"+key, func(v map[string]any) { delete(v, key) }, true)
				for _, value := range []any{false, 1, map[string]any{}, nil} {
					instanceMutation(t, s, tc.path, "invalid-type/"+key, func(v map[string]any) { v[key] = value }, false)
				}
			}
			instanceMutation(t, s, tc.path, "bad-version", func(v map[string]any) { v["version"] = "1.0" }, false)
			instanceMutation(t, s, tc.path, "wrong-declaration", func(v map[string]any) { v["$schema"] = "https://example.org/other" }, false)
			instanceMutation(t, s, tc.path, "unknown-root", func(v map[string]any) { v["unexpected"] = true }, false)
			instanceMutation(t, s, tc.path, "required-runtime", func(v map[string]any) { delete(v, tc.required) }, false)
			instanceMutation(t, s, tc.path, "invalid-runtime", tc.breakRuntime, false)
		})
	}
}

func TestRepairedFixtureTaxonomyVersionBoundary(t *testing.T) {
	const oldPath = "schemas/taxonomy/fixture/v1.0.0/fixture-catalog.schema.json"
	const newPath = "schemas/taxonomy/fixture/v2.0.0/fixture-catalog.schema.json"
	const catalogPath = "config/taxonomy/fixture-catalog.yaml"
	b, err := os.ReadFile(filepath.Join("../..", oldPath))
	if err != nil {
		t.Fatal(err)
	}
	// Freeze the complete published v1 contract, including its ID and constraints.
	h := sha256.Sum256(b)
	if hex.EncodeToString(h[:]) != "a7a82c6c37d2766ff92b1f46627bfc08a34a5704a18f552a35660e793c33778c" {
		t.Fatal("published v1 variant contract changed")
	}
	oldSchema, newSchema := repairSchema(t, oldPath), repairSchema(t, newPath)
	legacy, err := parse("legacy.json", []byte(`{"$schema":"https://schemas.fulmenhq.dev/crucible/taxonomy/fixture/v1.0.0/fixture-catalog.schema.json","version":"1.0.0","fixtures":{"gauntlet":{"category":"proving","mode":"server","default_lang":"en","summary":"Protected backend with mixed auth requirements","summary_i18n":{"de":"Geschütztes Backend mit Authentifizierung"},"variants":{"002":{"name":"oauth-full","description":"OAuth2 with PKCE and refresh tokens","status":"planned"},"001":{"name":"oauth-minimal","description":"OAuth2 with basic scopes","description_i18n":{"de":"OAuth2 mit einfachen Berechtigungen"}}}}}}`))
	if err != nil {
		t.Fatal(err)
	}
	if err := oldSchema.Validate(legacy); err != nil {
		t.Fatal(err)
	}
	legacyFixture := legacy.(map[string]any)["fixtures"].(map[string]any)["gauntlet"].(map[string]any)
	legacyVariants := legacyFixture["variants"].(map[string]any)
	legacyFixture["variants"] = map[string]any{}
	if oldSchema.Validate(legacy) == nil {
		t.Fatal("v1 accepted an empty variant map")
	}
	legacyFixture["variants"] = legacyVariants
	legacyVariants["bad-key"] = legacyVariants["001"]
	if oldSchema.Validate(legacy) == nil {
		t.Fatal("v1 accepted a nonnumeric variant key")
	}
	delete(legacyVariants, "bad-key")
	legacyVariant := legacyVariants["001"].(map[string]any)
	legacyVariant["extra"] = true
	if oldSchema.Validate(legacy) == nil {
		t.Fatal("v1 accepted an unknown variant property")
	}
	delete(legacyVariant, "extra")
	if err := oldSchema.Validate(legacy); err != nil {
		t.Fatal(err)
	}
	// No declaration in these cross-version checks: the data shape itself must fail.
	v := legacy.(map[string]any)
	delete(v, "$schema")
	if newSchema.Validate(v) == nil {
		t.Fatal("scenario schema accepted legacy variants")
	}
	current := repairDocument(t, catalogPath).(map[string]any)
	if err := newSchema.Validate(current); err != nil {
		t.Fatal(err)
	}
	delete(current, "$schema")
	if oldSchema.Validate(current) == nil {
		t.Fatal("v1 accepted scenario catalog")
	}
	// Migration preserves variant content in numeric-key order, removes the map,
	// and selects the independent v2 schema. Content versions are not schema IDs.
	f := v["fixtures"].(map[string]any)["gauntlet"].(map[string]any)
	variants := f["variants"].(map[string]any)
	var codes []string
	for code := range variants {
		codes = append(codes, code)
	}
	sort.Strings(codes)
	var scenarios []any
	for _, code := range codes {
		scenarios = append(scenarios, variants[code])
	}
	delete(f, "variants")
	f["scenarios"] = scenarios
	v["$schema"] = repairDocument(t, newPath).(map[string]any)["$id"]
	v["version"] = "1.1.0"
	if err := newSchema.Validate(v); err != nil {
		t.Fatal(err)
	}
	if scenarios[0].(map[string]any)["name"] != "oauth-minimal" || scenarios[1].(map[string]any)["status"] != "planned" {
		t.Fatal("migration lost ordering or metadata")
	}
	fixture := func(v map[string]any) map[string]any {
		return v["fixtures"].(map[string]any)["gauntlet"].(map[string]any)
	}
	scenario := func(v map[string]any) map[string]any { return fixture(v)["scenarios"].([]any)[0].(map[string]any) }
	for _, tc := range []struct {
		name   string
		mutate func(map[string]any)
	}{
		{"missing-scenarios", func(v map[string]any) { delete(fixture(v), "scenarios") }},
		{"empty-scenarios", func(v map[string]any) { fixture(v)["scenarios"] = []any{} }},
		{"map-scenarios", func(v map[string]any) { fixture(v)["scenarios"] = map[string]any{"001": scenario(v)} }},
		{"duplicate-scenarios", func(v map[string]any) { fixture(v)["scenarios"] = []any{scenario(v), scenario(v)} }},
		{"mixed-variants", func(v map[string]any) { fixture(v)["variants"] = map[string]any{"001": scenario(v)} }},
		{"missing-name", func(v map[string]any) { delete(scenario(v), "name") }},
		{"invalid-name", func(v map[string]any) { scenario(v)["name"] = "Bad Name" }},
		{"missing-description", func(v map[string]any) { delete(scenario(v), "description") }},
		{"short-description", func(v map[string]any) { scenario(v)["description"] = "short" }},
		{"invalid-status", func(v map[string]any) { scenario(v)["status"] = "ready" }},
		{"invalid-translation", func(v map[string]any) {
			scenario(v)["description_i18n"] = map[string]any{"english": "A translated description"}
		}},
		{"invalid-description", func(v map[string]any) { fixture(v)["description"] = false }},
		{"invalid-category", func(v map[string]any) { fixture(v)["category"] = "experimental" }},
		{"invalid-mode", func(v map[string]any) { fixture(v)["mode"] = "worker" }},
		{"invalid-language", func(v map[string]any) { fixture(v)["default_lang"] = "english" }},
		{"unknown-scenario", func(v map[string]any) { scenario(v)["extra"] = true }},
		{"unknown-fixture", func(v map[string]any) { fixture(v)["extra"] = true }},
		{"unknown-root", func(v map[string]any) { v["extra"] = true }},
	} {
		instanceMutation(t, newSchema, catalogPath, tc.name, tc.mutate, false)
	}
}
