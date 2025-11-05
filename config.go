package crucible

import (
	"embed"
	"fmt"
	"path"
)

//go:embed config
var configFS embed.FS

// Config provides access to embedded configuration files
type Config struct{}

// ConfigRegistry is the global registry for accessing embedded config
var ConfigRegistry = &Config{}

// Library returns accessors for library-specific configurations
func (c *Config) Library() *LibraryConfig {
	return &LibraryConfig{}
}

// Taxonomy returns accessors for taxonomy configurations
func (c *Config) Taxonomy() *TaxonomyConfig {
	return &TaxonomyConfig{}
}

// Terminal returns accessors for terminal configurations
func (c *Config) Terminal() *TerminalConfigRegistry {
	return &TerminalConfigRegistry{}
}

// Sync returns accessors for sync configurations
func (c *Config) Sync() *SyncConfig {
	return &SyncConfig{}
}

// LibraryConfig provides access to library module configurations
type LibraryConfig struct{}

// Foundry returns accessors for Foundry catalog configurations
func (l *LibraryConfig) Foundry() *FoundryConfig {
	return &FoundryConfig{}
}

// FulHash returns accessors for FulHash module configurations
func (l *LibraryConfig) FulHash() *FulHashConfig {
	return &FulHashConfig{}
}

// Manifest returns the library module manifest
func (l *LibraryConfig) Manifest() ([]byte, error) {
	return configFS.ReadFile("config/library/v1.0.0/module-manifest.yaml")
}

// FoundryConfig provides type-safe access to Foundry catalog configurations
type FoundryConfig struct{}

// Patterns returns the Foundry patterns configuration
func (f *FoundryConfig) Patterns() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/patterns.yaml")
}

// CountryCodes returns the country codes catalog
func (f *FoundryConfig) CountryCodes() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/country-codes.yaml")
}

// HTTPStatuses returns the HTTP status codes catalog
func (f *FoundryConfig) HTTPStatuses() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/http-statuses.yaml")
}

// MIMETypes returns the MIME types catalog
func (f *FoundryConfig) MIMETypes() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/mime-types.yaml")
}

// SimilarityFixtures returns the text similarity test fixtures
func (f *FoundryConfig) SimilarityFixtures() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/similarity-fixtures.yaml")
}

// ExitCodes returns the exit codes catalog
func (f *FoundryConfig) ExitCodes() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/exit-codes.yaml")
}

// Signals returns the signals catalog
func (f *FoundryConfig) Signals() ([]byte, error) {
	return configFS.ReadFile("config/library/foundry/signals.yaml")
}

// FulHashConfig provides access to FulHash module configurations
type FulHashConfig struct{}

// Fixtures returns the FulHash test fixtures
func (f *FulHashConfig) Fixtures() ([]byte, error) {
	return configFS.ReadFile("config/library/fulhash/fixtures.yaml")
}

// TaxonomyConfig provides access to taxonomy configurations
type TaxonomyConfig struct{}

// Metrics returns the metrics taxonomy
func (t *TaxonomyConfig) Metrics() ([]byte, error) {
	return configFS.ReadFile("config/taxonomy/metrics.yaml")
}

// Languages returns the programming languages taxonomy
func (t *TaxonomyConfig) Languages() ([]byte, error) {
	return configFS.ReadFile("config/taxonomy/languages.yaml")
}

// RepositoryCategories returns the repository categories taxonomy
func (t *TaxonomyConfig) RepositoryCategories() ([]byte, error) {
	return configFS.ReadFile("config/taxonomy/repository-categories.yaml")
}

// TerminalConfigRegistry provides access to terminal configurations
type TerminalConfigRegistry struct{}

// OverridesDefaults returns the terminal overrides defaults configuration
func (t *TerminalConfigRegistry) OverridesDefaults() ([]byte, error) {
	return configFS.ReadFile("config/terminal/v1.0.0/terminal-overrides-defaults.yaml")
}

// SyncConfig provides access to sync configurations
type SyncConfig struct{}

// SyncKeys returns the sync keys configuration
func (s *SyncConfig) SyncKeys() ([]byte, error) {
	return configFS.ReadFile("config/sync/sync-keys.yaml")
}

// GetConfig reads any configuration file by its path relative to config/
// Example: GetConfig("library/foundry/patterns.yaml")
func GetConfig(configPath string) ([]byte, error) {
	fullPath := path.Join("config", configPath)
	data, err := configFS.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config %s: %w", configPath, err)
	}
	return data, nil
}

// ListConfigs lists configuration files in a directory relative to config/
// Example: ListConfigs("library/foundry")
func ListConfigs(basePath string) ([]string, error) {
	fullPath := path.Join("config", basePath)
	entries, err := configFS.ReadDir(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to list configs at %s: %w", basePath, err)
	}

	var names []string
	for _, entry := range entries {
		names = append(names, entry.Name())
	}

	return names, nil
}
