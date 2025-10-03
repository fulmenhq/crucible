package crucible

import (
	"fmt"

	"gopkg.in/yaml.v3"
)

type TerminalConfig struct {
	Name      string          `yaml:"name"`
	Detection DetectionConfig `yaml:"detection"`
	Overrides OverrideConfig  `yaml:"overrides"`
}

type DetectionConfig struct {
	Env         map[string]string `yaml:"env,omitempty"`
	TermProgram string            `yaml:"term_program,omitempty"`
}

type OverrideConfig struct {
	EmojiWidth    int            `yaml:"emoji_width,omitempty"`
	SpecificChars map[string]int `yaml:"specific_chars,omitempty"`
}

func LoadTerminalCatalog() (map[string]*TerminalConfig, error) {
	catalogs, err := SchemaRegistry.Terminal().Catalog()
	if err != nil {
		return nil, fmt.Errorf("failed to load terminal catalog: %w", err)
	}

	configs := make(map[string]*TerminalConfig)
	for filename, data := range catalogs {
		var config TerminalConfig
		if err := yaml.Unmarshal(data, &config); err != nil {
			return nil, fmt.Errorf("failed to parse terminal config %s: %w", filename, err)
		}
		configs[config.Name] = &config
	}

	return configs, nil
}

func GetTerminalConfig(name string) (*TerminalConfig, error) {
	catalog, err := LoadTerminalCatalog()
	if err != nil {
		return nil, err
	}

	config, ok := catalog[name]
	if !ok {
		return nil, fmt.Errorf("terminal config not found: %s", name)
	}

	return config, nil
}

func GetTerminalSchema() ([]byte, error) {
	return SchemaRegistry.Terminal().V1_0_0()
}
