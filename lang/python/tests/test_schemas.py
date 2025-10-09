import pytest
from crucible import get_schema, list_schemas


def test_get_terminal_schema():
    schema = get_schema("terminal", "v1.0.0", "schema.json")
    assert schema is not None
    assert "$schema" in schema
    assert "properties" in schema


def test_get_pathfinder_schema():
    schema = get_schema("pathfinder", "v1.0.0", "find-query")
    assert schema is not None
    assert "$id" in schema or "$schema" in schema


def test_list_terminal_schemas():
    schemas = list_schemas("terminal", "v1.0.0")
    assert len(schemas) > 0
    assert any("schema.json" in s for s in schemas)


def test_list_pathfinder_schemas():
    schemas = list_schemas("pathfinder", "v1.0.0")
    assert len(schemas) > 0
    assert any("find-query" in s for s in schemas)


def test_list_nonexistent_category():
    schemas = list_schemas("nonexistent", "v1.0.0")
    assert schemas == []


def test_get_nonexistent_schema():
    with pytest.raises(FileNotFoundError):
        get_schema("nonexistent", "v1.0.0", "fake")
