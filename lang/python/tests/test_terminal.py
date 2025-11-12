import pytest

from crucible.terminal import get_terminal_config, load_terminal_catalog


def test_load_terminal_catalog():
    catalog = load_terminal_catalog()
    assert len(catalog) > 0
    assert "iTerm2" in catalog


def test_get_terminal_config_iterm2():
    config = get_terminal_config("iTerm2")
    assert config["name"] == "iTerm2"
    assert "overrides" in config
    assert isinstance(config["overrides"], dict)


def test_get_terminal_config_nonexistent():
    with pytest.raises(ValueError, match="Terminal config not found"):
        get_terminal_config("NonexistentTerminal")


def test_terminal_configs_have_required_fields():
    catalog = load_terminal_catalog()
    for name, config in catalog.items():
        assert "name" in config, f"Terminal {name} missing name field"
        assert config["name"] == name, f"Terminal {name} name mismatch"
