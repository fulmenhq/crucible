package crucible

import (
	"slices"
	"testing"
)

func TestListRoleSlugs(t *testing.T) {
	slugs, err := ListRoleSlugs()
	if err != nil {
		t.Fatalf("ListRoleSlugs() failed: %v", err)
	}
	if len(slugs) == 0 {
		t.Fatal("expected at least one role slug")
	}

	// Verify well-known roles are present
	for _, expected := range []string{"devlead", "devrev", "infoarch", "secrev", "cicd"} {
		if !slices.Contains(slugs, expected) {
			t.Errorf("expected slug %q not found in catalog", expected)
		}
	}

	// README.md must be excluded
	if slices.Contains(slugs, "README") {
		t.Error("README.md should not appear as a slug")
	}

	// Deterministic ordering
	if !slices.IsSorted(slugs) {
		t.Error("expected slugs to be sorted")
	}
}

func TestLoadRole(t *testing.T) {
	t.Run("valid slug", func(t *testing.T) {
		role, err := LoadRole("devlead")
		if err != nil {
			t.Fatalf("LoadRole(\"devlead\") failed: %v", err)
		}
		if role.Slug != "devlead" {
			t.Errorf("expected slug %q, got %q", "devlead", role.Slug)
		}
		if role.Name == "" {
			t.Error("expected non-empty Name")
		}
		if role.Description == "" {
			t.Error("expected non-empty Description")
		}
		if role.Status == "" {
			t.Error("expected non-empty Status")
		}
		if len(role.Responsibilities) == 0 {
			t.Error("expected at least one Responsibility")
		}
		if len(role.Scope) == 0 {
			t.Error("expected at least one Scope item")
		}
		if len(role.DoesNot) == 0 {
			t.Error("expected at least one DoesNot item")
		}
	})

	t.Run("role with mindset", func(t *testing.T) {
		role, err := LoadRole("devlead")
		if err != nil {
			t.Fatalf("LoadRole(\"devlead\") failed: %v", err)
		}
		if role.Mindset == nil {
			t.Error("expected Mindset to be populated for devlead")
		}
		if len(role.Mindset.Focus) == 0 {
			t.Error("expected at least one Mindset.Focus item")
		}
		if len(role.Mindset.Principles) == 0 {
			t.Error("expected at least one Mindset.Principles item")
		}
	})

	t.Run("role escalations", func(t *testing.T) {
		role, err := LoadRole("devlead")
		if err != nil {
			t.Fatalf("LoadRole(\"devlead\") failed: %v", err)
		}
		if len(role.EscalatesTo) == 0 {
			t.Error("expected at least one EscalatesTo entry for devlead")
		}
		for i, e := range role.EscalatesTo {
			if e.Target == "" {
				t.Errorf("EscalatesTo[%d].Target is empty", i)
			}
			if e.When == "" {
				t.Errorf("EscalatesTo[%d].When is empty", i)
			}
		}
	})

	t.Run("nonexistent slug", func(t *testing.T) {
		_, err := LoadRole("nonexistentrole")
		if err == nil {
			t.Error("expected error for nonexistent role slug")
		}
	})

	t.Run("releng includes new fields", func(t *testing.T) {
		role, err := LoadRole("releng")
		if err != nil {
			t.Fatalf("LoadRole(\"releng\") failed: %v", err)
		}
		if len(role.PrePushChecklist) == 0 {
			t.Error("expected releng to have non-empty PrePushChecklist")
		}
		if role.RequiredReading == nil {
			t.Fatal("expected releng.RequiredReading to be populated")
		}
		if role.RequiredReading.Description == "" {
			t.Error("expected releng.RequiredReading.Description to be non-empty")
		}
		if len(role.RequiredReading.Files) == 0 {
			t.Error("expected releng.RequiredReading.Files to be non-empty")
		}
		if role.CrossRoleNote == "" {
			t.Error("expected releng.CrossRoleNote to be non-empty")
		}
	})
}

func TestLoadRoleCatalog(t *testing.T) {
	catalog, err := LoadRoleCatalog()
	if err != nil {
		t.Fatalf("LoadRoleCatalog() failed: %v", err)
	}
	if len(catalog) == 0 {
		t.Fatal("expected non-empty role catalog")
	}

	// Verify well-known roles are keyed by slug
	for _, slug := range []string{"devlead", "devrev", "secrev"} {
		role, ok := catalog[slug]
		if !ok {
			t.Errorf("catalog missing expected role %q", slug)
			continue
		}
		if role.Slug != slug {
			t.Errorf("catalog[%q].Slug = %q, want %q", slug, role.Slug, slug)
		}
	}
}

func TestConfigRegistryAgentic(t *testing.T) {
	t.Run("Role returns raw YAML", func(t *testing.T) {
		data, err := ConfigRegistry.Agentic().Role("devlead")
		if err != nil {
			t.Fatalf("ConfigRegistry.Agentic().Role(\"devlead\") failed: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty raw YAML")
		}
	})

	t.Run("Role nonexistent returns error", func(t *testing.T) {
		_, err := ConfigRegistry.Agentic().Role("does-not-exist")
		if err == nil {
			t.Error("expected error for nonexistent role")
		}
	})
}
