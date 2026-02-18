package crucible

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

func validateRoleSlug(slug string) error {
	if slug == "" {
		return fmt.Errorf("invalid role slug")
	}
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			continue
		}
		return fmt.Errorf("invalid role slug: %q", slug)
	}
	return nil
}

// RolePrompt represents a parsed role definition from the agentic role catalog.
// Fields match the role-prompt.schema.json specification.
type RolePrompt struct {
	Slug             string              `yaml:"slug"             json:"slug"`
	Name             string              `yaml:"name"             json:"name"`
	Description      string              `yaml:"description"      json:"description"`
	Version          string              `yaml:"version"          json:"version"`
	Author           string              `yaml:"author,omitempty" json:"author,omitempty"`
	Status           string              `yaml:"status"           json:"status"`
	Category         string              `yaml:"category,omitempty" json:"category,omitempty"`
	Extends          string              `yaml:"extends,omitempty" json:"extends,omitempty"`
	Domains          []string            `yaml:"domains,omitempty" json:"domains,omitempty"`
	Tags             []string            `yaml:"tags,omitempty"   json:"tags,omitempty"`
	Context          string              `yaml:"context,omitempty" json:"context,omitempty"`
	Scope            []string            `yaml:"scope"            json:"scope"`
	Mindset          *RoleMindset        `yaml:"mindset,omitempty" json:"mindset,omitempty"`
	Responsibilities []string            `yaml:"responsibilities" json:"responsibilities"`
	EscalatesTo      []RoleEscalation    `yaml:"escalates_to"     json:"escalates_to"`
	DoesNot          []string            `yaml:"does_not"         json:"does_not"`
	Examples         []RoleExample       `yaml:"examples,omitempty" json:"examples,omitempty"`
	Checklists       map[string][]string `yaml:"checklists,omitempty" json:"checklists,omitempty"`
}

// RoleMindset holds the focus and principles sections of a role definition.
type RoleMindset struct {
	Focus      []string `yaml:"focus"      json:"focus"`
	Principles []string `yaml:"principles" json:"principles"`
}

// RoleEscalation describes a condition under which a role should escalate to another target.
type RoleEscalation struct {
	Target string `yaml:"target" json:"target"`
	When   string `yaml:"when"   json:"when"`
}

// RoleExample is an illustrative example attached to a role definition.
type RoleExample struct {
	Type    string `yaml:"type"    json:"type"`
	Title   string `yaml:"title"   json:"title"`
	Content string `yaml:"content" json:"content"`
}

// LoadRole loads and parses a single role by slug.
// Returns an error if the role is not found in the embedded catalog.
func LoadRole(slug string) (*RolePrompt, error) {
	if err := validateRoleSlug(slug); err != nil {
		return nil, err
	}
	data, err := GetConfig(fmt.Sprintf("agentic/roles/%s.yaml", slug))
	if err != nil {
		return nil, fmt.Errorf("role not found: %s: %w", slug, err)
	}
	var role RolePrompt
	if err := yaml.Unmarshal(data, &role); err != nil {
		return nil, fmt.Errorf("failed to parse role %s: %w", slug, err)
	}
	if role.Slug == "" {
		return nil, fmt.Errorf("role %s has empty slug", slug)
	}
	return &role, nil
}

// LoadRoleCatalog loads all roles from the embedded catalog.
// Returns a map keyed by slug.
func LoadRoleCatalog() (map[string]*RolePrompt, error) {
	entries, err := ListConfigs("agentic/roles")
	if err != nil {
		return nil, fmt.Errorf("failed to list role configs: %w", err)
	}

	catalog := make(map[string]*RolePrompt)
	for _, filename := range entries {
		if !strings.HasSuffix(filename, ".yaml") {
			continue
		}
		slug := strings.TrimSuffix(filename, ".yaml")
		role, err := LoadRole(slug)
		if err != nil {
			return nil, fmt.Errorf("failed to load role %s: %w", slug, err)
		}
		catalog[role.Slug] = role
	}
	return catalog, nil
}

// ListRoleSlugs returns the slugs of all available roles in the embedded catalog.
func ListRoleSlugs() ([]string, error) {
	entries, err := ListConfigs("agentic/roles")
	if err != nil {
		return nil, fmt.Errorf("failed to list roles: %w", err)
	}

	var slugs []string
	for _, filename := range entries {
		if !strings.HasSuffix(filename, ".yaml") {
			continue
		}
		slugs = append(slugs, strings.TrimSuffix(filename, ".yaml"))
	}
	return slugs, nil
}
