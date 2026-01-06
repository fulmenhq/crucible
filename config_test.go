package crucible

import (
	"strings"
	"testing"
)

func TestConfigEmbedding(t *testing.T) {
	t.Run("GetConfig with valid path", func(t *testing.T) {
		data, err := GetConfig("library/foundry/patterns.yaml")
		if err != nil {
			t.Fatalf("failed to read config: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty config data")
		}
	})

	t.Run("GetConfig with invalid path", func(t *testing.T) {
		_, err := GetConfig("nonexistent/file.yaml")
		if err == nil {
			t.Error("expected error for nonexistent config")
		}
	})

	t.Run("ListConfigs in foundry directory", func(t *testing.T) {
		files, err := ListConfigs("library/foundry")
		if err != nil {
			t.Fatalf("failed to list configs: %v", err)
		}
		if len(files) == 0 {
			t.Error("expected foundry configs to be present")
		}

		// Verify expected files exist (similarity moved to library/similarity in v0.4.1)
		expectedFiles := []string{
			"patterns.yaml",
			"country-codes.yaml",
			"http-statuses.yaml",
			"mime-types.yaml",
		}
		for _, expected := range expectedFiles {
			found := false
			for _, file := range files {
				if file == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("expected file %s not found in foundry configs", expected)
			}
		}
	})
}

func TestConfigRegistryFoundry(t *testing.T) {
	t.Run("Foundry Patterns", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Foundry().Patterns()
		if err != nil {
			t.Fatalf("failed to read patterns: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty patterns data")
		}
		// Should contain YAML content
		if !strings.Contains(string(data), "patterns:") && !strings.Contains(string(data), "email") {
			t.Error("patterns config should contain pattern definitions")
		}
	})

	t.Run("Foundry CountryCodes", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Foundry().CountryCodes()
		if err != nil {
			t.Fatalf("failed to read country codes: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty country codes data")
		}
	})

	t.Run("Foundry HTTPStatuses", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Foundry().HTTPStatuses()
		if err != nil {
			t.Fatalf("failed to read HTTP statuses: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty HTTP statuses data")
		}
	})

	t.Run("Foundry MIMETypes", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Foundry().MIMETypes()
		if err != nil {
			t.Fatalf("failed to read MIME types: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty MIME types data")
		}
	})

	t.Run("Foundry SimilarityFixtures (deprecated)", func(t *testing.T) {
		// Tests backward compatibility - now points to library/similarity/fixtures.yaml
		data, err := ConfigRegistry.Library().Foundry().SimilarityFixtures()
		if err != nil {
			t.Fatalf("failed to read similarity fixtures: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty similarity fixtures data")
		}
	})

	t.Run("Foundry ExitCodes", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Foundry().ExitCodes()
		if err != nil {
			t.Fatalf("failed to read exit codes: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty exit codes data")
		}
		// Should contain YAML content with exit codes
		if !strings.Contains(string(data), "exit_codes:") && !strings.Contains(string(data), "code:") {
			t.Error("exit codes config should contain exit code definitions")
		}
	})

	t.Run("Foundry Signals", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Foundry().Signals()
		if err != nil {
			t.Fatalf("failed to read signals: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty signals data")
		}
		// Should contain YAML content with signals
		if !strings.Contains(string(data), "signals:") && !strings.Contains(string(data), "SIGTERM") {
			t.Error("signals config should contain signal definitions")
		}
	})
}

func TestConfigRegistryLibrary(t *testing.T) {
	t.Run("Library Manifest", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Manifest()
		if err != nil {
			t.Fatalf("failed to read library manifest: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty manifest data")
		}
	})

	t.Run("FulHash Fixtures", func(t *testing.T) {
		data, err := ConfigRegistry.Library().FulHash().Fixtures()
		if err != nil {
			t.Fatalf("failed to read fulhash fixtures: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty fulhash fixtures data")
		}
	})

	t.Run("Similarity Fixtures", func(t *testing.T) {
		data, err := ConfigRegistry.Library().Similarity().Fixtures()
		if err != nil {
			t.Fatalf("failed to read similarity fixtures: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty similarity fixtures data")
		}
		// Should contain test cases for text similarity
		if !strings.Contains(string(data), "test_cases:") {
			t.Error("similarity fixtures should contain test_cases")
		}
	})
}

func TestConfigRegistryTaxonomy(t *testing.T) {
	t.Run("Metrics Taxonomy", func(t *testing.T) {
		data, err := ConfigRegistry.Taxonomy().Metrics()
		if err != nil {
			t.Fatalf("failed to read metrics taxonomy: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty metrics taxonomy data")
		}
	})

	t.Run("Languages Taxonomy", func(t *testing.T) {
		data, err := ConfigRegistry.Taxonomy().Languages()
		if err != nil {
			t.Fatalf("failed to read languages taxonomy: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty languages taxonomy data")
		}
	})

	t.Run("Repository Categories", func(t *testing.T) {
		data, err := ConfigRegistry.Taxonomy().RepositoryCategories()
		if err != nil {
			t.Fatalf("failed to read repository categories: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty repository categories data")
		}
	})
}

func TestConfigRegistryTerminal(t *testing.T) {
	t.Run("Terminal Overrides Defaults", func(t *testing.T) {
		data, err := ConfigRegistry.Terminal().OverridesDefaults()
		if err != nil {
			t.Fatalf("failed to read terminal overrides: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty terminal overrides data")
		}
	})
}

func TestConfigRegistrySync(t *testing.T) {
	t.Run("Sync Keys", func(t *testing.T) {
		data, err := ConfigRegistry.Sync().SyncKeys()
		if err != nil {
			t.Fatalf("failed to read sync keys: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty sync keys data")
		}
	})
}
